import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, firebaseReady } from "./firebase.js";
import { requireAdmin } from "./auth.js";
import { normalizePhone } from "./utils.js";

const STORAGE_KEY = "bolaoInteligenteDemo";

const seed = {
  notifications: [
    { id: "n1", message: "Novo jogo cadastrado.", createdAt: new Date().toISOString() },
    { id: "n2", message: "Resultado atualizado em tempo real.", createdAt: new Date().toISOString() }
  ],
  games: [
    {
      id: "demo-brasil-noruega",
      teamHome: "Brasil",
      teamAway: "Noruega",
      date: "2026-07-15",
      time: "20:30",
      location: "Arena Nacional",
      betValue: 10,
      prizePercent: 85,
      pixKey: "pix@bolao-inteligente.com",
      pixPayload: "00020126580014br.gov.bcb.pix0136pix@bolao-inteligente.com520400005303986540510.005802BR5923Bolao da Administracao6009Sao Paulo62070503***6304ABCD",
      championship: "Copa Internacional",
      imageUrl: "",
      isOpen: true,
      active: true,
      currentHomeScore: 0,
      currentAwayScore: 0,
      matchStatus: "Pré-jogo",
      matchMinute: "00:00",
      createdAt: new Date().toISOString()
    }
  ],
  bets: [
    {
      id: "b1",
      gameId: "demo-brasil-noruega",
      name: "Ana Souza",
      phone: "11999990001",
      environment: "Financeiro",
      homeScore: 2,
      awayScore: 1,
      notes: "",
      paymentStatus: "paid",
      createdAt: new Date().toISOString()
    },
    {
      id: "b2",
      gameId: "demo-brasil-noruega",
      name: "Bruno Lima",
      phone: "11999990002",
      environment: "Operação",
      homeScore: 1,
      awayScore: 0,
      notes: "",
      paymentStatus: "paid",
      createdAt: new Date().toISOString()
    },
    {
      id: "b3",
      gameId: "demo-brasil-noruega",
      name: "Carla Nunes",
      phone: "11999990003",
      environment: "Comercial",
      homeScore: 2,
      awayScore: 1,
      notes: "",
      paymentStatus: "pending",
      createdAt: new Date().toISOString()
    }
  ]
};

function readLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return structuredClone(seed);
  }
  return JSON.parse(raw);
}

function writeLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("bolao:data"));
}

function localUnsubscribe() {
  return () => {};
}

export async function getActiveGame() {
  if (firebaseReady) {
    const snap = await getDocs(query(collection(db, "games"), where("active", "==", true)));
    const first = snap.docs[0];
    return first ? { id: first.id, ...first.data() } : null;
  }

  return readLocal().games.find((game) => game.active) || readLocal().games[0] || null;
}

export async function listBets(gameId) {
  if (firebaseReady) {
    try {
      const snap = await getDocs(query(collection(db, "bets"), where("gameId", "==", gameId)));
      return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (error) {
      console.warn("Sem permissão para listar palpites.", error);
      return [];
    }
  }

  return readLocal().bets.filter((bet) => bet.gameId === gameId);
}

export async function saveGame(game) {
  await requireAdmin();
  const payload = {
    ...game,
    betValue: Number(game.betValue || 0),
    prizePercent: Number(game.prizePercent || 85),
    currentHomeScore: Number(game.currentHomeScore || 0),
    currentAwayScore: Number(game.currentAwayScore || 0),
    matchStatus: game.matchStatus || "Pré-jogo",
    matchMinute: game.matchMinute || "00:00",
    updatedAt: firebaseReady ? serverTimestamp() : new Date().toISOString()
  };

  if (firebaseReady) {
    const id = payload.id || crypto.randomUUID();
    delete payload.id;
    await setDoc(doc(db, "games", id), payload, { merge: true });
    await notify("Novo jogo cadastrado.");
    return { id, ...payload };
  }

  const data = readLocal();
  const id = payload.id || crypto.randomUUID();
  const existing = data.games.findIndex((item) => item.id === id);
  const nextGame = { ...payload, id };
  if (payload.active) data.games = data.games.map((item) => ({ ...item, active: false }));
  if (existing >= 0) data.games[existing] = nextGame;
  else data.games.push(nextGame);
  data.notifications.unshift({ id: crypto.randomUUID(), message: "Novo jogo cadastrado.", createdAt: new Date().toISOString() });
  writeLocal(data);
  return nextGame;
}

export async function deleteGame(gameId) {
  await requireAdmin();
  if (firebaseReady) {
    await deleteDoc(doc(db, "games", gameId));
    return;
  }

  const data = readLocal();
  data.games = data.games.filter((game) => game.id !== gameId);
  data.bets = data.bets.filter((bet) => bet.gameId !== gameId);
  writeLocal(data);
}

export async function createBet(game, bet) {
  const phone = normalizePhone(bet.phone);
  const payload = {
    gameId: game.id,
    name: bet.name.trim(),
    phone,
    environment: bet.environment.trim(),
    homeScore: Number(bet.homeScore),
    awayScore: Number(bet.awayScore),
    notes: bet.notes?.trim() || "",
    paymentStatus: "pending",
    status: "Aguardando",
    createdAt: firebaseReady ? serverTimestamp() : new Date().toISOString()
  };

  if (firebaseReady) {
    const ref = await addDoc(collection(db, "bets"), payload);
    return { id: ref.id, ...payload };
  }

  const data = readLocal();
  const item = { id: crypto.randomUUID(), ...payload };
  data.bets.push(item);
  writeLocal(data);
  return item;
}

export async function updateBetPayment(betId, status) {
  await requireAdmin();
  const participantStatus = status === "paid" ? "Participando" : "Aguardando";
  if (firebaseReady) {
    await updateDoc(doc(db, "bets", betId), { paymentStatus: status, status: participantStatus, paidAt: serverTimestamp() });
    if (status === "paid") await notify("Pagamento confirmado.");
    return;
  }

  const data = readLocal();
  data.bets = data.bets.map((bet) => (bet.id === betId ? { ...bet, paymentStatus: status, status: participantStatus, paidAt: new Date().toISOString() } : bet));
  if (status === "paid") data.notifications.unshift({ id: crypto.randomUUID(), message: "Pagamento confirmado.", createdAt: new Date().toISOString() });
  writeLocal(data);
}

export async function deleteBet(betId) {
  await requireAdmin();
  if (firebaseReady) {
    await deleteDoc(doc(db, "bets", betId));
    return;
  }

  const data = readLocal();
  data.bets = data.bets.filter((bet) => bet.id !== betId);
  writeLocal(data);
}

export async function updateScore(gameId, patch) {
  await requireAdmin();
  const payload = { ...patch, updatedAt: firebaseReady ? serverTimestamp() : new Date().toISOString() };
  if (firebaseReady) {
    await updateDoc(doc(db, "games", gameId), payload);
    await notify("Resultado atualizado.");
    return;
  }

  const data = readLocal();
  data.games = data.games.map((game) => (game.id === gameId ? { ...game, ...payload } : game));
  data.notifications.unshift({ id: crypto.randomUUID(), message: "Resultado atualizado.", createdAt: new Date().toISOString() });
  writeLocal(data);
}

export function listenGame(gameId, callback) {
  if (firebaseReady && gameId) {
    return onSnapshot(doc(db, "games", gameId), (snap) => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    });
  }

  const handler = async () => callback(await getActiveGame());
  window.addEventListener("bolao:data", handler);
  handler();
  return () => window.removeEventListener("bolao:data", handler);
}

export function listenBets(gameId, callback) {
  if (firebaseReady && gameId) {
    return onSnapshot(query(collection(db, "bets"), where("gameId", "==", gameId)), (snap) => {
      callback(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, (error) => {
      console.warn("Sem permissão para acompanhar palpites.", error);
      callback([]);
    });
  }

  const handler = async () => callback(await listBets(gameId));
  window.addEventListener("bolao:data", handler);
  handler();
  return () => window.removeEventListener("bolao:data", handler);
}

export function listenNotifications(callback) {
  if (firebaseReady) {
    return onSnapshot(query(collection(db, "notifications"), orderBy("createdAt", "desc")), (snap) => {
      callback(snap.docs.slice(0, 6).map((item) => ({ id: item.id, ...item.data() })));
    });
  }

  const handler = () => callback(readLocal().notifications.slice(0, 6));
  window.addEventListener("bolao:data", handler);
  handler();
  return localUnsubscribe();
}

export async function notify(message) {
  await requireAdmin();
  if (firebaseReady) {
    await addDoc(collection(db, "notifications"), { message, createdAt: serverTimestamp() });
    return;
  }

  const data = readLocal();
  data.notifications.unshift({ id: crypto.randomUUID(), message, createdAt: new Date().toISOString() });
  writeLocal(data);
}
