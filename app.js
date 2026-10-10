

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


/* =========================================
   UTILIDADES
========================================= */

const $ = (id) => document.getElementById(id);

const money = (value) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
};

const setText = (id, value) => {
  const element = $(id);

  if (element) {
    element.textContent = String(value ?? "");
  }
};

const timestampMs = (value) => {
  if (!value) return 0;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const escapeHTML = (value) => {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character])
  );
};

const formatDate = (value) => {
  const time = timestampMs(value);

  if (!time) return "Por confirmar";

  return new Date(time).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const formatCountdown = (seconds) => {
  const total = Math.max(0, Math.ceil(seconds));

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  const clock = [
    hours,
    minutes,
    remainingSeconds
  ].map((value) => String(value).padStart(2, "0")).join(":");

  return days > 0 ? `${days}d ${clock}` : clock;
};

const displayClock = (seconds) => {
  const total = Math.max(0, Math.ceil(seconds));

  setText(
    "hours",
    String(Math.floor(total / 3600)).padStart(2, "0")
  );

  setText(
    "minutes",
    String(Math.floor((total % 3600) / 60)).padStart(2, "0")
  );

  setText(
    "seconds",
    String(total % 60).padStart(2, "0")
  );
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80";

const CATEGORY_NAMES = {
  vehiculo: "autos",
  auto: "autos",
  autos: "autos",
  camioneta: "autos",
  moto: "motos",
  motos: "motos",
  electronica: "electronica",
  herramientas: "herramientas",
  maquinaria: "herramientas",
  relojes: "relojes",
  lotes: "lotes",
  hogar: "hogar"
};

function categoryOf(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase();

  return CATEGORY_NAMES[key] || key || "otros";
}


/* =========================================
   ESTADO DE LA PÁGINA
========================================= */

let lots = [];
let selectedCategory = "todos";

let activeAuction = null;
let unsubscribeBids = null;
let latestBids = [];

let currentUser = null;
let currentProfile = null;
let authReady = false;

let previousAuctionId = null;
let lastNoticeStage = "";

const PREVIEW_MINUTES = 5;
const DEFAULT_ROUND_SECONDS = 120;


/* =========================================
   AUTENTICACIÓN
========================================= */

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  currentProfile = null;
  authReady = false;

  if (user) {
    try {
      const userSnapshot = await getDoc(
        doc(db, "usuarios", user.uid)
      );

      if (userSnapshot.exists()) {
        currentProfile = userSnapshot.data();
      }
    } catch (error) {
      console.error(
        "Error consultando el perfil:",
        error
      );
    }
  }

  authReady = true;

  updateHeaderSession();
  updateBidButton();
});

function updateHeaderSession() {
  const headerLogin = document.querySelector(
    '.header-actions a[href="login.html"]'
  );

  const mobileLogin = document.querySelector(
    '#mobileMenu a[href="login.html"]'
  );

  if (!currentUser) {
    if (headerLogin) {
      headerLogin.href = "login.html";
      headerLogin.textContent = "👤 INICIAR SESIÓN";
    }

    if (mobileLogin) {
      mobileLogin.href = "login.html";
      mobileLogin.textContent = "Iniciar sesión";
    }

    return;
  }

  const isAdmin = currentProfile?.rol === "admin";
  const destination = isAdmin
    ? "admin.html"
    : "index.html";

  const label = isAdmin
    ? "🔐 ADMINISTRADOR"
    : "👤 MI CUENTA";

  if (headerLogin) {
    headerLogin.href = destination;
    headerLogin.textContent = label;
  }

  if (mobileLogin) {
    mobileLogin.href = destination;
    mobileLogin.textContent = label;
  }
}


/* =========================================
   FECHAS Y ESTADOS DE SUBASTAS
========================================= */

function startTime(auction) {
  return timestampMs(auction?.fechaInicio);
}

function roundSeconds(auction) {
  return Math.max(
    10,
    Number(auction?.duracionRonda) ||
      DEFAULT_ROUND_SECONDS
  );
}

function lastBidTime(auction) {
  return timestampMs(auction?.ultimaPujaFecha);
}

function endTime(auction) {
  const start = startTime(auction);

  if (!start) return 0;

  const last = lastBidTime(auction);

  return (
    Math.max(start, last) +
    roundSeconds(auction) * 1000
  );
}

function isCancelled(auction) {
  return auction.estado === "cancelada";
}

function isFinished(auction) {
  return auction.estado === "finalizada";
}

function isScheduled(auction) {
  return auction.estado === "programada";
}

function isLiveConfirmed(auction) {
  return auction.estado === "en_vivo";
}

function isUpcoming(auction) {
  return (
    isScheduled(auction) &&
    startTime(auction) > Date.now()
  );
}

function isInRound(auction) {
  if (
    !auction ||
    isCancelled(auction) ||
    isFinished(auction)
  ) {
    return false;
  }

  const start = startTime(auction);

  if (!start || Date.now() < start) {
    return false;
  }

  return Date.now() < endTime(auction);
}

function secondsUntilStart(auction) {
  return (
    startTime(auction) - Date.now()
  ) / 1000;
}

function secondsUntilEnd(auction) {
  return (
    endTime(auction) - Date.now()
  ) / 1000;
}


/* =========================================
   SELECCIONAR SUBASTA PRINCIPAL
========================================= */

function chooseMainAuction() {
  /*
    Prioridad 1:
    Subastas que Firebase confirma EN VIVO
    y cuyo plazo no ha vencido.
  */

  const confirmedLive = lots
    .filter((auction) => {
      return (
        isLiveConfirmed(auction) &&
        isInRound(auction)
      );
    })
    .sort(
      (a, b) => startTime(a) - startTime(b)
    );

  if (confirmedLive.length) {
    return confirmedLive[0];
  }

  /*
    Prioridad 2:
    Subasta programada cuya hora ya llegó
    y todavía está dentro de su primera ronda.

    Se muestra como ESPERANDO ACTIVACIÓN.
    No se permite pujar hasta que Firebase
    confirme estado = en_vivo.
  */

  const awaitingActivation = lots
    .filter((auction) => {
      return (
        isScheduled(auction) &&
        isInRound(auction)
      );
    })
    .sort(
      (a, b) => startTime(a) - startTime(b)
    );

  if (awaitingActivation.length) {
    return awaitingActivation[0];
  }

  /*
    Prioridad 3:
    Próxima subasta a cinco minutos
    o menos de comenzar.
  */

  const upcoming = lots
    .filter(isUpcoming)
    .sort(
      (a, b) => startTime(a) - startTime(b)
    );

  if (!upcoming.length) {
    return null;
  }

  const next = upcoming[0];

  if (
    secondsUntilStart(next) <=
    PREVIEW_MINUTES * 60
  ) {
    return next;
  }

  return null;
}


/* =========================================
   ACTUALIZAR PANTALLA PRINCIPAL
========================================= */

function refreshMainAuction() {
  const chosen = chooseMainAuction();

  const emptyState = $("liveEmptyState");
  const content = $("liveAuctionContent");

  if (!chosen) {
    if (emptyState) {
      emptyState.hidden = false;
    }

    if (content) {
      content.hidden = true;
    }

    if (activeAuction) {
      activeAuction = null;
      previousAuctionId = null;
      lastNoticeStage = "";

      if (unsubscribeBids) {
        unsubscribeBids();
        unsubscribeBids = null;
      }

      latestBids = [];
    }

    updateBidButton();
    return;
  }

  if (emptyState) {
    emptyState.hidden = true;
  }

  if (content) {
    content.hidden = false;
  }

  const changed =
    !activeAuction ||
    activeAuction.id !== chosen.id;

  activeAuction = chosen;

  if (changed) {
    previousAuctionId = chosen.id;
    lastNoticeStage = "";

    latestBids = [];
    listenToBids(chosen.id);
  }

  renderMainAuction(chosen);
  updateAuctionClock();
  updateBidButton();
}


/* =========================================
   INFORMACIÓN DEL VEHÍCULO
========================================= */

function appendDetail(container, label, value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  const wrapper = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");

  dt.textContent = label;
  dd.textContent = String(value);

  wrapper.append(dt, dd);
  container.append(wrapper);
}

function appendListItem(container, value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  const item = document.createElement("li");
  item.textContent = String(value);
  container.append(item);
}

function renderMainAuction(auction) {
  setText(
    "liveVehicleName",
    `${auction.marca || ""} ${auction.modelo || ""}`
      .trim()
      .toUpperCase()
  );

  setText(
    "liveVehicleVersion",
    [
      auction.anio,
      auction.version
    ].filter(Boolean).join(" | ")
  );

  setText(
    "liveLotId",
    `ID: ${auction.id}`
  );

  setText(
    "currentBid",
    money(
      auction.pujaActual ??
      auction.precioInicial ??
      0
    )
  );

  setText(
    "liveMinIncrement",
    money(auction.incrementoMinimo || 500)
  );

  setText(
    "bidCount",
    auction.totalPujas || 0
  );

  setText(
    "participants",
    auction.participantes ?? "—"
  );

  const bidInput = $("bidInput");

  if (
    bidInput &&
    document.activeElement !== bidInput
  ) {
    bidInput.value =
      Number(
        auction.pujaActual ??
        auction.precioInicial ??
        0
      ) +
      Number(auction.incrementoMinimo || 500);
  }

  renderAuctionPhotos(auction);
  renderAuctionInformation(auction);
}


/* =========================================
   FOTOGRAFÍAS CLOUDINARY
========================================= */

function renderAuctionPhotos(auction) {
  const photos = (
    Array.isArray(auction.fotos)
      ? auction.fotos
      : []
  ).filter((url) => {
    return (
      typeof url === "string" &&
      url.startsWith("https://")
    );
  });

  if (
    !photos.length &&
    typeof auction.fotoPortada === "string" &&
    auction.fotoPortada.startsWith("https://")
  ) {
    photos.push(auction.fotoPortada);
  }

  const mainImage = $("mainAuctionImage");

  const thumbStrip = document.querySelector(
    "#liveAuctionContent .thumb-strip"
  );

  if (mainImage) {
    if (
      mainImage.dataset.lot !== auction.id
    ) {
      mainImage.src =
        photos[0] || FALLBACK_IMAGE;

      mainImage.dataset.lot = auction.id;
    }
  }

  if (!thumbStrip) return;

  if (
    thumbStrip.dataset.lot === auction.id
  ) {
    return;
  }

  thumbStrip.replaceChildren();
  thumbStrip.dataset.lot = auction.id;

  photos.forEach((url, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className =
      "thumb" + (index === 0 ? " active" : "");

    const image = document.createElement("img");

    image.src = url;
    image.alt = `Foto ${index + 1}`;
    image.loading = "lazy";

    button.append(image);

    button.addEventListener("click", () => {
      if (mainImage) {
        mainImage.src = url;
      }

      thumbStrip
        .querySelectorAll(".thumb")
        .forEach((thumb) => {
          thumb.classList.toggle(
            "active",
            thumb === button
          );
        });
    });

    thumbStrip.append(button);
  });
}


/* =========================================
   FICHA TÉCNICA
========================================= */

function renderAuctionInformation(auction) {
  const info = $("liveVehicleInfo");

  if (info) {
    info.replaceChildren();

    const fields = [
      ["Marca", auction.marca],
      ["Modelo", auction.modelo],
      ["Año", auction.anio],
      ["Versión", auction.version],
      ["Transmisión", auction.transmision],
      [
        "Kilometraje",
        auction.kilometraje != null
          ? `${auction.kilometraje} km`
          : null
      ],
      ["Ubicación", auction.ubicacion],
      ["Combustible", auction.combustible],
      ["Color", auction.color]
    ];

    fields.forEach(([label, value]) => {
      appendDetail(info, label, value);
    });
  }

  const details = $("liveVehicleDetails");

  if (details) {
    details.replaceChildren();

    [
      auction.condicion,
      auction.descripcion,
      auction.observaciones,
      auction.danosEsteticos,
      auction.danosMecanicos
    ].forEach((value) => {
      appendListItem(details, value);
    });
  }

  const documents = $("liveVehicleDocuments");

  if (documents) {
    documents.replaceChildren();

    [
      auction.tipoFactura,
      auction.documentos,
      auction.tarjetaCirculacion
    ].forEach((value) => {
      appendListItem(documents, value);
    });
  }
}


/* =========================================
   HISTORIAL DE PUJAS
========================================= */

function listenToBids(auctionId) {
  if (unsubscribeBids) {
    unsubscribeBids();
    unsubscribeBids = null;
  }

  latestBids = [];
  renderBidHistory();

  unsubscribeBids = onSnapshot(
    query(
      collection(
        db,
        "subastas",
        auctionId,
        "pujas"
      ),
      orderBy("fecha", "desc"),
      limit(10)
    ),
    (snapshot) => {
      if (
        !activeAuction ||
        activeAuction.id !== auctionId
      ) {
        return;
      }

      latestBids = snapshot.docs.map(
        (item) => item.data()
      );

      renderBidHistory();
    },
    (error) => {
      console.error(
        "Error leyendo historial:",
        error
      );
    }
  );
}

function renderBidHistory() {
  const container = $("bidHistory");

  if (!container) return;

  container.replaceChildren();

  if (!latestBids.length) {
    const empty = document.createElement("p");

    empty.textContent =
      "Todavía no hay pujas registradas.";

    container.append(empty);
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

    const bidTime = timestampMs(bid.fecha);

    time.textContent = bidTime
      ? new Date(bidTime).toLocaleTimeString(
          "es-MX",
          {
            timeZone: "America/Mexico_City"
          }
        )
      : "—";

    row.append(
      position,
      name,
      amount,
      time
    );

    container.append(row);
  });
}


/* =========================================
   CRONÓMETRO PRINCIPAL
========================================= */

function updateAuctionClock() {
  if (!activeAuction) return;

  const auction = activeAuction;

  const start = startTime(auction);
  const now = Date.now();

  const waiting = start > now;
  const roundActive = isInRound(auction);
  const confirmedLive = isLiveConfirmed(auction);

  const finished =
    isFinished(auction) ||
    isCancelled(auction) ||
    (!waiting && !roundActive);

  let status = "";
  let label = "";
  let seconds = 0;

  if (finished) {
    status = isCancelled(auction)
      ? "CANCELADA"
      : "FINALIZADA";

    label = isCancelled(auction)
      ? "SUBASTA CANCELADA"
      : "TIEMPO DE SUBASTA AGOTADO";

    seconds = 0;

  } else if (waiting) {
    status = "PRÓXIMAMENTE";
    label = "LA SUBASTA COMIENZA EN:";
    seconds = secondsUntilStart(auction);

    /*
      Avisos visuales durante los últimos
      tres minutos y durante el último minuto.
    */

    if (seconds <= 60) {
      label = "🔴 ¡FALTA MENOS DE 1 MINUTO!";
    } else if (seconds <= 180) {
      label = "⏰ ¡FALTAN MENOS DE 3 MINUTOS!";
    }

  } else if (confirmedLive) {
    status = "EN VIVO";
    label = "🔨 EN VIVO · TIEMPO PARA PUJAR:";
    seconds = secondsUntilEnd(auction);

  } else {
    status = "ESPERANDO ACTIVACIÓN";
    label = "ESPERANDO CONFIRMACIÓN DE FIREBASE";
    seconds = secondsUntilEnd(auction);
  }

  setText("liveStatusBadge", status);
  setText("countdownLabel", label);

  displayClock(seconds);

  const bar = $("auctionTimeBar");
  const fill = $("auctionTimeBarFill");

  if (bar) {
    bar.hidden =
      waiting ||
      finished ||
      !confirmedLive;
  }

  if (fill) {
    const percentage = Math.max(
      0,
      Math.min(
        100,
        seconds /
          roundSeconds(auction) *
          100
      )
    );

    fill.style.width = `${percentage}%`;
  }

  updateBidButton();
}


/* =========================================
   PERMISOS Y BOTÓN DE PUJAR
========================================= */

function canBid() {
  if (!authReady) return false;

  if (!currentUser) return false;

  if (!currentProfile) return false;

  if (currentProfile.activo !== true) {
    return false;
  }

  if (currentProfile.membresiaActiva !== true) {
    return false;
  }

  if (currentProfile.puedePujar !== true) {
    return false;
  }

  if (!activeAuction) return false;

  if (!isLiveConfirmed(activeAuction)) {
    return false;
  }

  if (!isInRound(activeAuction)) {
    return false;
  }

  return true;
}

function updateBidButton() {
  const button = $("bidButton");

  if (!button) return;

  button.disabled = !canBid();

  if (!activeAuction) {
    button.textContent = "SIN SUBASTA";
    return;
  }

  if (
    isFinished(activeAuction) ||
    isCancelled(activeAuction)
  ) {
    button.textContent = "SUBASTA FINALIZADA";
    return;
  }

  if (
    startTime(activeAuction) > Date.now()
  ) {
    button.textContent = "SUBASTA PROGRAMADA";
    return;
  }

  if (!isInRound(activeAuction)) {
    button.textContent = "TIEMPO AGOTADO";
    return;
  }

  if (!isLiveConfirmed(activeAuction)) {
    button.textContent = "ESPERANDO ACTIVACIÓN";
    return;
  }

  if (!authReady) {
    button.textContent = "VERIFICANDO SESIÓN";
    return;
  }

  if (!currentUser) {
    button.textContent = "INICIA SESIÓN PARA PUJAR";
    return;
  }

  if (!canBid()) {
    button.textContent = "MEMBRESÍA REQUERIDA";
    return;
  }

  button.textContent = "🔨 PUJAR AHORA";
}


/* =========================================
   MENSAJES
========================================= */

function showMessage(message) {
  const element = $("bidMessage");

  if (element) {
    element.hidden = false;
    element.textContent = message;
  } else {
    alert(message);
  }
}


/* =========================================
   REGISTRAR PUJA EN FIRESTORE
========================================= */

$("bidButton")?.addEventListener(
  "click",
  async () => {
    if (!authReady) {
      showMessage("Verificando tu sesión...");
      return;
    }

    if (!currentUser) {
      sessionStorage.setItem(
        "subastandoFierrosDestino",
        location.href
      );

      location.href = "login.html";
      return;
    }

    if (!canBid()) {
      showMessage(
        "La subasta no está activa o necesitas una membresía autorizada."
      );

      return;
    }

    const auctionId = activeAuction.id;

    const amount = Number(
      $("bidInput")?.value
    );

    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      showMessage(
        "Ingresa una cantidad válida."
      );

      return;
    }

    const button = $("bidButton");

    button.disabled = true;
    button.textContent = "REGISTRANDO...";

    try {
      await runTransaction(
        db,
        async (transaction) => {
          const auctionRef = doc(
            db,
            "subastas",
            auctionId
          );

          const auctionSnapshot =
            await transaction.get(auctionRef);

          if (!auctionSnapshot.exists()) {
            throw new Error(
              "La subasta ya no existe."
            );
          }

          const auction = auctionSnapshot.data();

          const start = startTime(auction);
          const deadline = endTime(auction);
          const now = Date.now();

          if (
            auction.estado !== "en_vivo" ||
            !start ||
            now < start ||
            now >= deadline
          ) {
            throw new Error(
              "La subasta ya no está activa."
            );
          }

          const minimum =
            Number(
              auction.pujaActual ??
              auction.precioInicial ??
              0
            ) +
            Number(
              auction.incrementoMinimo || 500
            );

          if (amount < minimum) {
            throw new Error(
              `La puja mínima es ${money(minimum)}.`
            );
          }

          const bidRef = doc(
            collection(
              db,
              "subastas",
              auctionId,
              "pujas"
            )
          );

          transaction.update(
            auctionRef,
            {
              pujaActual: amount,
              totalPujas:
                Number(auction.totalPujas || 0) + 1,
              ultimaPujaUid: currentUser.uid,
              ultimaPujaNombre:
                currentProfile.nombre ||
                currentUser.displayName ||
                "Usuario",
              ultimaPujaFecha: serverTimestamp()
            }
          );

          transaction.set(
            bidRef,
            {
              monto: amount,
              uid: currentUser.uid,
              nombre:
                currentProfile.nombre ||
                currentUser.displayName ||
                "Usuario",
              fecha: serverTimestamp()
            }
          );
        }
      );

      showMessage(
        "¡Tu puja se registró correctamente!"
      );

    } catch (error) {
      console.error(
        "Error registrando puja:",
        error
      );

      showMessage(
        error.message ||
        "No se pudo registrar la puja."
      );

    } finally {
      updateBidButton();
    }
  }
);


/* =========================================
   PRÓXIMAS SUBASTAS
========================================= */

function getFilteredUpcoming() {
  return lots
    .filter((auction) => {
      if (!isUpcoming(auction)) {
        return false;
      }

      if (selectedCategory === "todos") {
        return true;
      }

      return (
        categoryOf(auction.categoria) ===
        selectedCategory
      );
    })
    .sort(
      (a, b) => startTime(a) - startTime(b)
    );
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
      <strong>
        AÚN NO HAY SUBASTAS EN ESTA CATEGORÍA
      </strong>
      <p>
        Muy pronto aparecerán nuevas oportunidades.
      </p>
    `;

    container.append(empty);
    return;
  }

  filtered.forEach((auction) => {
    const card = document.createElement("article");

    card.className = "auction-card";
    card.tabIndex = 0;
    card.setAttribute("role", "link");

    card.dataset.auctionId = auction.id;

    const vehicleName =
      `${auction.marca || ""} ${auction.modelo || ""}`
        .trim();

    const coverCandidate =
      (
        Array.isArray(auction.fotos) &&
        auction.fotos[0]
      ) ||
      auction.fotoPortada ||
      FALLBACK_IMAGE;

    const cover =
      typeof coverCandidate === "string" &&
      coverCandidate.startsWith("https://")
        ? coverCandidate
        : FALLBACK_IMAGE;

    card.innerHTML = `
      <div class="auction-card-image">
        <span class="upcoming-badge">
          PRÓXIMAMENTE
        </span>

        <img
          src="${escapeHTML(cover)}"
          alt="${escapeHTML(vehicleName)}"
          loading="lazy"
        >
      </div>

      <div class="auction-card-body">
        <h3>${escapeHTML(vehicleName)}</h3>

        <div class="sub">
          ${escapeHTML(
            [
              auction.anio,
              auction.version
            ].filter(Boolean).join(" | ")
          )}
        </div>

        <div class="row">
          <span>Inicia en:</span>
          <span>
            🕐
            <strong class="auction-card-countdown">
              ${formatCountdown(
                secondsUntilStart(auction)
              )}
            </strong>
          </span>
        </div>

        <div class="row">
          <span>Fecha:</span>
          <span>
            ${escapeHTML(
              formatDate(auction.fechaInicio)
            )}
          </span>
        </div>

        <div class="row">
          <span>Puja inicial:</span>
          <span class="price">
            ${money(auction.precioInicial)}
          </span>
        </div>
      </div>
    `;

    const openAuction = () => {
      location.href =
        `vehiculo.html?id=${encodeURIComponent(
          auction.id
        )}`;
    };

    card.addEventListener(
      "click",
      openAuction
    );

    card.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          openAuction();
        }
      }
    );

    container.append(card);
  });
}

function updateUpcomingClocks() {
  const cards = document.querySelectorAll(
    "#auctionList .auction-card"
  );

  let needsRender = false;

  cards.forEach((card) => {
    const auctionId = card.dataset.auctionId;

    const auction = lots.find(
      (item) => item.id === auctionId
    );

    if (!auction || !isUpcoming(auction)) {
      needsRender = true;
      return;
    }

    const countdown = card.querySelector(
      ".auction-card-countdown"
    );

    if (countdown) {
      countdown.textContent = formatCountdown(
        secondsUntilStart(auction)
      );
    }
  });

  if (needsRender) {
    renderAuctionList();
  }
}


/* =========================================
   CARGAR DATOS DE FIREBASE
========================================= */

onSnapshot(
  collection(db, "subastas"),

  (snapshot) => {
    lots = snapshot.docs.map((document) => ({
      ...document.data(),
      id: document.id
    }));

    refreshMainAuction();
    renderAuctionList();
  },

  (error) => {
    console.error(
      "No se pudieron cargar las subastas:",
      error
    );

    showMessage(
      "No se pudieron cargar las subastas. Revisa los permisos de Firebase."
    );
  }
);


/* =========================================
   ACTUALIZACIÓN CADA SEGUNDO
========================================= */

setInterval(() => {
  refreshMainAuction();
  updateUpcomingClocks();
}, 1000);

refreshMainAuction();


/* =========================================
   FILTROS DE CATEGORÍAS
========================================= */

document
  .querySelectorAll(".category-card")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        selectedCategory =
          button.dataset.category || "todos";

        document
          .querySelectorAll(".category-card")
          .forEach((item) => {
            item.classList.toggle(
              "active",
              item === button
            );
          });

        renderAuctionList();

        $("proximas")?.scrollIntoView({
          behavior: "smooth"
        });
      }
    );
  });


/* =========================================
   VER TODAS LAS SUBASTAS
========================================= */

$("showAllAuctions")?.addEventListener(
  "click",
  () => {
    selectedCategory = "todos";

    document
      .querySelectorAll(".category-card")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.category === "todos"
        );
      });

    renderAuctionList();

    $("proximas")?.scrollIntoView({
      behavior: "smooth"
    });
  }
);


/* =========================================
   MENÚ MÓVIL
========================================= */

const mobileMenu = $("mobileMenu");

$("mobileMenuButton")?.addEventListener(
  "click",
  () => {
    if (mobileMenu) {
      mobileMenu.hidden = !mobileMenu.hidden;
    }
  }
);

mobileMenu
  ?.querySelectorAll("a")
  .forEach((link) => {
    link.addEventListener(
      "click",
      () => {
        mobileMenu.hidden = true;
      }
    );
  });


/* =========================================
   BOTONES DE DESPLAZAMIENTO
========================================= */

document
  .querySelectorAll(".js-scroll-auctions")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        $("subastas")?.scrollIntoView({
          behavior: "smooth"
        });
      }
    );
  });


/* =========================================
   FIN DE APP.JS
========================================= */
