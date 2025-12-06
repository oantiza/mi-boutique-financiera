// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- PEGA AQUÍ TUS CLAVES DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDqYHyw9l7wuZCDFCMk_df009uSOhqpqzI",
  authDomain: "boutique-financiera-app.firebaseapp.com",
  projectId: "boutique-financiera-app",
  storageBucket: "boutique-financiera-app.firebasestorage.app",
  messagingSenderId: "222571155132",
  appId: "1:222571155132:web:d31845009e728ac1fa4ab9",
  measurementId: "G-3G2N3LCYCB",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
