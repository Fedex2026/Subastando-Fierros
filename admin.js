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
  updateDoc,
  setDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
/* =====================================================
   ELEMENTOS GENERALES
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
const statLiveAuctions = document.getElementById("statLiveAuctions");
const statUpcomingAuctions = document.getElementById("statUpcomingAuctions");
const auctionsAdminList = document.getElementById("auctionsAdminList");
const dashboardAuctions = document.getElementById("dashboardAuctions");
/* =====================================================
   MODAL NUEVA SUBASTA
===================================================== */
const auctionModal = document.getElementById("auctionModal");
const auctionForm = document.getElementById("auctionForm");
const closeAuctionModalButton = document.getElementById("closeAuctionModalButton");
const cancelAuctionButton = document.getElementById("cancelAuctionButton");
const saveAuctionButton = document.getElementById("saveAuctionButton");
const auctionFormMessage = document.getElementById("auctionFormMessage");
const auctionId = document.getElementById("auctionId");
const auctionCategory = document.getElementById("auctionCategory");
const auctionBrand = document.getElementById("auctionBrand");
const auctionModel = document.getElementById("auctionModel");
const auctionYear = document.getElementById("auctionYear");
const auctionVersion = document.getElementById("auctionVersion");
const auctionStartPrice = document.getElementById("auctionStartPrice");
const auctionMinIncrement = document.getElementById("auctionMinIncrement");
const auctionRoundDuration = document.getElementById("auctionRoundDuration");
const auctionStatus = document.getElementById("auctionStatus");
const auctionStartDate = document.getElementById("auctionStartDate");
const auctionStartTime = document.getElementById("auctionStartTime");
const auctionLocation = document.getElementById("auctionLocation");
const auctionDescription = document.getElementById("auctionDescription");
const auctionPhotos = document.getElementById("auctionPhotos");
const auctionPhotosLabel = document.getElementById("auctionPhotosLabel");
const auctionPhotoPreview = document.getElementById("auctionPhotoPreview");
/* =====================================================
   ESTADO
===================================================== */
let usuarioAdminActual = null;
let perfilAdminActual = null;
let usuariosCargados = [];
let unsubscribeUsuarios = null;
let subastasCargadas = [];
let unsubscribeSubastas = null;
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
    showSection(item.dataset.section);
  });
});
goSectionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showSection(button.dataset.goSection);
  });
});
/* =====================================================
   ACCESO ADMINISTRADOR
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
    if (unsubscribeUsuarios) unsubscribeUsuarios();
    if (unsubscribeSubastas) unsubscribeSubastas();
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
    iniciarEscuchaSubastas();
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
      if (unsubscribeUsuarios) unsubscribeUsuarios();
      if (unsubscribeSubastas) unsubscribeSubastas();
      await signOut(auth);
      window.location.href = "login.html";
    } catch (error) {
      console.error("Error cerrando sesión:", error);
      logoutButton.disabled = false;
      logoutButton.textContent = "CERRAR SESIÓN";
      alert("No se pudo cerrar la sesión. Intenta nuevamente.");
    }
  });
}
/* =====================================================
   MIEMBROS
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
function iniciarEscuchaUsuarios() {
  if (!usuarioAdminActual) return;
  if (unsubscribeUsuarios) unsubscribeUsuarios();
  unsubscribeUsuarios = onSnapshot(
    collection(db, "usuarios"),
    (snapshot) => {
      usuariosCargados = snapshot.docs
        .map((documento) => ({
          id: documento.id,
          ...documento.data()
        }))
        .filter((usuario) => usuario.rol !== "admin");
      usuariosCargados.sort((a, b) => {
        return normalizarTexto(a.nombre || a.correo)
          .localeCompare(normalizarTexto(b.nombre || b.correo));
      });
      actualizarResumenMiembros();
      renderMiembros();
      renderPendientesDashboard();
    },
    (error) => {
      console.error("Error leyendo usuarios:", error);
    }
  );
}
function actualizarResumenMiembros() {
  const activos = usuariosCargados.filter(
    (usuario) => obtenerEstadoMiembro(usuario) === "activo"
  );
  const pendientes = usuariosCargados.filter(
    (usuario) => obtenerEstadoMiembro(usuario) === "pendiente"
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
  telefono.textContent = usuario.telefono || "Sin teléfono";
  telefono.style.color = "#c8c9cd";
  telefono.style.fontSize = "12px";
  const estadoWrap = document.createElement("div");
  const badge = document.createElement("span");
  if (estado === "activo") {
    badge.textContent = "ACTIVO";
    badge.style.color = "#24c875";
    badge.style.border = "1px solid rgba(36,200,117,.45)";
    badge.style.background = "rgba(36,200,117,.10)";
  } else if (estado === "suspendido") {
    badge.textContent = "SUSPENDIDO";
    badge.style.color = "#ff5b5b";
    badge.style.border = "1px solid rgba(255,91,91,.45)";
    badge.style.background = "rgba(255,91,91,.10)";
  } else {
    badge.textContent = "PENDIENTE";
    badge.style.color = "#ffb020";
    badge.style.border = "1px solid rgba(255,176,32,.45)";
    badge.style.background = "rgba(255,176,32,.10)";
  }
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.minHeight = "28px";
  badge.style.padding = "0 10px";
  badge.style.borderRadius = "999px";
  badge.style.fontSize = "9px";
  badge.style.fontWeight = "900";
  estadoWrap.appendChild(badge);
  const acciones = document.createElement("div");
  acciones.style.display = "flex";
  acciones.style.justifyContent = "flex-end";
  acciones.style.gap = "8px";
  if (estado !== "activo") {
    acciones.appendChild(
      crearBotonMiembro("AUTORIZAR", "autorizar", usuario.id)
    );
  }
  if (estado !== "suspendido") {
    acciones.appendChild(
      crearBotonMiembro("SUSPENDER", "suspender", usuario.id)
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
  const busqueda = normalizarTexto(memberSearch?.value || "");
  const filtrados = usuariosCargados.filter((usuario) => {
    if (!busqueda) return true;
    return normalizarTexto([
      usuario.nombre,
      usuario.correo,
      usuario.telefono
    ].join(" ")).includes(busqueda);
  });
  membersAdminList.innerHTML = "";
  membersAdminList.style.minHeight = "0";
  membersAdminList.style.display = "block";
  membersAdminList.style.textAlign = "left";
  if (filtrados.length === 0) {
    const mensaje = document.createElement("div");
    mensaje.style.padding = "40px";
    mensaje.style.textAlign = "center";
    mensaje.textContent = "No hay miembros para mostrar.";
    membersAdminList.appendChild(mensaje);
    return;
  }
  filtrados.forEach((usuario) => {
    membersAdminList.appendChild(crearFilaMiembro(usuario));
  });
}
function renderPendientesDashboard() {
  if (!dashboardPendingMembers) return;
  const pendientes = usuariosCargados
    .filter((usuario) => obtenerEstadoMiembro(usuario) === "pendiente")
    .slice(0, 5);
  dashboardPendingMembers.innerHTML = "";
  if (pendientes.length === 0) {
    dashboardPendingMembers.className = "admin-empty-state";
    const icono = document.createElement("span");
    icono.textContent = "👥";
    const titulo = document.createElement("strong");
    titulo.textContent = "Sin miembros pendientes";
    const texto = document.createElement("p");
    texto.textContent = "Los registros pendientes aparecerán aquí.";
    dashboardPendingMembers.appendChild(icono);
    dashboardPendingMembers.appendChild(titulo);
    dashboardPendingMembers.appendChild(texto);
    return;
  }
  dashboardPendingMembers.className = "";
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
    const correo = document.createElement("small");
    correo.textContent = usuario.correo || "";
    correo.style.display = "block";
    correo.style.marginTop = "4px";
    correo.style.color = "#9b9da5";
    datos.appendChild(nombre);
    datos.appendChild(correo);
    fila.appendChild(datos);
    fila.appendChild(
      crearBotonMiembro("AUTORIZAR", "autorizar", usuario.id)
    );
    dashboardPendingMembers.appendChild(fila);
  });
}
async function autorizarMiembro(uid, boton) {
  const usuario = usuariosCargados.find((item) => item.id === uid);
  if (!usuario) return;
  if (!confirm(`¿Autorizar a ${usuario.nombre || usuario.correo}?`)) {
    return;
  }
  boton.disabled = true;
  boton.textContent = "GUARDANDO...";
  try {
    await updateDoc(doc(db, "usuarios", uid), {
      activo: true,
      membresiaActiva: true,
      puedePujar: true,
      estadoMembresia: "activo"
    });
  } catch (error) {
    console.error("Error autorizando miembro:", error);
    alert("No se pudo autorizar al miembro.");
    boton.disabled = false;
    boton.textContent = "AUTORIZAR";
  }
}
async function suspenderMiembro(uid, boton) {
  const usuario = usuariosCargados.find((item) => item.id === uid);
  if (!usuario) return;
  if (!confirm(`¿Suspender a ${usuario.nombre || usuario.correo}?`)) {
    return;
  }
  boton.disabled = true;
  boton.textContent = "GUARDANDO...";
  try {
    await updateDoc(doc(db, "usuarios", uid), {
      activo: false,
      membresiaActiva: false,
      puedePujar: false,
      estadoMembresia: "suspendida"
    });
  } catch (error) {
    console.error("Error suspendiendo miembro:", error);
    alert("No se pudo suspender al miembro.");
    boton.disabled = false;
    boton.textContent = "SUSPENDER";
  }
}
document.addEventListener("click", async (event) => {
  const boton = event.target.closest("[data-member-action]");
  if (!boton) return;
  const accion = boton.dataset.memberAction;
  const uid = boton.dataset.memberUid;
  if (accion === "autorizar") {
    await autorizarMiembro(uid, boton);
  }
  if (accion === "suspender") {
    await suspenderMiembro(uid, boton);
  }
});
if (memberSearch) {
  memberSearch.addEventListener("input", renderMiembros);
}
/* =====================================================
   SUBASTAS EN TIEMPO REAL
===================================================== */
function iniciarEscuchaSubastas() {
  if (unsubscribeSubastas) unsubscribeSubastas();
  unsubscribeSubastas = onSnapshot(
    collection(db, "subastas"),
    (snapshot) => {
      subastasCargadas = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));
      actualizarResumenSubastas();
      renderSubastas();
      renderSubastasDashboard();
    },
    (error) => {
      console.error("Error leyendo subastas:", error);
    }
  );
}
function actualizarResumenSubastas() {
  const ahora = Date.now();
  const enVivo = subastasCargadas.filter((subasta) => {
    return subasta.estado === "en_vivo";
  });
  const proximas = subastasCargadas.filter((subasta) => {
    const fechaMs =
      subasta.fechaInicio &&
      typeof subasta.fechaInicio.toMillis === "function"
        ? subasta.fechaInicio.toMillis()
        : 0;
    return subasta.estado === "programada" && fechaMs > ahora;
  });
  if (statLiveAuctions) {
    statLiveAuctions.textContent = String(enVivo.length);
  }
  if (statUpcomingAuctions) {
    statUpcomingAuctions.textContent = String(proximas.length);
  }
}
function formatearFechaSubasta(fecha) {
  if (!fecha || typeof fecha.toDate !== "function") {
    return "Sin fecha";
  }
  return fecha.toDate().toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
function renderSubastas() {
  if (!auctionsAdminList) return;
  auctionsAdminList.innerHTML = "";
  auctionsAdminList.style.minHeight = "0";
  auctionsAdminList.style.display = "block";
  auctionsAdminList.style.textAlign = "left";
  if (subastasCargadas.length === 0) {
    const vacio = document.createElement("div");
    vacio.style.padding = "50px 20px";
    vacio.style.textAlign = "center";
    vacio.innerHTML =
      "<div style='font-size:32px'>🔨</div><strong style='display:block;margin-top:10px'>Aún no hay subastas</strong><p style='color:#9b9da5'>Crea la primera con el botón + NUEVA SUBASTA.</p>";
    auctionsAdminList.appendChild(vacio);
    return;
  }
  const ordenadas = [...subastasCargadas].sort((a, b) => {
    const fa = a.fechaInicio?.toMillis?.() || 0;
    const fb = b.fechaInicio?.toMillis?.() || 0;
    return fb - fa;
  });
  ordenadas.forEach((subasta) => {
    const fila = document.createElement("div");
    fila.style.display = "grid";
    fila.style.gridTemplateColumns =
      "minmax(220px,1.4fr) minmax(180px,1fr) 150px 140px";
    fila.style.gap = "16px";
    fila.style.alignItems = "center";
    fila.style.padding = "18px 0";
    fila.style.borderBottom = "1px solid #292b31";
    const principal = document.createElement("div");
    const titulo = document.createElement("strong");
    titulo.textContent =
      `${subasta.marca || ""} ${subasta.modelo || ""} ${subasta.anio || ""}`.trim()
      || subasta.id;
    titulo.style.display = "block";
    titulo.style.fontSize = "13px";
    const lote = document.createElement("small");
    lote.textContent = subasta.id;
    lote.style.display = "block";
    lote.style.marginTop = "5px";
    lote.style.color = "#9b9da5";
    principal.appendChild(titulo);
    principal.appendChild(lote);
    const fecha = document.createElement("div");
    fecha.textContent = formatearFechaSubasta(subasta.fechaInicio);
    fecha.style.fontSize = "12px";
    fecha.style.color = "#c8c9cd";
    const precio = document.createElement("strong");
    precio.textContent =
      `$${Number(subasta.pujaActual || 0).toLocaleString("es-MX")} MXN`;
    precio.style.fontSize = "12px";
    const estado = document.createElement("span");
    estado.textContent = String(subasta.estado || "programada").toUpperCase();
    estado.style.fontSize = "10px";
    estado.style.fontWeight = "900";
    estado.style.color =
      subasta.estado === "en_vivo" ? "#24c875" : "#ffb020";
    fila.appendChild(principal);
    fila.appendChild(fecha);
    fila.appendChild(precio);
    fila.appendChild(estado);
    auctionsAdminList.appendChild(fila);
  });
}
function renderSubastasDashboard() {
  if (!dashboardAuctions) return;
  dashboardAuctions.innerHTML = "";
  const ultimas = [...subastasCargadas]
    .sort((a, b) => {
      const fa = a.creadoEn?.toMillis?.() || 0;
      const fb = b.creadoEn?.toMillis?.() || 0;
      return fb - fa;
    })
    .slice(0, 5);
  if (ultimas.length === 0) {
    dashboardAuctions.className = "admin-empty-state";
    dashboardAuctions.innerHTML =
      "<span>🔨</span><strong>Aún no hay datos para mostrar</strong><p>Las subastas aparecerán aquí cuando crees la primera.</p>";
    return;
  }
  dashboardAuctions.className = "";
  ultimas.forEach((subasta) => {
    const fila = document.createElement("div");
    fila.style.display = "flex";
    fila.style.alignItems = "center";
    fila.style.justifyContent = "space-between";
    fila.style.gap = "12px";
    fila.style.padding = "14px 0";
    fila.style.borderBottom = "1px solid #292b31";
    const datos = document.createElement("div");
    const titulo = document.createElement("strong");
    titulo.textContent =
      `${subasta.marca || ""} ${subasta.modelo || ""}`.trim()
      || subasta.id;
    const fecha = document.createElement("small");
    fecha.textContent = formatearFechaSubasta(subasta.fechaInicio);
    fecha.style.display = "block";
    fecha.style.marginTop = "4px";
    fecha.style.color = "#9b9da5";
    datos.appendChild(titulo);
    datos.appendChild(fecha);
    const estado = document.createElement("strong");
    estado.textContent = String(subasta.estado || "programada").toUpperCase();
    estado.style.fontSize = "10px";
    estado.style.color =
      subasta.estado === "en_vivo" ? "#24c875" : "#ffb020";
    fila.appendChild(datos);
    fila.appendChild(estado);
    dashboardAuctions.appendChild(fila);
  });
}
/* =====================================================
   MODAL NUEVA SUBASTA
===================================================== */
function generarSiguienteIdSubasta() {
  const numeros = subastasCargadas
    .map((subasta) => {
      const match = String(subasta.id || "").match(/^SF-(\d+)$/i);
      return match ? Number(match[1]) : 0;
    })
    .filter((numero) => Number.isFinite(numero));
  const maximo = numeros.length
    ? Math.max(...numeros)
    : 10048;
  return `SF-${maximo + 1}`;
}
function abrirModalSubasta() {
  showSection("subastas");
  if (!auctionModal) {
    alert("No se encontró el formulario de nueva subasta. Revisa admin.html.");
    return;
  }
  if (auctionId && !auctionId.value) {
    auctionId.value = generarSiguienteIdSubasta();
  }
  if (auctionRoundDuration) {
    auctionRoundDuration.value =
      document.getElementById("defaultRoundDuration")?.value || 120;
  }
  if (auctionMinIncrement) {
    auctionMinIncrement.value =
      document.getElementById("defaultIncrement")?.value || 500;
  }
  auctionModal.hidden = false;
  document.body.style.overflow = "hidden";
}
function cerrarModalSubasta() {
  if (!auctionModal) return;
  auctionModal.hidden = true;
  document.body.style.overflow = "";
  if (auctionFormMessage) {
    auctionFormMessage.hidden = true;
    auctionFormMessage.textContent = "";
  }
}
if (newAuctionButton) {
  newAuctionButton.addEventListener("click", abrirModalSubasta);
}
if (newAuctionTopButton) {
  newAuctionTopButton.addEventListener("click", abrirModalSubasta);
}
if (closeAuctionModalButton) {
  closeAuctionModalButton.addEventListener("click", cerrarModalSubasta);
}
if (cancelAuctionButton) {
  cancelAuctionButton.addEventListener("click", cerrarModalSubasta);
}
document.querySelectorAll("[data-close-auction-modal]").forEach((elemento) => {
  elemento.addEventListener("click", cerrarModalSubasta);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && auctionModal && !auctionModal.hidden) {
    cerrarModalSubasta();
  }
});
/* =====================================================
   PREVISUALIZACIÓN DE FOTOS
===================================================== */
if (auctionPhotos) {
  auctionPhotos.addEventListener("change", () => {
    const archivos = Array.from(auctionPhotos.files || []);
    if (auctionPhotosLabel) {
      auctionPhotosLabel.textContent =
        archivos.length === 0
          ? "Puedes elegir varias imágenes."
          : `${archivos.length} foto(s) seleccionada(s).`;
    }
    if (!auctionPhotoPreview) return;
    auctionPhotoPreview.innerHTML = "";
    archivos.slice(0, 8).forEach((archivo) => {
      const url = URL.createObjectURL(archivo);
      const img = document.createElement("img");
      img.src = url;
      img.alt = archivo.name;
      img.onload = () => URL.revokeObjectURL(url);
      auctionPhotoPreview.appendChild(img);
    });
  });
}
/* =====================================================
   CREAR SUBASTA EN FIRESTORE
===================================================== */
if (auctionForm) {
  auctionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!usuarioAdminActual || perfilAdminActual?.rol !== "admin") {
      alert("No tienes permisos de administrador.");
      return;
    }
    const id = String(auctionId?.value || "").trim().toUpperCase();
    const marca = String(auctionBrand?.value || "").trim();
    const modelo = String(auctionModel?.value || "").trim();
    const precioInicial = Number(auctionStartPrice?.value || 0);
    const incremento = Number(auctionMinIncrement?.value || 0);
    const duracionRonda = Number(auctionRoundDuration?.value || 0);
    const fecha = String(auctionStartDate?.value || "");
    const hora = String(auctionStartTime?.value || "");
    if (!id || !marca || !modelo || !fecha || !hora) {
      alert("Completa los campos obligatorios.");
      return;
    }
    if (!Number.isFinite(precioInicial) || precioInicial < 0) {
      alert("El precio inicial no es válido.");
      return;
    }
    if (!Number.isFinite(incremento) || incremento < 1) {
      alert("El incremento mínimo no es válido.");
      return;
    }
    if (!Number.isFinite(duracionRonda) || duracionRonda < 10) {
      alert("La duración de ronda no es válida.");
      return;
    }
    const fechaLocal = new Date(`${fecha}T${hora}:00`);
    if (Number.isNaN(fechaLocal.getTime())) {
      alert("La fecha u hora no es válida.");
      return;
    }
    if (saveAuctionButton) {
      saveAuctionButton.disabled = true;
      saveAuctionButton.textContent = "CREANDO...";
    }
    try {
      const referencia = doc(db, "subastas", id);
      const existe = await getDoc(referencia);
      if (existe.exists()) {
        throw new Error("YA_EXISTE");
      }
      await setDoc(referencia, {
        id,
        categoria: String(auctionCategory?.value || "vehiculo"),
        marca,
        modelo,
        anio:
          auctionYear?.value
            ? Number(auctionYear.value)
            : null,
        version: String(auctionVersion?.value || "").trim(),
        ubicacion: String(auctionLocation?.value || "").trim(),
        descripcion: String(auctionDescription?.value || "").trim(),
        precioInicial,
        pujaActual: precioInicial,
        incrementoMinimo: incremento,
        duracionRonda,
        fechaInicio: Timestamp.fromDate(fechaLocal),
        estado: String(auctionStatus?.value || "programada"),
        totalPujas: 0,
        ultimaPujaUid: "",
        ultimaPujaNombre: "",
        ultimaPujaFecha: null,
        fotos: [],
        creadoPorUid: usuarioAdminActual.uid,
        creadoPorCorreo:
          perfilAdminActual?.correo ||
          usuarioAdminActual.email ||
          "",
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      });
      if (auctionFormMessage) {
        auctionFormMessage.hidden = false;
        auctionFormMessage.textContent =
          `Subasta ${id} creada correctamente.`;
      }
      auctionForm.reset();
      if (auctionMinIncrement) {
        auctionMinIncrement.value = "500";
      }
      if (auctionRoundDuration) {
        auctionRoundDuration.value = "120";
      }
      if (auctionPhotosLabel) {
        auctionPhotosLabel.textContent =
          "Puedes elegir varias imágenes.";
      }
      if (auctionPhotoPreview) {
        auctionPhotoPreview.innerHTML = "";
      }
      setTimeout(() => {
        cerrarModalSubasta();
      }, 700);
    } catch (error) {
      console.error("Error creando subasta:", error);
      if (error.message === "YA_EXISTE") {
        alert("Ya existe una subasta con ese ID / lote.");
      } else if (error.code === "permission-denied") {
        alert(
          "Firebase bloqueó la creación. Falta publicar las reglas de administrador para subastas."
        );
      } else {
        alert("No se pudo crear la subasta.");
      }
    } finally {
      if (saveAuctionButton) {
        saveAuctionButton.disabled = false;
        saveAuctionButton.textContent = "CREAR SUBASTA";
      }
    }
  });
}
/* =====================================================
   CONFIGURACIÓN
===================================================== */
if (saveSettingsButton) {
  saveSettingsButton.addEventListener("click", () => {
    const durationInput =
      document.getElementById("defaultRoundDuration");
    const incrementInput =
      document.getElementById("defaultIncrement");
    const duration = Number(durationInput?.value || 0);
    const increment = Number(incrementInput?.value || 0);
    if (!Number.isFinite(duration) || duration < 10) {
      alert("La duración debe ser de al menos 10 segundos.");
      return;
    }
    if (!Number.isFinite(increment) || increment < 1) {
      alert("El incremento mínimo debe ser mayor a 0.");
      return;
    }
    if (settingsMessage) {
      settingsMessage.hidden = false;
      settingsMessage.textContent =
        "Configuración validada. Estos valores se usarán al crear nuevas subastas.";
    }
  });
}
