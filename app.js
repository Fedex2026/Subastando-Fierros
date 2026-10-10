
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  collection, doc, getDoc, onSnapshot, query,
  orderBy, limit, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const $ = id => document.getElementById(id);

const money = value => new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0
}).format(Number(value) || 0);

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value ?? "");
}

function ms(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value) || 0;
  return 0;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function formatDate(value) {
  const date = ms(value);
  return date
    ? new Date(date).toLocaleString("es-MX", {
        timeZone: "America/Mexico_City",
        dateStyle: "medium",
        timeStyle: "short"
      })
    : "Por confirmar";
}

function formatCountdown(seconds) {
  const n = Math.max(0, Math.ceil(seconds));
  const d = Math.floor(n / 86400);
  const h = Math.floor((n % 86400) / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  const clock = [h, m, s].map(x => String(x).padStart(2, "0")).join(":");
  return d ? `${d}d ${clock}` : clock;
}

function displayClock(seconds) {
  const n = Math.max(0, Math.ceil(seconds));
  setText("hours", String(Math.floor(n / 3600)).padStart(2, "0"));
  setText("minutes", String(Math.floor(n % 3600 / 60)).padStart(2, "0"));
  setText("seconds", String(n % 60).padStart(2, "0"));
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80";

const CATEGORY_NAMES = {
  vehiculo: "autos", auto: "autos", autos: "autos",
  camioneta: "autos", moto: "motos", motos: "motos",
  electronica: "electronica", herramientas: "herramientas",
  maquinaria: "herramientas", relojes: "relojes",
  lotes: "lotes", hogar: "hogar"
};

function categoryOf(value) {
  const key = String(value || "").trim().toLowerCase();
  return CATEGORY_NAMES[key] || key || "otros";
}

let lots = [];
let selectedCategory = "todos";
let activeAuction = null;
let unsubscribeBids = null;
let latestBids = [];
let currentUser = null;
let currentProfile = null;
let authReady = false;
let activationBusy = new Set();

const PREVIEW_MINUTES = 5;
const DEFAULT_ROUND_SECONDS = 120;

/* =====================================
   AUTENTICACIÓN
===================================== */

onAuthStateChanged(auth, async user => {
  currentUser = user;
  currentProfile = null;
  authReady = false;

  if (user) {
    try {
      const snapshot = await getDoc(doc(db, "usuarios", user.uid));
      if (snapshot.exists()) currentProfile = snapshot.data();
    } catch (error) {
      console.error("Error consultando perfil:", error);
    }
  }

  authReady = true;
  updateHeaderSession();
  updateBidButton();
  activateScheduledAuctions();
});

function isAdmin() {
  return currentUser &&
    currentProfile?.rol === "admin" &&
    currentProfile?.activo === true;
}

function updateHeaderSession() {
  const links = [
    ...document.querySelectorAll('.header-actions a[href="login.html"]'),
    ...document.querySelectorAll('#mobileMenu a[href="login.html"]')
  ];

  const label = !currentUser
    ? "👤 INICIAR SESIÓN"
    : isAdmin()
      ? "🔐 ADMINISTRADOR"
      : "👤 MI CUENTA";

  const destination = !currentUser
    ? "login.html"
    : isAdmin()
      ? "admin.html"
      : "index.html";

  links.forEach(link => {
    link.href = destination;
    link.textContent = label;
  });
}

/* =====================================
   HORARIOS
===================================== */

function startTime(a) {
  return ms(a?.fechaInicio);
}

function roundSeconds(a) {
  return Math.max(10, Number(a?.duracionRonda) || DEFAULT_ROUND_SECONDS);
}

function endTime(a) {
  const start = startTime(a);
  if (!start) return 0;
  return Math.max(start, ms(a?.ultimaPujaFecha)) +
    roundSeconds(a) * 1000;
}

function isScheduled(a) {
  return a?.estado === "programada";
}

function isLive(a) {
  return a?.estado === "en_vivo";
}

function isClosed(a) {
  return a?.estado === "finalizada" || a?.estado === "cancelada";
}

function isUpcoming(a) {
  return isScheduled(a) && startTime(a) > Date.now();
}

function isInRound(a) {
  return Boolean(
    a && !isClosed(a) &&
    startTime(a) > 0 &&
    Date.now() >= startTime(a) &&
    Date.now() < endTime(a)
  );
}

function secondsUntilStart(a) {
  return (startTime(a) - Date.now()) / 1000;
}

function secondsUntilEnd(a) {
  return (endTime(a) - Date.now()) / 1000;
}

/* =====================================
   ACTIVACIÓN AUTOMÁTICA POR ADMIN

   Requiere sesión de administrador
   abierta en esta página.
===================================== */

async function activateScheduledAuctions() {
  if (!authReady || !isAdmin()) return;

  const candidates = lots.filter(a =>
    isScheduled(a) &&
    startTime(a) > 0 &&
    Date.now() >= startTime(a) &&
    Date.now() < endTime(a)
  );

  for (const auction of candidates) {
    if (activationBusy.has(auction.id)) continue;

    activationBusy.add(auction.id);

    try {
      const ref = doc(db, "subastas", auction.id);

      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) return;

        const current = snapshot.data();

        if (
          current.estado !== "programada" ||
          !startTime(current) ||
          Date.now() < startTime(current) ||
          Date.now() >= endTime(current)
        ) return;

        transaction.update(ref, {
          estado: "en_vivo"
        });
      });

      console.log("Activación revisada:", auction.id);
    } catch (error) {
      console.error("No se pudo activar:", auction.id, error);
    } finally {
      activationBusy.delete(auction.id);
    }
  }
}

/* =====================================
   SELECCIÓN DE SUBASTA PRINCIPAL
===================================== */

function chooseMainAuction() {
  const live = lots
    .filter(a => isLive(a) && isInRound(a))
    .sort((a, b) => startTime(a) - startTime(b));

  if (live.length) return live[0];

  const pending = lots
    .filter(a => isScheduled(a) && isInRound(a))
    .sort((a, b) => startTime(a) - startTime(b));

  if (pending.length) return pending[0];

  const upcoming = lots
    .filter(isUpcoming)
    .sort((a, b) => startTime(a) - startTime(b));

  if (
    upcoming.length &&
    secondsUntilStart(upcoming[0]) <= PREVIEW_MINUTES * 60
  ) return upcoming[0];

  return null;
}

function refreshMainAuction() {
  const chosen = chooseMainAuction();
  const empty = $("liveEmptyState");
  const content = $("liveAuctionContent");

  if (!chosen) {
    if (empty) empty.hidden = false;
    if (content) content.hidden = true;

    if (activeAuction && unsubscribeBids) {
      unsubscribeBids();
      unsubscribeBids = null;
    }

    activeAuction = null;
    latestBids = [];
    updateBidButton();
    return;
  }

  if (empty) empty.hidden = true;
  if (content) content.hidden = false;

  const changed = activeAuction?.id !== chosen.id;
  activeAuction = chosen;

  if (changed) {
    latestBids = [];
    listenToBids(chosen.id);
  }

  renderMainAuction(chosen);
  updateAuctionClock();
  updateBidButton();
}

/* =====================================
   DATOS DEL VEHÍCULO
===================================== */

function appendDetail(container, label, value) {
  if (value === undefined || value === null || value === "") return;

  const wrapper = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");

  dt.textContent = label;
  dd.textContent = String(value);
  wrapper.append(dt, dd);
  container.append(wrapper);
}

function appendListItem(container, value) {
  if (value === undefined || value === null || value === "") return;

  const item = document.createElement("li");
  item.textContent = String(value);
  container.append(item);
}

function renderMainAuction(a) {
  setText("liveVehicleName",
    `${a.marca || ""} ${a.modelo || ""}`.trim().toUpperCase()
  );

  setText("liveVehicleVersion",
    [a.anio, a.version].filter(Boolean).join(" | ")
  );

  setText("liveLotId", `ID: ${a.id}`);
  setText("currentBid", money(a.pujaActual ?? a.precioInicial ?? 0));
  setText("liveMinIncrement", money(a.incrementoMinimo || 500));
  setText("bidCount", a.totalPujas || 0);
  setText("participants", a.participantes ?? "—");

  const input = $("bidInput");
  if (input && document.activeElement !== input) {
    input.value =
      Number(a.pujaActual ?? a.precioInicial ?? 0) +
      Number(a.incrementoMinimo || 500);
  }

  renderAuctionPhotos(a);
  renderAuctionInformation(a);
}

function renderAuctionPhotos(a) {
  const photos = (Array.isArray(a.fotos) ? a.fotos : [])
    .filter(url => typeof url === "string" && url.startsWith("https://"));

  if (
    !photos.length &&
    typeof a.fotoPortada === "string" &&
    a.fotoPortada.startsWith("https://")
  ) photos.push(a.fotoPortada);

  const main = $("mainAuctionImage");
  const strip = document.querySelector(
    "#liveAuctionContent .thumb-strip"
  );

  if (main && main.dataset.lot !== a.id) {
    main.src = photos[0] || FALLBACK_IMAGE;
    main.dataset.lot = a.id;
  }

  if (!strip || strip.dataset.lot === a.id) return;

  strip.replaceChildren();
  strip.dataset.lot = a.id;

  photos.forEach((url, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thumb" + (index === 0 ? " active" : "");

    const image = document.createElement("img");
    image.src = url;
    image.alt = `Foto ${index + 1}`;
    image.loading = "lazy";
    button.append(image);

    button.addEventListener("click", () => {
      if (main) main.src = url;

      strip.querySelectorAll(".thumb").forEach(thumb => {
        thumb.classList.toggle("active", thumb === button);
      });
    });

    strip.append(button);
  });
}

function renderAuctionInformation(a) {
  const info = $("liveVehicleInfo");

  if (info) {
    info.replaceChildren();

    [
      ["Marca", a.marca],
      ["Modelo", a.modelo],
      ["Año", a.anio],
      ["Versión", a.version],
      ["Transmisión", a.transmision],
      ["Kilometraje", a.kilometraje != null
        ? `${a.kilometraje} km` : null],
      ["Ubicación", a.ubicacion],
      ["Combustible", a.combustible],
      ["Color", a.color]
    ].forEach(([label, value]) => appendDetail(info, label, value));
  }

  const details = $("liveVehicleDetails");
  if (details) {
    details.replaceChildren();
    [
      a.condicion, a.descripcion, a.observaciones,
      a.danosEsteticos, a.danosMecanicos
    ].forEach(value => appendListItem(details, value));
  }

  const documents = $("liveVehicleDocuments");
  if (documents) {
    documents.replaceChildren();
    [
      a.tipoFactura, a.documentos, a.tarjetaCirculacion
    ].forEach(value => appendListItem(documents, value));
  }
}

/* =====================================
   HISTORIAL DE PUJAS
===================================== */

function listenToBids(auctionId) {
  if (unsubscribeBids) unsubscribeBids();

  latestBids = [];
  renderBidHistory();

  unsubscribeBids = onSnapshot(
    query(
      collection(db, "subastas", auctionId, "pujas"),
      orderBy("fecha", "desc"),
      limit(10)
    ),
    snapshot => {
      if (activeAuction?.id !== auctionId) return;
      latestBids = snapshot.docs.map(item => item.data());
      renderBidHistory();
    },
    error => {
      console.error("Error leyendo historial:", error);
      const container = $("bidHistory");
      if (container) {
        container.textContent =
          "No se pudo cargar el historial. Revisa las reglas de Firebase.";
      }
    }
  );
}

function renderBidHistory() {
  const container = $("bidHistory");
  if (!container) return;

  container.replaceChildren();

  if (!latestBids.length) {
    const p = document.createElement("p");
    p.textContent = "Todavía no hay pujas registradas.";
    container.append(p);
    return;
  }

  latestBids.forEach((bid, index) => {
    const row = document.createElement("div");
    const position = document.createElement("span");
    const name = document.createElement("span");
    const amount = document.createElement("strong");
    const time = document.createElement("small");

    position.textContent = String(index + 1);
    name.textContent = bid.nombre || "Usuario";
    amount.textContent = money(bid.monto);

    const bidTime = ms(bid.fecha);
    time.textContent = bidTime
      ? new Date(bidTime).toLocaleTimeString("es-MX", {
          timeZone: "America/Mexico_City"
        })
      : "—";

    row.append(position, name, amount, time);
    container.append(row);
  });
}

/* =====================================
   CRONÓMETRO
===================================== */

function updateAuctionClock() {
  if (!activeAuction) return;

  const a = activeAuction;
  const waiting = startTime(a) > Date.now();
  const inRound = isInRound(a);
  const live = isLive(a);
  const finished = isClosed(a) || (!waiting && !inRound);

  let status;
  let label;
  let seconds;

  if (finished) {
    status = a.estado === "cancelada" ? "CANCELADA" : "FINALIZADA";
    label = a.estado === "cancelada"
      ? "SUBASTA CANCELADA"
      : "TIEMPO DE SUBASTA AGOTADO";
    seconds = 0;
  } else if (waiting) {
    status = "PRÓXIMAMENTE";
    seconds = secondsUntilStart(a);
    label = seconds <= 60
      ? "🔴 ¡FALTA MENOS DE 1 MINUTO!"
      : seconds <= 180
        ? "⏰ ¡FALTAN MENOS DE 3 MINUTOS!"
        : "LA SUBASTA COMIENZA EN:";
  } else if (live) {
    status = "EN VIVO";
    label = "🔨 EN VIVO · TIEMPO PARA PUJAR:";
    seconds = secondsUntilEnd(a);
  } else {
    status = "ESPERANDO ACTIVACIÓN";
    label = isAdmin()
      ? "ACTIVANDO SUBASTA EN FIREBASE..."
      : "ESPERANDO CONFIRMACIÓN DE FIREBASE";
    seconds = secondsUntilEnd(a);
  }

  setText("liveStatusBadge", status);
  setText("countdownLabel", label);
  displayClock(seconds);

  const bar = $("auctionTimeBar");
  const fill = $("auctionTimeBarFill");

  if (bar) bar.hidden = waiting || finished || !live;

  if (fill) {
    const percentage = Math.max(0, Math.min(
      100, seconds / roundSeconds(a) * 100
    ));
    fill.style.width = `${percentage}%`;
  }

  updateBidButton();
}

/* =====================================
   PERMISOS
===================================== */

function canBid() {
  return Boolean(
    authReady &&
    currentUser &&
    currentProfile?.activo === true &&
    currentProfile?.membresiaActiva === true &&
    currentProfile?.puedePujar === true &&
    activeAuction &&
    isLive(activeAuction) &&
    isInRound(activeAuction)
  );
}

function updateBidButton() {
  const button = $("bidButton");
  if (!button) return;

  button.disabled = !canBid();

  if (!activeAuction) {
    button.textContent = "SIN SUBASTA";
  } else if (isClosed(activeAuction)) {
    button.textContent = "SUBASTA FINALIZADA";
  } else if (startTime(activeAuction) > Date.now()) {
    button.textContent = "SUBASTA PROGRAMADA";
  } else if (!isInRound(activeAuction)) {
    button.textContent = "TIEMPO AGOTADO";
  } else if (!isLive(activeAuction)) {
    button.textContent = "ESPERANDO ACTIVACIÓN";
  } else if (!authReady) {
    button.textContent = "VERIFICANDO SESIÓN";
  } else if (!currentUser) {
    button.textContent = "INICIA SESIÓN PARA PUJAR";
  } else if (!canBid()) {
    button.textContent = "MEMBRESÍA REQUERIDA";
  } else {
    button.textContent = "🔨 PUJAR AHORA";
  }
}

function showMessage(message) {
  const el = $("bidMessage");
  if (el) {
    el.hidden = false;
    el.textContent = message;
  } else {
    alert(message);
  }
}

/* =====================================
   REGISTRO DE PUJAS
===================================== */

$("bidButton")?.addEventListener("click", async () => {
  if (!authReady) {
    showMessage("Verificando tu sesión...");
    return;
  }

  if (!currentUser) {
    sessionStorage.setItem("subastandoFierrosDestino", location.href);
    location.href = "login.html";
    return;
  }

  if (!canBid()) {
    showMessage(
      "La subasta no está activa o tu membresía no está autorizada."
    );
    return;
  }

  const auctionId = activeAuction.id;
  const amount = Number($("bidInput")?.value);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    showMessage("Ingresa una cantidad válida.");
    return;
  }

  const button = $("bidButton");
  button.disabled = true;
  button.textContent = "REGISTRANDO...";

  try {
    await runTransaction(db, async transaction => {
      const auctionRef = doc(db, "subastas", auctionId);
      const snapshot = await transaction.get(auctionRef);

      if (!snapshot.exists()) {
        throw new Error("La subasta ya no existe.");
      }

      const a = snapshot.data();
      const now = Date.now();

      if (
        a.estado !== "en_vivo" ||
        !startTime(a) ||
        now < startTime(a) ||
        now >= endTime(a)
      ) {
        throw new Error("La subasta ya no está activa.");
      }

      const minimum =
        Number(a.pujaActual ?? a.precioInicial ?? 0) +
        Number(a.incrementoMinimo || 500);

      if (amount < minimum) {
        throw new Error(`La puja mínima es ${money(minimum)}.`);
      }

      const name =
        currentProfile.nombre ||
        currentUser.displayName ||
        "Usuario";

      const bidRef = doc(
        collection(db, "subastas", auctionId, "pujas")
      );

      transaction.update(auctionRef, {
        pujaActual: amount,
        totalPujas: Number(a.totalPujas || 0) + 1,
        ultimaPujaUid: currentUser.uid,
        ultimaPujaNombre: name,
        ultimaPujaFecha: serverTimestamp()
      });

      transaction.set(bidRef, {
        monto: amount,
        uid: currentUser.uid,
        nombre: name,
        fecha: serverTimestamp()
      });
    });

    showMessage("¡Tu puja se registró correctamente!");
  } catch (error) {
    console.error("Error registrando puja:", error);
    showMessage(error.message || "No se pudo registrar la puja.");
  } finally {
    updateBidButton();
  }
});

/* =====================================
   PRÓXIMAS SUBASTAS
===================================== */

function getFilteredUpcoming() {
  return lots
    .filter(a =>
      isUpcoming(a) &&
      (
        selectedCategory === "todos" ||
        categoryOf(a.categoria) === selectedCategory
      )
    )
    .sort((a, b) => startTime(a) - startTime(b));
}

function renderAuctionList() {
  const container = $("auctionList");
  if (!container) return;

  const filtered = getFilteredUpcoming();

  setText(
    "auctionCategoryLabel",
    selectedCategory === "todos"
      ? "Mostrando todas las subastas disponibles."
      : `Mostrando subastas de ${selectedCategory}.`
  );

  container.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "auction-empty-state";
    empty.innerHTML = `
      <span>🔨</span>
      <strong>AÚN NO HAY SUBASTAS EN ESTA CATEGORÍA</strong>
      <p>Muy pronto aparecerán nuevas oportunidades.</p>
    `;
    container.append(empty);
    return;
  }

  filtered.forEach(a => {
    const card = document.createElement("article");
    card.className = "auction-card";
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.dataset.auctionId = a.id;

    const name = `${a.marca || ""} ${a.modelo || ""}`.trim();

    const candidate =
      (Array.isArray(a.fotos) && a.fotos[0]) ||
      a.fotoPortada ||
      FALLBACK_IMAGE;

    const cover =
      typeof candidate === "string" && candidate.startsWith("https://")
        ? candidate
        : FALLBACK_IMAGE;

    card.innerHTML = `
      <div class="auction-card-image">
        <span class="upcoming-badge">PRÓXIMAMENTE</span>
        <img src="${escapeHTML(cover)}"
             alt="${escapeHTML(name)}" loading="lazy">
      </div>
      <div class="auction-card-body">
        <h3>${escapeHTML(name)}</h3>
        <div class="sub">
          ${escapeHTML([a.anio, a.version].filter(Boolean).join(" | "))}
        </div>
        <div class="row">
          <span>Inicia en:</span>
          <span>🕐 <strong class="auction-card-countdown">
            ${formatCountdown(secondsUntilStart(a))}
          </strong></span>
        </div>
        <div class="row">
          <span>Fecha:</span>
          <span>${escapeHTML(formatDate(a.fechaInicio))}</span>
        </div>
        <div class="row">
          <span>Puja inicial:</span>
          <span class="price">${money(a.precioInicial)}</span>
        </div>
      </div>
    `;

    const openAuction = () => {
      location.href =
        `vehiculo.html?id=${encodeURIComponent(a.id)}`;
    };

    card.addEventListener("click", openAuction);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openAuction();
      }
    });

    container.append(card);
  });
}

function updateUpcomingClocks() {
  let needsRender = false;

  document.querySelectorAll("#auctionList .auction-card")
    .forEach(card => {
      const a = lots.find(item =>
        item.id === card.dataset.auctionId
      );

      if (!a || !isUpcoming(a)) {
        needsRender = true;
        return;
      }

      const clock = card.querySelector(".auction-card-countdown");
      if (clock) {
        clock.textContent = formatCountdown(secondsUntilStart(a));
      }
    });

  if (needsRender) renderAuctionList();
}

/* =====================================
   FIREBASE EN TIEMPO REAL
===================================== */

onSnapshot(
  collection(db, "subastas"),
  snapshot => {
    lots = snapshot.docs.map(item => ({
      ...item.data(),
      id: item.id
    }));

    refreshMainAuction();
    renderAuctionList();
    activateScheduledAuctions();
  },
  error => {
    console.error("No se pudieron cargar subastas:", error);
    showMessage(
      "No se pudieron cargar las subastas. Revisa los permisos de Firebase."
    );
  }
);

/* =====================================
   ACTUALIZACIÓN CADA SEGUNDO
===================================== */

setInterval(() => {
  refreshMainAuction();
  updateUpcomingClocks();
  activateScheduledAuctions();
}, 1000);

refreshMainAuction();

/* =====================================
   FILTROS
===================================== */

document.querySelectorAll(".category-card").forEach(button => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category || "todos";

    document.querySelectorAll(".category-card").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderAuctionList();
    $("proximas")?.scrollIntoView({ behavior: "smooth" });
  });
});

$("showAllAuctions")?.addEventListener("click", () => {
  selectedCategory = "todos";

  document.querySelectorAll(".category-card").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.category === "todos"
    );
  });

  renderAuctionList();
  $("proximas")?.scrollIntoView({ behavior: "smooth" });
});

/* =====================================
   MENÚ MÓVIL
===================================== */

const mobileMenu = $("mobileMenu");

$("mobileMenuButton")?.addEventListener("click", () => {
  if (mobileMenu) mobileMenu.hidden = !mobileMenu.hidden;
});

mobileMenu?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mobileMenu.hidden = true;
  });
});

/* =====================================
   BOTONES DE DESPLAZAMIENTO
===================================== */

document.querySelectorAll(".js-scroll-auctions").forEach(button => {
  button.addEventListener("click", () => {
    $("subastas")?.scrollIntoView({ behavior: "smooth" });
  });
});

/* FIN DE APP.JS */
