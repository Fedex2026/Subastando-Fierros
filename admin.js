
/* ============================================
   SUBASTANDO FIERROS
   ADMIN.JS COMPLETO
   Firebase 12.18.0
============================================ */

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

/* ============================================
   VARIABLES GENERALES
============================================ */

const $ = id => document.getElementById(id);

const CLOUD_NAME = "vobmt656";
const CLOUD_PRESET = "subastando_fierros";

let usuarioAdminActual = null;
let perfilAdminActual = null;
let usuariosCargados = [];
let subastasCargadas = [];

let unsubUsuarios = null;
let unsubSubastas = null;

let fotos = [];
let videos = [];

const cierresEnProceso = new Set();
const activacionesEnProceso = new Set();

const MAX_FOTOS = 20;
const MAX_VIDEOS = 5;

const dinero = valor =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  }).format(Number(valor) || 0);

function fechaMs(valor) {
  if (valor?.toMillis) {
    return valor.toMillis();
  }

  if (typeof valor?.seconds === "number") {
    return valor.seconds * 1000;
  }

  return 0;
}

function fechaTexto(valor) {
  const ms = fechaMs(valor);

  return ms
    ? new Date(ms).toLocaleString("es-MX")
    : "Sin fecha";
}

function elemento(tag, texto, clase) {
  const e = document.createElement(tag);

  if (texto !== undefined) {
    e.textContent = String(texto);
  }

  if (clase) {
    e.className = clase;
  }

  return e;
}

function agregarDato(contenedor, etiqueta, valor) {
  const fila = elemento("div");

  fila.style.cssText = `
    display:flex;
    justify-content:space-between;
    flex-wrap:wrap;
    gap:12px;
    padding:10px 0;
    border-bottom:1px solid #303138;
  `;

  const nombre = elemento("span", etiqueta);
  nombre.style.color = "#aeb0b9";

  const contenido = elemento("strong", valor);

  fila.append(nombre, contenido);
  contenedor.append(fila);
}

function crearBoton(texto, accion) {
  const boton = elemento("button", texto);

  boton.type = "button";

  boton.style.cssText = `
    padding:10px 15px;
    border-radius:8px;
    cursor:pointer;
    background:#e31b23;
    color:white;
    border:0;
    font-weight:bold;
  `;

  boton.addEventListener("click", accion);

  return boton;
}

/* ============================================
   NAVEGACIÓN DEL ADMINISTRADOR
============================================ */

function mostrarSeccion(nombre) {
  document
    .querySelectorAll(".admin-nav-item")
    .forEach(e => {
      e.classList.toggle(
        "active",
        e.dataset.section === nombre
      );
    });

  document
    .querySelectorAll(".admin-section")
    .forEach(e => {
      e.classList.toggle(
        "active",
        e.id === `section-${nombre}`
      );
    });

  const titulos = {
    dashboard: [
      "Dashboard",
      "Resumen general de Subastando Fierros."
    ],
    subastas: [
      "Subastas",
      "Administra tus subastas."
    ],
    miembros: [
      "Miembros",
      "Control de membresías."
    ],
    ventas: [
      "Ganadores / Ventas",
      "Ganadores, pagos y entregas."
    ],
    configuracion: [
      "Configuración",
      "Configuración de la plataforma."
    ]
  };

  if (titulos[nombre]) {
    if ($("adminPageTitle")) {
      $("adminPageTitle").textContent =
        titulos[nombre][0];
    }

    if ($("adminPageSubtitle")) {
      $("adminPageSubtitle").textContent =
        titulos[nombre][1];
    }
  }
}

document
  .querySelectorAll(".admin-nav-item")
  .forEach(e => {
    e.addEventListener("click", () => {
      mostrarSeccion(e.dataset.section);
    });
  });

document
  .querySelectorAll("[data-go-section]")
  .forEach(e => {
    e.addEventListener("click", () => {
      mostrarSeccion(e.dataset.goSection);
    });
  });

/* ============================================
   AUTENTICACIÓN DEL ADMINISTRADOR
============================================ */

function mostrarAcceso(tipo) {
  if ($("adminLoading")) {
    $("adminLoading").hidden = true;
  }

  if ($("adminApp")) {
    $("adminApp").hidden = tipo !== "admin";
  }

  if ($("adminAccessDenied")) {
    $("adminAccessDenied").hidden =
      tipo !== "denegado";
  }
}

onAuthStateChanged(auth, async usuario => {
  if (unsubUsuarios) {
    unsubUsuarios();
    unsubUsuarios = null;
  }

  if (unsubSubastas) {
    unsubSubastas();
    unsubSubastas = null;
  }

  usuarioAdminActual = null;
  perfilAdminActual = null;

  if (!usuario) {
    location.href = "login.html";
    return;
  }

  try {
    const snap = await getDoc(
      doc(db, "usuarios", usuario.uid)
    );

    if (
      !snap.exists() ||
      snap.data().rol !== "admin" ||
      snap.data().activo !== true
    ) {
      mostrarAcceso("denegado");
      return;
    }

    usuarioAdminActual = usuario;
    perfilAdminActual = snap.data();

    if ($("adminUserName")) {
      $("adminUserName").textContent =
        perfilAdminActual.nombre ||
        "Administrador";
    }

    if ($("adminUserEmail")) {
      $("adminUserEmail").textContent =
        usuario.email || "";
    }

    mostrarAcceso("admin");

    escucharUsuarios();
    escucharSubastas();

  } catch (error) {
    console.error(
      "Error verificando administrador:",
      error
    );

    mostrarAcceso("denegado");
  }
});

$("logoutButton")?.addEventListener(
  "click",
  async () => {
    await signOut(auth);
    location.href = "login.html";
  }
);

/* ============================================
   MIEMBROS
============================================ */

function estadoMiembro(u) {
  if (u.activo === false) {
    return "SUSPENDIDO";
  }

  if (
    u.activo === true &&
    u.membresiaActiva === true &&
    u.puedePujar === true
  ) {
    return "ACTIVO";
  }

  return "PENDIENTE";
}

function escucharUsuarios() {
  unsubUsuarios = onSnapshot(
    collection(db, "usuarios"),

    snapshot => {
      usuariosCargados = snapshot.docs
        .map(d => ({
          ...d.data(),
          id: d.id
        }))
        .filter(u => u.rol !== "admin");

      renderMiembros();
      renderPendientes();
      renderVentas();
    },

    error => {
      console.error(
        "Error leyendo miembros:",
        error
      );
    }
  );
}

async function cambiarMiembro(uid, autorizar) {
  const u = usuariosCargados.find(
    x => x.id === uid
  );

  if (!u) return;

  const verbo = autorizar
    ? "autorizar"
    : "suspender";

  if (
    !confirm(
      `¿Deseas ${verbo} a ${u.nombre || u.correo}?`
    )
  ) {
    return;
  }

  try {
    await updateDoc(
      doc(db, "usuarios", uid),
      {
        activo: autorizar,
        membresiaActiva: autorizar,
        puedePujar: autorizar,
        estadoMembresia: autorizar
          ? "activo"
          : "suspendida"
      }
    );

  } catch (error) {
    console.error(
      "Error actualizando miembro:",
      error
    );

    alert(
      "Firebase no permitió actualizar al miembro."
    );
  }
}

function renderMiembros() {
  const contenedor = $("membersAdminList");

  if (!contenedor) return;

  const busqueda = (
    $("memberSearch")?.value || ""
  ).toLowerCase();

  const miembros = usuariosCargados.filter(u =>
    `${
      u.nombre || ""
    } ${
      u.correo || ""
    } ${
      u.telefono || ""
    }`
      .toLowerCase()
      .includes(busqueda)
  );

  contenedor.replaceChildren();

  miembros.forEach(u => {
    const fila = elemento("div");

    fila.style.cssText = `
      padding:16px 0;
      border-bottom:1px solid #303138;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    `;

    const datos = elemento("div");

    datos.append(
      elemento(
        "strong",
        u.nombre || "Sin nombre"
      ),
      elemento(
        "div",
        u.correo || ""
      ),
      elemento(
        "small",
        `${u.telefono || ""} · ${estadoMiembro(u)}`
      )
    );

    const acciones = elemento("div");
    acciones.style.cssText =
      "display:flex;gap:8px";

    if (estadoMiembro(u) !== "ACTIVO") {
      acciones.append(
        crearBoton(
          "AUTORIZAR",
          () => cambiarMiembro(u.id, true)
        )
      );
    }

    if (estadoMiembro(u) !== "SUSPENDIDO") {
      acciones.append(
        crearBoton(
          "SUSPENDER",
          () => cambiarMiembro(u.id, false)
        )
      );
    }

    fila.append(datos, acciones);
    contenedor.append(fila);
  });

  if ($("statActiveMembers")) {
    $("statActiveMembers").textContent =
      usuariosCargados.filter(
        u => estadoMiembro(u) === "ACTIVO"
      ).length;
  }

  if ($("statPendingMembers")) {
    $("statPendingMembers").textContent =
      usuariosCargados.filter(
        u => estadoMiembro(u) === "PENDIENTE"
      ).length;
  }
}

$("memberSearch")?.addEventListener(
  "input",
  renderMiembros
);

function renderPendientes() {
  const contenedor = $("dashboardPendingMembers");

  if (!contenedor) return;

  contenedor.replaceChildren();

  const pendientes = usuariosCargados
    .filter(
      u => estadoMiembro(u) === "PENDIENTE"
    )
    .slice(0, 5);

  if (!pendientes.length) {
    contenedor.append(
      elemento("p", "Sin miembros pendientes.")
    );
    return;
  }

  pendientes.forEach(u => {
    const fila = elemento("div");

    fila.style.cssText = `
      padding:12px 0;
      display:flex;
      justify-content:space-between;
      gap:10px;
    `;

    fila.append(
      elemento(
        "span",
        u.nombre || u.correo
      ),
      crearBoton(
        "AUTORIZAR",
        () => cambiarMiembro(u.id, true)
      )
    );

    contenedor.append(fila);
  });
}

/* ============================================
   SUBASTAS EN TIEMPO REAL
============================================ */

function escucharSubastas() {
  unsubSubastas = onSnapshot(
    collection(db, "subastas"),

    snapshot => {
      subastasCargadas = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id
      }));

      renderSubastas();
      renderDashboardSubastas();
      renderVentas();

      // Nombre correcto de la función.
      revisarEstadosSubastas();
    },

    error => {
      console.error(
        "Error leyendo subastas:",
        error
      );
    }
  );
}

function renderSubastas() {
  const contenedor = $("auctionsAdminList");

  if (!contenedor) return;

  contenedor.replaceChildren();

  const ordenadas = [...subastasCargadas].sort(
    (a, b) =>
      fechaMs(b.fechaInicio) -
      fechaMs(a.fechaInicio)
  );

  if (!ordenadas.length) {
    contenedor.append(
      elemento(
        "p",
        "Todavía no hay subastas."
      )
    );
  }

  ordenadas.forEach(s => {
    const fila = elemento("div");

    fila.style.cssText = `
      display:flex;
      align-items:center;
      justify-content:space-between;
      flex-wrap:wrap;
      gap:14px;
      padding:18px 0;
      border-bottom:1px solid #303138;
    `;

    const datos = elemento("div");

    datos.append(
      elemento(
        "strong",
        `${s.marca || ""} ${s.modelo || ""} ${s.anio || ""}`
      ),
      elemento("div", s.id),
      elemento(
        "small",
        fechaTexto(s.fechaInicio)
      )
    );

    const precio = elemento(
      "strong",
      dinero(
        s.pujaActual ?? s.precioInicial
      )
    );

    const estado = elemento(
      "strong",
      String(s.estado || "").toUpperCase()
    );

    estado.style.color =
      s.estado === "en_vivo"
        ? "#24c875"
        : "#ffb020";

    fila.append(
      datos,
      precio,
      estado
    );

    contenedor.append(fila);
  });

  if ($("statLiveAuctions")) {
    $("statLiveAuctions").textContent =
      subastasCargadas.filter(
        s => s.estado === "en_vivo"
      ).length;
  }

  if ($("statUpcomingAuctions")) {
    $("statUpcomingAuctions").textContent =
      subastasCargadas.filter(
        s =>
          s.estado === "programada" &&
          fechaMs(s.fechaInicio) > Date.now()
      ).length;
  }
}

function renderDashboardSubastas() {
  const contenedor = $("dashboardAuctions");

  if (!contenedor) return;

  contenedor.replaceChildren();

  [...subastasCargadas]
    .slice(-5)
    .reverse()
    .forEach(s => {
      const fila = elemento("div");

      fila.style.cssText = `
        display:flex;
        justify-content:space-between;
        padding:12px 0;
        border-bottom:1px solid #303138;
      `;

      fila.append(
        elemento(
          "strong",
          `${s.marca || ""} ${s.modelo || ""}`
        ),
        elemento(
          "span",
          String(s.estado || "").toUpperCase()
        )
      );

      contenedor.append(fila);
    });
}

/* ============================================
   ACTIVACIÓN Y CIERRE DE SUBASTAS
============================================ */

function fechaLimite(s) {
  const inicio = fechaMs(s.fechaInicio);

  if (!inicio) return 0;

  const ultima = fechaMs(s.ultimaPujaFecha);

  const ronda = Math.max(
    10,
    Number(s.duracionRonda) || 120
  );

  return Math.max(
    inicio,
    ultima
  ) + ronda * 1000;
}

async function activarSubasta(id) {
  if (!usuarioAdminActual) return;

  if (activacionesEnProceso.has(id)) {
    return;
  }

  activacionesEnProceso.add(id);

  try {
    await runTransaction(
      db,
      async tx => {
        const ref = doc(
          db,
          "subastas",
          id
        );

        const snap = await tx.get(ref);

        if (!snap.exists()) return;

        const s = snap.data();

        const inicio = fechaMs(
          s.fechaInicio
        );

        const limite = fechaLimite(s);
        const ahora = Date.now();

        if (s.estado !== "programada") {
          return;
        }

        if (!inicio || ahora < inicio) {
          return;
        }

        if (!limite || ahora >= limite) {
          return;
        }

        tx.update(ref, {
          estado: "en_vivo",
          actualizadoEn: serverTimestamp()
        });
      }
    );

  } catch (error) {
    console.error(
      `Error activando subasta ${id}:`,
      error
    );

  } finally {
    activacionesEnProceso.delete(id);
  }
}

async function cerrarSubasta(id) {
  if (!usuarioAdminActual) return;

  if (cierresEnProceso.has(id)) {
    return;
  }

  cierresEnProceso.add(id);

  try {
    await runTransaction(
      db,
      async tx => {
        const ref = doc(
          db,
          "subastas",
          id
        );

        const snap = await tx.get(ref);

        if (!snap.exists()) return;

        const s = snap.data();

        // Acepta los dos estados.
        if (
          s.estado !== "en_vivo" &&
          s.estado !== "programada"
        ) {
          return;
        }

        const inicio = fechaMs(
          s.fechaInicio
        );

        const limite = fechaLimite(s);
        const ahora = Date.now();

        if (!inicio || ahora < inicio) {
          return;
        }

        if (
          !limite ||
          ahora < limite + 2000
        ) {
          return;
        }

        const tieneGanador =
          Number(s.totalPujas || 0) > 0 &&
          typeof s.ultimaPujaUid === "string" &&
          s.ultimaPujaUid.length > 0 &&
          Number(s.pujaActual) > 0;

        tx.update(ref, {
          estado: "finalizada",

          resultado: tieneGanador
            ? "adjudicada"
            : "sin_ofertas",

          ganadorUid: tieneGanador
            ? s.ultimaPujaUid
            : "",

          ganadorNombre: tieneGanador
            ? String(
                s.ultimaPujaNombre || "Usuario"
              )
            : "",

          precioFinal: tieneGanador
            ? Number(s.pujaActual)
            : 0,

          estadoPago: tieneGanador
            ? "pendiente"
            : "no_aplica",

          estadoEntrega: tieneGanador
            ? "pendiente"
            : "no_aplica",

          finalizadaEn: serverTimestamp(),
          actualizadoEn: serverTimestamp()
        });
      }
    );

  } catch (error) {
    console.error(
      `Error cerrando subasta ${id}:`,
      error
    );

  } finally {
    cierresEnProceso.delete(id);
  }
}

function revisarEstadosSubastas() {
  if (!usuarioAdminActual) return;

  if (
    perfilAdminActual?.rol !== "admin" ||
    perfilAdminActual?.activo !== true
  ) {
    return;
  }

  const ahora = Date.now();

  for (const s of subastasCargadas) {
    if (
      s.estado !== "programada" &&
      s.estado !== "en_vivo"
    ) {
      continue;
    }

    const inicio = fechaMs(
      s.fechaInicio
    );

    const limite = fechaLimite(s);

    if (
      !inicio ||
      !limite ||
      ahora < inicio
    ) {
      continue;
    }

    if (ahora >= limite + 2000) {
      cerrarSubasta(s.id);

    } else if (
      s.estado === "programada" &&
      ahora < limite
    ) {
      activarSubasta(s.id);
    }
  }
}

// Revisión cada 3 segundos mientras
// el administrador tenga abierta la página.
setInterval(
  revisarEstadosSubastas,
  3000
);

/* ============================================
   GANADORES Y VENTAS
============================================ */

function renderVentas() {
  const seccion = $("section-ventas");

  if (!seccion) return;

  let contenedor = $("ventasDinamicasSF");

  if (!contenedor) {
    contenedor = elemento("div");
    contenedor.id = "ventasDinamicasSF";
    seccion.append(contenedor);
  }

  seccion
    .querySelectorAll(".admin-empty-state")
    .forEach(e => {
      if (e !== contenedor) {
        e.hidden = true;
      }
    });

  contenedor.replaceChildren();

  const finalizadas = subastasCargadas
    .filter(
      s => s.estado === "finalizada"
    )
    .sort(
      (a, b) =>
        fechaMs(b.finalizadaEn) -
        fechaMs(a.finalizadaEn)
    );

  if (!finalizadas.length) {
    const p = elemento(
      "p",
      "Todavía no hay subastas finalizadas."
    );

    p.style.cssText = `
      padding:35px;
      text-align:center;
      color:#aeb0b9;
    `;

    contenedor.append(p);
    return;
  }

  finalizadas.forEach(s => {
    const ganador =
      s.resultado === "adjudicada" &&
      Boolean(s.ganadorUid);

    const usuario = usuariosCargados.find(
      u => u.id === s.ganadorUid
    );

    const tarjeta = elemento("article");

    tarjeta.style.cssText = `
      background:#15161b;
      border:1px solid #34363c;
      border-radius:14px;
      padding:22px;
      margin:14px 0;
      color:white;
    `;

    tarjeta.append(
      elemento(
        "h3",
        `${s.marca || ""} ${s.modelo || ""} ${s.anio || ""} · ${s.id}`
      )
    );

    agregarDato(
      tarjeta,
      "Resultado",
      ganador
        ? "🏆 ADJUDICADA"
        : "SIN OFERTAS"
    );

    agregarDato(
      tarjeta,
      "Ganador",
      ganador
        ? usuario?.nombre ||
          s.ganadorNombre ||
          "Usuario"
        : "Ninguno"
    );

    agregarDato(
      tarjeta,
      "Correo",
      ganador
        ? usuario?.correo ||
          "No disponible"
        : "—"
    );

    agregarDato(
      tarjeta,
      "UID ganador",
      ganador
        ? s.ganadorUid
        : "—"
    );

    agregarDato(
      tarjeta,
      "Precio final",
      ganador
        ? dinero(s.precioFinal)
        : "—"
    );

    agregarDato(
      tarjeta,
      "Estado de pago",
      ganador
        ? s.estadoPago || "pendiente"
        : "No aplica"
    );

    agregarDato(
      tarjeta,
      "Estado de entrega",
      ganador
        ? s.estadoEntrega || "pendiente"
        : "No aplica"
    );

    agregarDato(
      tarjeta,
      "Fecha de cierre",
      fechaTexto(s.finalizadaEn)
    );

    contenedor.append(tarjeta);
  });
}

/* ============================================
   NUEVAS SUBASTAS
============================================ */

function siguienteId() {
  const numeros = subastasCargadas.map(
    s => Number(
      String(s.id).match(
        /^SF-(\d+)$/
      )?.[1] || 0
    )
  );

  return `SF-${
    Math.max(10048, ...numeros) + 1
  }`;
}

function abrirModal() {
  mostrarSeccion("subastas");

  const modal = $("auctionModal");

  if (!modal) return;

  if (
    $("auctionId") &&
    !$("auctionId").value
  ) {
    $("auctionId").value = siguienteId();
  }

  if ($("auctionMinIncrement")) {
    $("auctionMinIncrement").value =
      $("defaultIncrement")?.value || 500;
  }

  if ($("auctionRoundDuration")) {
    $("auctionRoundDuration").value =
      $("defaultRoundDuration")?.value || 120;
  }

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function cerrarModal() {
  if ($("auctionModal")) {
    $("auctionModal").hidden = true;
  }

  document.body.style.overflow = "";
}

$("newAuctionButton")?.addEventListener(
  "click",
  abrirModal
);

$("newAuctionTopButton")?.addEventListener(
  "click",
  abrirModal
);

$("closeAuctionModalButton")?.addEventListener(
  "click",
  cerrarModal
);

$("cancelAuctionButton")?.addEventListener(
  "click",
  cerrarModal
);

document
  .querySelectorAll("[data-close-auction-modal]")
  .forEach(e => {
    e.addEventListener(
      "click",
      cerrarModal
    );
  });

document.addEventListener(
  "keydown",
  e => {
    if (e.key === "Escape") {
      cerrarModal();
    }
  }
);

/* ============================================
   FOTOGRAFÍAS Y VIDEOS
============================================ */

function claveArchivo(f) {
  return `${
    f.name
  }-${
    f.size
  }-${
    f.lastModified
  }`;
}

function agregarArchivos(
  actuales,
  nuevos,
  maximo
) {
  const mapa = new Map();

  [...actuales, ...nuevos].forEach(f => {
    mapa.set(
      claveArchivo(f),
      f
    );
  });

  return [...mapa.values()].slice(
    0,
    maximo
  );
}

function vistaFotos() {
  const contenedor = $("auctionPhotoPreview");

  if (!contenedor) return;

  contenedor.replaceChildren();

  fotos.forEach((f, i) => {
    const url = URL.createObjectURL(f);
    const img = elemento("img");

    img.src = url;
    img.alt = f.name;

    img.style.cssText = `
      width:110px;
      height:85px;
      object-fit:cover;
    `;

    img.onload = () => {
      URL.revokeObjectURL(url);
    };

    if (i === 0) {
      img.title = "PORTADA";
    }

    contenedor.append(img);
  });

  if ($("auctionPhotosLabel")) {
    $("auctionPhotosLabel").textContent =
      `${fotos.length} fotografía(s) seleccionada(s)`;
  }
}

function vistaVideos() {
  const contenedor = $("auctionVideoPreview");

  if (!contenedor) return;

  contenedor.replaceChildren();

  videos.forEach(f => {
    const url = URL.createObjectURL(f);
    const video = elemento("video");

    video.src = url;
    video.controls = true;

    video.style.cssText = `
      width:160px;
      max-height:110px;
    `;

    contenedor.append(video);
  });

  if ($("auctionVideosLabel")) {
    $("auctionVideosLabel").textContent =
      `${videos.length} video(s) seleccionado(s)`;
  }
}

$("auctionPhotos")?.addEventListener(
  "change",
  e => {
    fotos = agregarArchivos(
      fotos,
      [...e.target.files],
      MAX_FOTOS
    );

    e.target.value = "";
    vistaFotos();
  }
);

$("auctionVideos")?.addEventListener(
  "change",
  e => {
    videos = agregarArchivos(
      videos,
      [...e.target.files],
      MAX_VIDEOS
    );

    e.target.value = "";
    vistaVideos();
  }
);

async function subirCloudinary(
  archivo,
  tipo
) {
  const datos = new FormData();

  datos.append("file", archivo);
  datos.append(
    "upload_preset",
    CLOUD_PRESET
  );

  const respuesta = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${tipo}/upload`,
    {
      method: "POST",
      body: datos
    }
  );

  const json = await respuesta.json();

  if (
    !respuesta.ok ||
    !json.secure_url
  ) {
    throw new Error(
      json.error?.message ||
      "Error al subir archivo"
    );
  }

  return json.secure_url;
}

/* ============================================
   GUARDAR NUEVA SUBASTA
============================================ */

$("auctionForm")?.addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    if (
      !usuarioAdminActual ||
      perfilAdminActual?.rol !== "admin"
    ) {
      alert(
        "Acceso de administrador requerido."
      );
      return;
    }

    const v = id =>
      $(id)?.value || "";

    const id = v("auctionId")
      .trim()
      .toUpperCase();

    const marca = v("auctionBrand").trim();
    const modelo = v("auctionModel").trim();

    const precioInicial = Number(
      v("auctionStartPrice")
    );

    const incrementoMinimo = Number(
      v("auctionMinIncrement")
    );

    const duracionRonda = Number(
      v("auctionRoundDuration")
    );

    const fechaInicio = new Date(
      `${v("auctionStartDate")}T${v("auctionStartTime")}`
    );

    if (
      !id ||
      !marca ||
      !modelo ||
      !Number.isFinite(
        fechaInicio.getTime()
      ) ||
      !Number.isFinite(
        precioInicial
      ) ||
      precioInicial < 0 ||
      !Number.isFinite(
        incrementoMinimo
      ) ||
      incrementoMinimo < 1 ||
      !Number.isFinite(
        duracionRonda
      ) ||
      duracionRonda < 10
    ) {
      alert(
        "Revisa los datos obligatorios de la subasta."
      );
      return;
    }

    const boton = $("saveAuctionButton");

    if (boton) {
      boton.disabled = true;
      boton.textContent = "GUARDANDO...";
    }

    try {
      const ref = doc(
        db,
        "subastas",
        id
      );

      if ((await getDoc(ref)).exists()) {
        throw new Error(
          "Ya existe una subasta con ese ID."
        );
      }

      const urlsFotos = [];
      const urlsVideos = [];

      for (const f of fotos) {
        urlsFotos.push(
          await subirCloudinary(
            f,
            "image"
          )
        );
      }

      for (const f of videos) {
        urlsVideos.push(
          await subirCloudinary(
            f,
            "video"
          )
        );
      }

      await setDoc(ref, {
        id,

        categoria:
          v("auctionCategory") ||
          "vehiculo",

        marca,
        modelo,

        anio:
          Number(v("auctionYear")) ||
          null,

        version: v("auctionVersion"),

        vin: v("auctionVin")
          .toUpperCase(),

        placas: v("auctionPlates")
          .toUpperCase(),

        kilometraje:
          Number(v("auctionMileage")) ||
          null,

        transmision:
          v("auctionTransmission"),

        combustible:
          v("auctionFuel"),

        color:
          v("auctionColor"),

        tieneLlaves:
          v("auctionHasKeys") !== "no",

        cantidadLlaves:
          Number(v("auctionKeyCount")) ||
          0,

        tipoFactura:
          v("auctionInvoiceType"),

        tarjetaCirculacion:
          v("auctionRegistrationCard"),

        documentos:
          v("auctionDocuments"),

        condicion:
          v("auctionCondition") ||
          "Usado",

        enciende:
          v("auctionStarts"),

        danosEsteticos:
          v("auctionBodyDamage"),

        danosMecanicos:
          v("auctionMechanicalDamage"),

        observaciones:
          v("auctionDamageNotes"),

        ubicacion:
          v("auctionLocation"),

        descripcion:
          v("auctionDescription"),

        precioInicial,
        pujaActual: precioInicial,
        incrementoMinimo,
        duracionRonda,

        fechaInicio:
          Timestamp.fromDate(
            fechaInicio
          ),

        estado:
          v("auctionStatus") ||
          "programada",

        totalPujas: 0,

        ultimaPujaUid: "",
        ultimaPujaNombre: "",
        ultimaPujaFecha: null,

        fotos: urlsFotos,

        fotoPortada:
          urlsFotos[0] || "",

        videos: urlsVideos,

        creadoPorUid:
          usuarioAdminActual.uid,

        creadoPorCorreo:
          usuarioAdminActual.email ||
          "",

        creadoEn:
          serverTimestamp(),

        actualizadoEn:
          serverTimestamp()
      });

      alert(
        `Subasta ${id} creada correctamente.`
      );

      $("auctionForm").reset();

      fotos = [];
      videos = [];

      vistaFotos();
      vistaVideos();

      cerrarModal();

    } catch (error) {
      console.error(
        "Error creando subasta:",
        error
      );

      alert(
        error.message ||
        "No se pudo crear la subasta."
      );

    } finally {
      if (boton) {
        boton.disabled = false;
        boton.textContent =
          "CREAR SUBASTA";
      }
    }
  }
);

/* ============================================
   CONFIGURACIÓN
============================================ */

$("saveSettingsButton")?.addEventListener(
  "click",
  () => {
    const duracion = Number(
      $("defaultRoundDuration")?.value
    );

    const incremento = Number(
      $("defaultIncrement")?.value
    );

    if (
      duracion < 10 ||
      incremento < 1
    ) {
      alert(
        "La duración o el incremento no son válidos."
      );
      return;
    }

    if ($("settingsMessage")) {
      $("settingsMessage").hidden = false;

      $("settingsMessage").textContent =
        "Configuración validada para las próximas subastas.";
    }
  }
);

/* ============================================
   FIN DE ADMIN.JS
============================================ */
