import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== '' && 
  supabaseAnonKey !== ''
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==========================================
// MÉTODOS PARA PRÉSTAMOS / DEUDAS (debts)
// ==========================================

export async function fetchDebtsRemote() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching debts from Supabase:', error);
    return [];
  }
  return data || [];
}

export async function saveDebtRemote(debt) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('debts')
    .upsert({
      id: debt.id,
      description: debt.description,
      amount: debt.amount,
      date: debt.date,
      category: debt.category,
      notes: debt.notes
    })
    .select();

  if (error) {
    console.error('Error saving debt to Supabase:', error);
    throw error;
  }
  return data;
}

export async function deleteDebtRemote(id) {
  if (!supabase) return;
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting debt in Supabase:', error);
    throw error;
  }
}

// ==========================================
// MÉTODOS PARA PAGOS / ABONOS (payments)
// ==========================================

export async function fetchPaymentsRemote() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching payments from Supabase:', error);
    return [];
  }
  return data || [];
}

export async function savePaymentRemote(payment) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('payments')
    .upsert({
      id: payment.id,
      amount: payment.amount,
      date: payment.date,
      method: payment.method,
      note: payment.note
    })
    .select();

  if (error) {
    console.error('Error saving payment to Supabase:', error);
    throw error;
  }
  return data;
}

export async function deletePaymentRemote(id) {
  if (!supabase) return;
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting payment in Supabase:', error);
    throw error;
  }
}

// Suscripción en tiempo real
export function subscribeToChanges(onUpdate) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, () => {
      onUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
      onUpdate();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
