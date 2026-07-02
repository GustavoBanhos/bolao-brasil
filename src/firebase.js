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
  apiKey: "COLE_SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
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
