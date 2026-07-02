import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth, firebaseReady, onAuthStateChanged } from "./firebase.js";

export const ADMIN_EMAIL = "gustavoitalo1224@gmail.com";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isAdminUser(user) {
  return normalizeEmail(user?.email) === ADMIN_EMAIL;
}

export function getCurrentUser() {
  return new Promise((resolve) => {
    if (!firebaseReady || !auth) {
      resolve(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function loginAdmin(email, password) {
  if (!firebaseReady || !auth) {
    throw new Error("Firebase não configurado. Preencha src/firebase.js antes de usar o painel administrativo.");
  }

  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  if (!isAdminUser(credential.user)) {
    await signOut(auth);
    throw new Error("Este e-mail não tem permissão para acessar o painel administrativo.");
  }

  return credential.user;
}

export async function logoutAdmin() {
  if (firebaseReady && auth) {
    await signOut(auth);
  }
  window.location.href = "login.html";
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    throw new Error("Ação permitida apenas para o administrador autenticado.");
  }
  return user;
}

export async function ensureAdminAccess() {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    window.location.replace("login.html");
    return null;
  }
  return user;
}

export function watchAdminAuth(callback) {
  if (!firebaseReady || !auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => callback(isAdminUser(user) ? user : null));
}

export async function redirectAdminIfLogged() {
  const user = await getCurrentUser();
  if (isAdminUser(user)) {
    window.location.replace("admin.html");
  }
}
