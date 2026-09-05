import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyCX-OK-xJiAd_Wr7l8Jcwrl7840Q6l-2B4",
    authDomain: "subastando-fierros-b5871.firebaseapp.com",
    projectId: "subastando-fierros-b5871",
    storageBucket: "subastando-fierros-b5871.firebasestorage.app",
    messagingSenderId: "6542922681",
    appId: "1:6542922681:web:881697e0a6a38f312e1c68"
  };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
