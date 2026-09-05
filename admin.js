import { auth, db } from "./firebase-config.js";

 

import {

  onAuthStateChanged,

  signOut

} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

 

import {

  doc,

  getDoc,

  collection,

  onSnapshot,

  updateDoc

} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

 

 

/* =====================================================

   ELEMENTOS

===================================================== */

 

const loading = document.getElementById("adminLoading");

const adminApp = document.getElementById("adminApp");

const accessDenied = document.getElementById("adminAccessDenied");

 

const adminUserName = document.getElementById("adminUserName");

const adminUserEmail = document.getElementById("adminUserEmail");

 

const logoutButton = document.getElementById("logoutButton");

 

const pageTitle = document.getElementById("adminPageTitle");

const pageSubtitle = document.getElementById("adminPageSubtitle");

 

const navItems = document.querySelectorAll(".admin-nav-item");

const sections = document.querySelectorAll(".admin-section");

const goSectionButtons = document.querySelectorAll("[data-go-section]");

 

const newAuctionButton = document.getElementById("newAuctionButton");

const newAuctionTopButton = document.getElementById("newAuctionTopButton");

 

const saveSettingsButton = document.getElementById("saveSettingsButton");

const settingsMessage = document.getElementById("settingsMessage");

 

const membersAdminList = document.getElementById("membersAdminList");

const memberSearch = document.getElementById("memberSearch");

 

const dashboardPendingMembers = document.getElementById("dashboardPendingMembers");

 

const statActiveMembers = document.getElementById("statActiveMembers");

const statPendingMembers = document.getElementById("statPendingMembers");

 

 

/* =====================================================

   ESTADO

===================================================== */

 

let usuarioAdminActual = null;

let perfilAdminActual = null;

 

let usuariosCargados = [];

let unsubscribeUsuarios = null;

 

 

/* =====================================================

   CONFIGURACIÓN DE SECCIONES

===================================================== */

 

const sectionInfo = {

  dashboard: {

    title: "Dashboard",

    subtitle: "Resumen general de Subastando Fierros."

  },

 

  subastas: {

    title: "Subastas",

    subtitle: "Crea, programa, edita y administra tus subastas."

  },

 

  miembros: {

    title: "Miembros",

    subtitle: "Autoriza membresías y controla quién puede pujar."

  },

 

  ventas: {

    title: "Ganadores / Ventas",

    subtitle: "Consulta ganadores, pagos y entregas."

  },

 

  configuracion: {

    title: "Configuración",

    subtitle: "Parámetros generales de la plataforma."

  }

};

 

 

/* =====================================================

   CAMBIO DE SECCIÓN

===================================================== */

 

function showSection(sectionName) {

 

  const info = sectionInfo[sectionName];

 

  if (!info) return;

 

  navItems.forEach((item) => {

    item.classList.toggle(

      "active",

      item.dataset.section === sectionName

    );

  });

 

  sections.forEach((section) => {

    section.classList.toggle(

      "active",

      section.id === `section-${sectionName}`

    );

  });

 

  if (pageTitle) {

    pageTitle.textContent = info.title;

  }

 

  if (pageSubtitle) {

    pageSubtitle.textContent = info.subtitle;

  }

 

  window.scrollTo({

    top: 0,

    behavior: "smooth"

  });

}

 

 

navItems.forEach((item) => {

 

  item.addEventListener("click", () => {

 

    const sectionName = item.dataset.section;

 

    showSection(sectionName);

 

  });

 

});

 

 

goSectionButtons.forEach((button) => {

 

  button.addEventListener("click", () => {

 

    const sectionName = button.dataset.goSection;

 

    showSection(sectionName);

 

  });

 

});

 

 

/* =====================================================

   ACCESO DE ADMINISTRADOR

===================================================== */

 

function showLoading() {

 

  if (loading) loading.hidden = false;

  if (adminApp) adminApp.hidden = true;

  if (accessDenied) accessDenied.hidden = true;

 

}

 

 

function showAdmin() {

 

  if (loading) loading.hidden = true;

  if (accessDenied) accessDenied.hidden = true;

  if (adminApp) adminApp.hidden = false;

 

}

 

 

function showDenied() {

 

  if (loading) loading.hidden = true;

  if (adminApp) adminApp.hidden = true;

  if (accessDenied) accessDenied.hidden = false;

 

}

 

 

showLoading();

 

 

onAuthStateChanged(auth, async (user) => {

 

  if (!user) {

 

    if (unsubscribeUsuarios) {

      unsubscribeUsuarios();

      unsubscribeUsuarios = null;

    }

 

    window.location.href = "login.html";

    return;

 

  }

 

  try {

 

    const userRef = doc(db, "usuarios", user.uid);

 

    const userSnap = await getDoc(userRef);

 

    if (!userSnap.exists()) {

 

      showDenied();

      return;

 

    }

 

    const profile = userSnap.data();

 

    if (profile.rol !== "admin") {

 

      showDenied();

      return;

 

    }

 

    usuarioAdminActual = user;

    perfilAdminActual = profile;

 

    if (adminUserName) {

 

      adminUserName.textContent =

        profile.nombre ||

        user.displayName ||

        "Administrador";

 

    }

 

    if (adminUserEmail) {

 

      adminUserEmail.textContent =

        profile.correo ||

        user.email ||

        "";

 

    }

 

    showAdmin();

 

    iniciarEscuchaUsuarios();

 

  } catch (error) {

 

    console.error(

      "Error verificando acceso de administrador:",

      error

    );

 

    showDenied();

 

  }

 

});

 

 

/* =====================================================

   CERRAR SESIÓN

===================================================== */

 

if (logoutButton) {

 

  logoutButton.addEventListener("click", async () => {

 

    logoutButton.disabled = true;

    logoutButton.textContent = "CERRANDO...";

 

    try {

 

      if (unsubscribeUsuarios) {

        unsubscribeUsuarios();

        unsubscribeUsuarios = null;

      }

 

      await signOut(auth);

 

      window.location.href = "login.html";

 

    } catch (error) {

 

      console.error(

        "Error cerrando sesión:",

        error

      );

 

      logoutButton.disabled = false;

      logoutButton.textContent = "CERRAR SESIÓN";

 

      alert(

        "No se pudo cerrar la sesión. Intenta nuevamente."

      );

 

    }

 

  });

 

}

 

 

/* =====================================================

   MIEMBROS - FIRESTORE EN TIEMPO REAL

===================================================== */

 

function normalizarTexto(valor) {

 

  return String(valor || "")

    .toLowerCase()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "");

 

}

 

 

function obtenerEstadoMiembro(usuario) {

 

  const estadoGuardado = String(

    usuario.estadoMembresia ||

    usuario["estado de membresia"] ||

    ""

  ).toLowerCase();

 

  if (

    usuario.activo === false ||

    estadoGuardado === "suspendida" ||

    estadoGuardado === "suspendido"

  ) {

    return "suspendido";

  }

 

  if (

    usuario.activo === true &&

    usuario.membresiaActiva === true &&

    usuario.puedePujar === true

  ) {

    return "activo";

  }

 

  return "pendiente";

}

 

 

function etiquetaEstado(estado) {

 

  if (estado === "activo") {

    return "ACTIVO";

  }

 

  if (estado === "suspendido") {

    return "SUSPENDIDO";

  }

 

  return "PENDIENTE";

 

}

 

 

function colorEstado(estado) {

 

  if (estado === "activo") {

    return "#24c875";

  }

 

  if (estado === "suspendido") {

    return "#ff5b5b";

  }

 

  return "#ffb020";

 

}

 

 

function iniciarEscuchaUsuarios() {

 

  if (!usuarioAdminActual) return;

 

  if (unsubscribeUsuarios) {

    unsubscribeUsuarios();

  }

 

  const usuariosRef = collection(db, "usuarios");

 

  unsubscribeUsuarios = onSnapshot(

    usuariosRef,

    (snapshot) => {

 

      usuariosCargados = snapshot.docs

        .map((documento) => ({

          id: documento.id,

          ...documento.data()

        }))

        .filter((usuario) => usuario.rol !== "admin");

 

      usuariosCargados.sort((a, b) => {

 

        const nombreA = normalizarTexto(

          a.nombre || a.correo

        );

 

        const nombreB = normalizarTexto(

          b.nombre || b.correo

        );

 

        return nombreA.localeCompare(nombreB);

 

      });

 

      actualizarResumenMiembros();

      renderMiembros();

      renderPendientesDashboard();

 

    },

    (error) => {

 

      console.error(

        "Error leyendo usuarios:",

        error

      );

 

      if (membersAdminList) {

 

        membersAdminList.innerHTML = "";

 

        const mensaje = document.createElement("div");

        mensaje.style.padding = "28px";

        mensaje.style.textAlign = "center";

 

        const titulo = document.createElement("strong");

        titulo.textContent = "No se pudieron cargar los miembros";

 

        const texto = document.createElement("p");

        texto.textContent =

          "Falta habilitar en las reglas de Firestore el acceso del administrador a la colección usuarios.";

        texto.style.color = "#9b9da5";

        texto.style.margin = "8px 0 0";

 

        mensaje.appendChild(titulo);

        mensaje.appendChild(texto);

 

        membersAdminList.appendChild(mensaje);

 

      }

 

    }

  );

 

}

 

 

function actualizarResumenMiembros() {

 

  const activos = usuariosCargados.filter(

    (usuario) =>

      obtenerEstadoMiembro(usuario) === "activo"

  );

 

  const pendientes = usuariosCargados.filter(

    (usuario) =>

      obtenerEstadoMiembro(usuario) === "pendiente"

  );

 

  if (statActiveMembers) {

    statActiveMembers.textContent = String(activos.length);

  }

 

  if (statPendingMembers) {

    statPendingMembers.textContent = String(pendientes.length);

  }

 

}

 

 

function crearBotonMiembro(texto, tipo, uid) {

 

  const boton = document.createElement("button");

 

  boton.type = "button";

  boton.textContent = texto;

  boton.dataset.memberAction = tipo;

  boton.dataset.memberUid = uid;

 

  boton.style.minHeight = "36px";

  boton.style.padding = "0 13px";

  boton.style.borderRadius = "9px";

  boton.style.cursor = "pointer";

  boton.style.fontWeight = "900";

  boton.style.fontSize = "10px";

  boton.style.letterSpacing = ".3px";

 

  if (tipo === "autorizar") {

 

    boton.style.color = "#fff";

    boton.style.background = "#e31b23";

    boton.style.border = "1px solid #e31b23";

 

  } else {

 

    boton.style.color = "#fff";

    boton.style.background = "transparent";

    boton.style.border = "1px solid #3b3d44";

 

  }

 

  return boton;

 

}

 

 

function crearFilaMiembro(usuario) {

 

  const estado = obtenerEstadoMiembro(usuario);

 

  const fila = document.createElement("div");

 

  fila.style.display = "grid";

  fila.style.gridTemplateColumns =

    "minmax(210px,1.3fr) minmax(180px,1fr) 130px minmax(190px,auto)";

  fila.style.gap = "14px";

  fila.style.alignItems = "center";

  fila.style.padding = "16px 0";

  fila.style.borderBottom = "1px solid #292b31";

 

  const identidad = document.createElement("div");

 

  const nombre = document.createElement("strong");

  nombre.textContent = usuario.nombre || "Sin nombre";

  nombre.style.display = "block";

  nombre.style.fontSize = "13px";

 

  const correo = document.createElement("small");

  correo.textContent = usuario.correo || "Sin correo";

  correo.style.display = "block";

  correo.style.marginTop = "5px";

  correo.style.color = "#9b9da5";

 

  identidad.appendChild(nombre);

  identidad.appendChild(correo);

 

 

  const telefono = document.createElement("div");

  telefono.textContent =

    usuario.telefono || "Sin teléfono";

  telefono.style.color = "#c8c9cd";

  telefono.style.fontSize = "12px";

 

 

  const estadoWrap = document.createElement("div");

 

  const badge = document.createElement("span");

  badge.textContent = etiquetaEstado(estado);

  badge.style.display = "inline-flex";

  badge.style.alignItems = "center";

  badge.style.minHeight = "28px";

  badge.style.padding = "0 10px";

  badge.style.borderRadius = "999px";

  badge.style.fontSize = "9px";

  badge.style.fontWeight = "900";

  badge.style.letterSpacing = ".5px";

  badge.style.color = colorEstado(estado);

  badge.style.background = `${colorEstado(estado)}18`;

  badge.style.border = `1px solid ${colorEstado(estado)}55`;

 

  estadoWrap.appendChild(badge);

 

 

  const acciones = document.createElement("div");

  acciones.style.display = "flex";

  acciones.style.justifyContent = "flex-end";

  acciones.style.gap = "8px";

  acciones.style.flexWrap = "wrap";

 

  if (estado !== "activo") {

 

    acciones.appendChild(

      crearBotonMiembro(

        "AUTORIZAR",

        "autorizar",

        usuario.id

      )

    );

 

  }

 

  if (estado !== "suspendido") {

 

    acciones.appendChild(

      crearBotonMiembro(

        "SUSPENDER",

        "suspender",

        usuario.id

      )

    );

 

  }

 

  fila.appendChild(identidad);

  fila.appendChild(telefono);

  fila.appendChild(estadoWrap);

  fila.appendChild(acciones);

 

  return fila;

 

}

 

 

function renderMiembros() {

 

  if (!membersAdminList) return;

 

  const busqueda = normalizarTexto(

    memberSearch?.value || ""

  );

 

  const filtrados = usuariosCargados.filter((usuario) => {

 

    if (!busqueda) return true;

 

    const contenido = normalizarTexto([

      usuario.nombre,

      usuario.correo,

      usuario.telefono,

      etiquetaEstado(obtenerEstadoMiembro(usuario))

    ].join(" "));

 

    return contenido.includes(busqueda);

 

  });

 

  membersAdminList.innerHTML = "";

  membersAdminList.style.minHeight = "0";

  membersAdminList.style.display = "block";

  membersAdminList.style.textAlign = "left";

 

  if (filtrados.length === 0) {

 

    const vacio = document.createElement("div");

    vacio.style.padding = "42px 20px";

    vacio.style.textAlign = "center";

 

    const icono = document.createElement("div");

    icono.textContent = "👥";

    icono.style.fontSize = "32px";

 

    const titulo = document.createElement("strong");

    titulo.textContent =

      busqueda

        ? "No encontramos miembros"

        : "Aún no hay miembros registrados";

    titulo.style.display = "block";

    titulo.style.marginTop = "10px";

 

    const texto = document.createElement("p");

    texto.textContent =

      busqueda

        ? "Prueba con otro nombre, correo o teléfono."

        : "Los usuarios registrados aparecerán aquí.";

    texto.style.color = "#9b9da5";

    texto.style.fontSize = "11px";

 

    vacio.appendChild(icono);

    vacio.appendChild(titulo);

    vacio.appendChild(texto);

 

    membersAdminList.appendChild(vacio);

 

    return;

 

  }

 

  filtrados.forEach((usuario) => {

 

    membersAdminList.appendChild(

      crearFilaMiembro(usuario)

    );

 

  });

 

}

 

 

function renderPendientesDashboard() {

 

  if (!dashboardPendingMembers) return;

 

  const pendientes = usuariosCargados

    .filter(

      (usuario) =>

        obtenerEstadoMiembro(usuario) === "pendiente"

    )

    .slice(0, 5);

 

  dashboardPendingMembers.innerHTML = "";

 

  if (pendientes.length === 0) {

 

    dashboardPendingMembers.className =

      "admin-empty-state";

 

    const icono = document.createElement("span");

    icono.textContent = "👥";

 

    const titulo = document.createElement("strong");

    titulo.textContent = "Sin miembros pendientes";

 

    const texto = document.createElement("p");

    texto.textContent =

      "Los registros pendientes aparecerán aquí.";

 

    dashboardPendingMembers.appendChild(icono);

    dashboardPendingMembers.appendChild(titulo);

    dashboardPendingMembers.appendChild(texto);

 

    return;

 

  }

 

  dashboardPendingMembers.className = "";

  dashboardPendingMembers.style.paddingTop = "6px";

 

  pendientes.forEach((usuario) => {

 

    const fila = document.createElement("div");

 

    fila.style.display = "flex";

    fila.style.alignItems = "center";

    fila.style.justifyContent = "space-between";

    fila.style.gap = "12px";

    fila.style.padding = "13px 0";

    fila.style.borderBottom = "1px solid #292b31";

 

    const datos = document.createElement("div");

 

    const nombre = document.createElement("strong");

    nombre.textContent = usuario.nombre || "Sin nombre";

    nombre.style.display = "block";

    nombre.style.fontSize = "12px";

 

    const correo = document.createElement("small");

    correo.textContent = usuario.correo || "";

    correo.style.display = "block";

    correo.style.marginTop = "4px";

    correo.style.color = "#9b9da5";

 

    datos.appendChild(nombre);

    datos.appendChild(correo);

 

    const boton = crearBotonMiembro(

      "AUTORIZAR",

      "autorizar",

      usuario.id

    );

 

    fila.appendChild(datos);

    fila.appendChild(boton);

 

    dashboardPendingMembers.appendChild(fila);

 

  });

 

}

 

 

/* =====================================================

   ACCIONES DE MIEMBROS

===================================================== */

 

async function autorizarMiembro(uid, boton) {

 

  const usuario = usuariosCargados.find(

    (item) => item.id === uid

  );

 

  if (!usuario) return;

 

  const confirmado = window.confirm(

    `¿Autorizar la membresía de ${

      usuario.nombre || usuario.correo || "este usuario"

    }?\n\nPodrá participar en las pujas.`

  );

 

  if (!confirmado) return;

 

  const textoOriginal = boton.textContent;

 

  boton.disabled = true;

  boton.textContent = "GUARDANDO...";

 

  try {

 

    await updateDoc(

      doc(db, "usuarios", uid),

      {

        activo: true,

        membresiaActiva: true,

        puedePujar: true,

        estadoMembresia: "activo"

      }

    );

 

  } catch (error) {

 

    console.error(

      "Error autorizando miembro:",

      error

    );

 

    alert(

      "No se pudo autorizar al miembro. Revisa las reglas de Firestore."

    );

 

    boton.disabled = false;

    boton.textContent = textoOriginal;

 

  }

 

}

 

 

async function suspenderMiembro(uid, boton) {

 

  const usuario = usuariosCargados.find(

    (item) => item.id === uid

  );

 

  if (!usuario) return;

 

  const confirmado = window.confirm(

    `¿Suspender a ${

      usuario.nombre || usuario.correo || "este usuario"

    }?\n\nNo podrá participar en las pujas hasta que vuelvas a autorizarlo.`

  );

 

  if (!confirmado) return;

 

  const textoOriginal = boton.textContent;

 

  boton.disabled = true;

  boton.textContent = "GUARDANDO...";

 

  try {

 

    await updateDoc(

      doc(db, "usuarios", uid),

      {

        activo: false,

        membresiaActiva: false,

        puedePujar: false,

        estadoMembresia: "suspendida"

      }

    );

 

  } catch (error) {

 

    console.error(

      "Error suspendiendo miembro:",

      error

    );

 

    alert(

      "No se pudo suspender al miembro. Revisa las reglas de Firestore."

    );

 

    boton.disabled = false;

    boton.textContent = textoOriginal;

 

  }

 

}

 

 

document.addEventListener("click", async (event) => {

 

  const boton = event.target.closest(

    "[data-member-action]"

  );

 

  if (!boton) return;

 

  const accion = boton.dataset.memberAction;

  const uid = boton.dataset.memberUid;

 

  if (!uid) return;

 

  if (accion === "autorizar") {

 

    await autorizarMiembro(uid, boton);

    return;

 

  }

 

  if (accion === "suspender") {

 

    await suspenderMiembro(uid, boton);

 

  }

 

});

 

 

if (memberSearch) {

 

  memberSearch.addEventListener(

    "input",

    renderMiembros

  );

 

}

 

 

/* =====================================================

   BOTONES DE NUEVA SUBASTA

   El formulario real se conecta en la siguiente etapa.

===================================================== */

 

function openAuctionSection() {

 

  showSection("subastas");

 

  const auctionList =

    document.getElementById("auctionsAdminList");

 

  if (auctionList) {

 

    auctionList.scrollIntoView({

      behavior: "smooth",

      block: "center"

    });

 

  }

 

}

 

 

if (newAuctionButton) {

 

  newAuctionButton.addEventListener(

    "click",

    openAuctionSection

  );

 

}

 

 

if (newAuctionTopButton) {

 

  newAuctionTopButton.addEventListener(

    "click",

    openAuctionSection

  );

 

}

 

 

/* =====================================================

   CONFIGURACIÓN

   El guardado real se conectará con el módulo

   de creación de subastas.

===================================================== */

 

if (saveSettingsButton) {

 

  saveSettingsButton.addEventListener("click", () => {

 

    const durationInput =

      document.getElementById(

        "defaultRoundDuration"

      );

 

    const incrementInput =

      document.getElementById(

        "defaultIncrement"

      );

 

    const duration =

      Number(durationInput?.value || 0);

 

    const increment =

      Number(incrementInput?.value || 0);

 

    if (

      !Number.isFinite(duration) ||

      duration < 10

    ) {

 

      alert(

        "La duración debe ser de al menos 10 segundos."

      );

 

      return;

 

    }

 

    if (

      !Number.isFinite(increment) ||

      increment < 1

    ) {

 

      alert(

        "El incremento mínimo debe ser mayor a 0."

      );

 

      return;

 

    }

 

    if (settingsMessage) {

 

      settingsMessage.hidden = false;

 

      settingsMessage.textContent =

        "Configuración validada. El guardado en Firebase se conectará con el módulo de subastas.";

 

    }

 

  });

 

}
