import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const registerForm = document.getElementById("registerForm");
const registerButton = document.getElementById("registerButton");
const registerMessage = document.getElementById("registerMessage");


registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  registerMessage.textContent = "";

  const nombre = document
    .getElementById("nombre")
    .value
    .trim();

  const telefono = document
    .getElementById("telefono")
    .value
    .trim();

  const correo = document
    .getElementById("correo")
    .value
    .trim()
    .toLowerCase();

  const password = document
    .getElementById("password")
    .value;

  const confirmPassword = document
    .getElementById("confirmPassword")
    .value;

  const aceptaTerminos = document
    .getElementById("aceptaTerminos")
    .checked;


  if (!nombre) {
    mostrarError("Ingresa tu nombre completo.");
    return;
  }

  if (!telefono) {
    mostrarError("Ingresa tu teléfono.");
    return;
  }

  if (!correo) {
    mostrarError("Ingresa tu correo electrónico.");
    return;
  }

  if (password.length < 6) {
    mostrarError("La contraseña debe tener mínimo 6 caracteres.");
    return;
  }

  if (password !== confirmPassword) {
    mostrarError("Las contraseñas no coinciden.");
    return;
  }

  if (!aceptaTerminos) {
    mostrarError("Debes aceptar los términos y condiciones.");
    return;
  }


  try {

    registerButton.disabled = true;
    registerButton.textContent = "CREANDO CUENTA...";


    // 1. Crear usuario en Firebase Authentication
    const credencial = await createUserWithEmailAndPassword(
      auth,
      correo,
      password
    );

    const usuario = credencial.user;


    // 2. Guardar el nombre también en Authentication
    await updateProfile(usuario, {
      displayName: nombre
    });


    // 3. Crear perfil del usuario en Firestore
    await setDoc(
      doc(db, "usuarios", usuario.uid),
      {
        uid: usuario.uid,

        nombre: nombre,
        telefono: telefono,
        correo: correo,

        rol: "usuario",

        membresiaActiva: false,
        estadoMembresia: "sin_membresia",
        puedePujar: false,

        activo: true,

        aceptaTerminos: true,

        fechaRegistro: serverTimestamp(),
        ultimaActualizacion: serverTimestamp()
      }
    );


    // 4. Mensaje exitoso
    registerMessage.style.color = "#36d67a";
    registerMessage.textContent =
      "Cuenta creada correctamente. Redirigiendo...";


    // 5. Mandar al usuario al login
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);


  } catch (error) {

    console.error("Error al registrar usuario:", error);

    registerButton.disabled = false;
    registerButton.textContent = "CREAR CUENTA";

    registerMessage.style.color = "#ff6863";

    switch (error.code) {

      case "auth/email-already-in-use":
        registerMessage.textContent =
          "Ese correo ya tiene una cuenta.";
        break;

      case "auth/invalid-email":
        registerMessage.textContent =
          "El correo electrónico no es válido.";
        break;

      case "auth/weak-password":
        registerMessage.textContent =
          "La contraseña es demasiado débil.";
        break;

      case "auth/network-request-failed":
        registerMessage.textContent =
          "No se pudo conectar. Revisa tu internet.";
        break;

      default:
        registerMessage.textContent =
          "No se pudo crear la cuenta. Intenta nuevamente.";
        break;
    }
  }
});


function mostrarError(mensaje) {

  registerMessage.style.color = "#ff6863";
  registerMessage.textContent = mensaje;

  registerButton.disabled = false;
  registerButton.textContent = "CREAR CUENTA";
}
