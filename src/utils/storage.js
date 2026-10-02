// LocalStorage helper for Iris Pagos

const DEBTS_KEY = 'iris_debts_v1';
const PAYMENTS_KEY = 'iris_payments_v1';
const SETTINGS_KEY = 'iris_settings_v1';

export const initialDebts = [
  {
    id: 'd1',
    description: 'Préstamo inicial acordado',
    amount: 150000,
    date: '2026-01-15',
    category: 'Préstamo general',
    notes: 'Primer tramo acordado'
  },
  {
    id: 'd2',
    description: 'Gasto médico / farmacia',
    amount: 35000,
    date: '2026-02-10',
    category: 'Salud',
    notes: 'Medicamentos'
  }
];

export const initialPayments = [
  {
    id: 'p1',
    debtId: 'd1', // opcional o general
    amount: 50000,
    date: '2026-02-05',
    method: 'Transferencia bancaria',
    note: 'Pago cuota febrero'
  }
];

export function getStoredDebts() {
  try {
    const data = localStorage.getItem(DEBTS_KEY);
    return data ? JSON.parse(data) : initialDebts;
  } catch (e) {
    console.error('Error reading debts', e);
    return initialDebts;
  }
}

export function saveStoredDebts(debts) {
  try {
    localStorage.setItem(DEBTS_KEY, JSON.stringify(debts));
  } catch (e) {
    console.error('Error saving debts', e);
  }
}

export function getStoredPayments() {
  try {
    const data = localStorage.getItem(PAYMENTS_KEY);
    return data ? JSON.parse(data) : initialPayments;
  } catch (e) {
    console.error('Error reading payments', e);
    return initialPayments;
  }
}

export function saveStoredPayments(payments) {
  try {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  } catch (e) {
    console.error('Error saving payments', e);
  }
}

export function formatCurrency(amount, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
