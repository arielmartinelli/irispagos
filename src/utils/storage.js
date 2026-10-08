// LocalStorage helper for Iris Pagos

const DEBTS_KEY = 'iris_debts_v1';
const PAYMENTS_KEY = 'iris_payments_v1';
const PERSONS_KEY = 'iris_persons_v1';
const SETTINGS_KEY = 'iris_settings_v1';

export const initialPersons = [
  'Iris'
];

export const initialDebts = [
  {
    id: 'd1',
    person: 'Iris',
    description: 'Préstamo inicial acordado',
    amount: 150000,
    date: '2026-01-15',
    category: 'Préstamo general',
    notes: 'Primer tramo acordado',
    created_at: new Date('2026-01-15T12:00:00Z').toISOString(),
    updated_at: null,
    edit_count: 0
  },
  {
    id: 'd2',
    person: 'Iris',
    description: 'Gasto médico / farmacia',
    amount: 35000,
    date: '2026-02-10',
    category: 'Salud',
    notes: 'Medicamentos',
    created_at: new Date('2026-02-10T12:00:00Z').toISOString(),
    updated_at: null,
    edit_count: 0
  }
];

export const initialPayments = [
  {
    id: 'p1',
    person: 'Iris',
    debtId: 'd1',
    amount: 50000,
    date: '2026-02-05',
    method: 'Transferencia bancaria',
    note: 'Pago cuota febrero',
    created_at: new Date('2026-02-05T12:00:00Z').toISOString(),
    updated_at: null,
    edit_count: 0
  }
];

export function getStoredPersons() {
  try {
    const data = localStorage.getItem(PERSONS_KEY);
    return data ? JSON.parse(data) : initialPersons;
  } catch (e) {
    console.error('Error reading persons', e);
    return initialPersons;
  }
}

export function saveStoredPersons(persons) {
  try {
    localStorage.setItem(PERSONS_KEY, JSON.stringify(persons));
  } catch (e) {
    console.error('Error saving persons', e);
  }
}

export function getStoredDebts() {
  try {
    const data = localStorage.getItem(DEBTS_KEY);
    const parsed = data ? JSON.parse(data) : initialDebts;
    // Asegurar que cada deuda tenga person (por defecto Iris si no tiene)
    return parsed.map(d => ({ ...d, person: d.person || 'Iris' }));
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
    const parsed = data ? JSON.parse(data) : initialPayments;
    // Asegurar que cada pago tenga person (por defecto Iris si no tiene)
    return parsed.map(p => ({ ...p, person: p.person || 'Iris' }));
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
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;
  return date.toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
