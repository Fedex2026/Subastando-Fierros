import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDFgD68pJ97orxJIFqgiyfItE3hCZpD84c",
    authDomain: "subastando-fierros.firebaseapp.com",
    projectId: "subastando-fierros",
    storageBucket: "subastando-fierros.firebasestorage.app",
    messagingSenderId: "808911293811",
    appId: "1:808911293811:web:0e44f5fdc9e6e497fd0906",
    measurementId: "G-FTVHCBBM0N"
  };


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
