import { auth, db } from "./firebase-config.js";

 

import {

  onAuthStateChanged,

  signOut

} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

 

import {

  doc,

  getDoc

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

 

    /*

      Si no existe sesión iniciada, mandamos al login.

      Después del login podrá regresar manualmente a admin.html.

    */

 

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

 

    /*

      SEGURIDAD DEL PANEL:

      El documento usuarios/{uid} debe tener:

 

      rol: "admin"

 

      Un usuario normal con rol "usuario" no puede abrir el panel.

    */

 

    if (profile.rol !== "admin") {

 

      showDenied();

      return;

 

    }

 

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

   Por ahora conserva los valores en la interfaz.

   El guardado en Firestore se conecta junto con el

   módulo de creación de subastas.

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
