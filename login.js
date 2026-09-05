import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

const correoInput = document.getElementById("correo");
const passwordInput = document.getElementById("password");

const togglePassword = document.getElementById("togglePassword");


/* =========================================
   MOSTRAR / OCULTAR CONTRASEÑA
========================================= */

togglePassword.addEventListener("click", () => {

  const mostrando =
    passwordInput.type === "text";

  passwordInput.type =
    mostrando ? "password" : "text";

  togglePassword.textContent =
    mostrando ? "VER" : "OCULTAR";

});


/* =========================================
   INICIAR SESIÓN
========================================= */

loginForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  loginMessage.textContent = "";
  loginMessage.style.color = "#ff6863";

  const correo =
    correoInput.value.trim().toLowerCase();

  const password =
    passwordInput.value;


  if (!correo) {
    mostrarError("Ingresa tu correo electrónico.");
    return;
  }


  if (!password) {
    mostrarError("Ingresa tu contraseña.");
    return;
  }


  try {

    loginButton.disabled = true;
    loginButton.textContent = "ENTRANDO...";


    /* -----------------------------------------
       1. LOGIN EN FIREBASE AUTHENTICATION
    ----------------------------------------- */

    const credencial =
      await signInWithEmailAndPassword(
        auth,
        correo,
        password
      );


    const usuario = credencial.user;


    /* -----------------------------------------
       2. BUSCAR PERFIL EN FIRESTORE
    ----------------------------------------- */

    const usuarioRef =
      doc(db, "usuarios", usuario.uid);

    const usuarioSnap =
      await getDoc(usuarioRef);


    if (!usuarioSnap.exists()) {

      mostrarError(
        "Tu cuenta existe, pero no encontramos tu perfil."
      );

      loginButton.disabled = false;
      loginButton.textContent = "INICIAR SESIÓN";

      return;
    }


    const datos =
      usuarioSnap.data();


    /* -----------------------------------------
       3. COMPROBAR QUE LA CUENTA ESTÉ ACTIVA
    ----------------------------------------- */

    if (datos.activo === false) {

      mostrarError(
        "Tu cuenta está desactivada. Contacta a Subastando Fierros."
      );

      loginButton.disabled = false;
      loginButton.textContent = "INICIAR SESIÓN";

      return;
    }


    /* -----------------------------------------
       4. LOGIN CORRECTO
    ----------------------------------------- */

    loginMessage.style.color = "#36d67a";

    loginMessage.textContent =
      "Sesión iniciada correctamente.";


    /* -----------------------------------------
       5. REDIRECCIÓN
    ----------------------------------------- */

    setTimeout(() => {

      /*
        Más adelante podremos hacer:

        ADMIN:
        admin.html

        USUARIO:
        subasta activa / vehículo del QR

        Por ahora lo regresamos al inicio.
      */

      if (datos.rol === "admin") {

        window.location.href = "admin.html";

      } else {

        const destino =
          sessionStorage.getItem(
            "subastandoFierrosDestino"
          );

        if (destino) {

          sessionStorage.removeItem(
            "subastandoFierrosDestino"
          );

          window.location.href = destino;

        } else {

          window.location.href = "index.html";

        }

      }

    }, 700);


  } catch (error) {

    console.error(
      "Error al iniciar sesión:",
      error
    );


    loginButton.disabled = false;

    loginButton.textContent =
      "INICIAR SESIÓN";


    switch (error.code) {

      case "auth/invalid-email":

        mostrarError(
          "El correo electrónico no es válido."
        );

        break;


      case "auth/invalid-credential":

        mostrarError(
          "Correo o contraseña incorrectos."
        );

        break;


      case "auth/user-disabled":

        mostrarError(
          "Esta cuenta fue deshabilitada."
        );

        break;


      case "auth/too-many-requests":

        mostrarError(
          "Demasiados intentos. Intenta nuevamente más tarde."
        );

        break;


      case "auth/network-request-failed":

        mostrarError(
          "No se pudo conectar. Revisa tu internet."
        );

        break;


      default:

        mostrarError(
          "No se pudo iniciar sesión. Intenta nuevamente."
        );

        break;

    }

  }

});


/* =========================================
   FUNCIÓN PARA MOSTRAR ERRORES
========================================= */

function mostrarError(mensaje) {

  loginMessage.style.color = "#ff6863";

  loginMessage.textContent = mensaje;

}


/* =========================================
   DETECTAR SI YA ESTÁ LOGUEADO
========================================= */

onAuthStateChanged(auth, async (usuario) => {

  if (!usuario) {
    return;
  }

  try {

    const usuarioSnap =
      await getDoc(
        doc(db, "usuarios", usuario.uid)
      );

    if (!usuarioSnap.exists()) {
      return;
    }


    const datos =
      usuarioSnap.data();


    if (datos.activo === false) {
      return;
    }


    /*
      Si el usuario llegó al login desde el QR,
      más adelante aquí podremos regresarlo
      directamente a esa subasta.
    */

  } catch (error) {

    console.error(
      "Error comprobando sesión:",
      error
    );

  }

});
