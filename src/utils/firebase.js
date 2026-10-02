import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey !== ''
);

let db = null;
if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (err) {
    console.error('Error al inicializar Firebase:', err);
  }
}

export { db };

// Métodos para Préstamos / Deudas
export function subscribeToDebts(onUpdate) {
  if (!db) return () => {};
  const q = query(collection(db, 'debts'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate(items);
  }, (error) => {
    console.error('Error en listener de debts:', error);
  });
}

export async function saveDebtRemote(debt) {
  if (!db) return;
  const docRef = doc(db, 'debts', debt.id);
  await setDoc(docRef, debt, { merge: true });
}

export async function deleteDebtRemote(id) {
  if (!db) return;
  await deleteDoc(doc(db, 'debts', id));
}

// Métodos para Pagos / Abonos
export function subscribeToPayments(onUpdate) {
  if (!db) return () => {};
  const q = query(collection(db, 'payments'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate(items);
  }, (error) => {
    console.error('Error en listener de payments:', error);
  });
}

export async function savePaymentRemote(payment) {
  if (!db) return;
  const docRef = doc(db, 'payments', payment.id);
  await setDoc(docRef, payment, { merge: true });
}

export async function deletePaymentRemote(id) {
  if (!db) return;
  await deleteDoc(doc(db, 'payments', id));
}
