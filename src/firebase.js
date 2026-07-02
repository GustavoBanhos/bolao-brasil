import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCLEWIDkRSDqY3ou-l0KD5v8vzlk9V3JLI",
  authDomain: "bolaodaadministracao.firebaseapp.com",
  projectId: "bolaodaadministracao",
  storageBucket: "bolaodaadministracao.firebasestorage.app",
  messagingSenderId: "463852185349",
  appId: "1:463852185349:web:7ec241d9b558d118ff396c",
  measurementId: "G-D23ZEPVPFB"
};

export const firebaseReady = FIREBASE_CONFIG.apiKey !== "COLE_SUA_API_KEY";

let app = null;
let auth = null;
let db = null;
let storage = null;

if (firebaseReady) {
  app = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  enableIndexedDbPersistence(db).catch(() => {});
}

export { app, auth, db, storage, onAuthStateChanged };
