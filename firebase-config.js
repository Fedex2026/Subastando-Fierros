import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDyoPXvvNGcSCUv4UMmeI6C0T0-zXhz3HM",
    authDomain: "subastandofierros.firebaseapp.com",
    projectId: "subastandofierros",
    storageBucket: "subastandofierros.firebasestorage.app",
    messagingSenderId: "95885337399",
    appId: "1:95885337399:web:1d8d3c7fbc0dfecc15f0b2"
  };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
