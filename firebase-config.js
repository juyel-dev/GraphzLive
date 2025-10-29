// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA84Ty4SNDuLMKzeHX1pJMUgjoFZ89nbRE",
  authDomain: "graphzlive.firebaseapp.com",
  projectId: "graphzlive",
  storageBucket: "graphzlive.firebasestorage.app",
  messagingSenderId: "521947472086",
  appId: "1:521947472086:web:b7795552c40bb58b0b2977",
  measurementId: "G-WBCGC9EMRX"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
