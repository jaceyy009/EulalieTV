import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtCGAnQMHpJPiBd1c0IFKN1Zvg7LTHqSA",
  authDomain: "eulalietv-83837.firebaseapp.com",
  projectId: "eulalietv-83837",
  storageBucket: "eulalietv-83837.firebasestorage.app",
  messagingSenderId: "1089733463716",
  appId: "1:1089733463716:web:7242c7da1bdf5040e0e031"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export { app, db };
