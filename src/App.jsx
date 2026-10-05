import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Receipt, 
  CheckCircle2, 
  Trash2, 
  History, 
  Share2, 
  ChevronRight, 
  Wallet, 
  PieChart,
  Cloud,
  CloudOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  getStoredDebts, 
  saveStoredDebts, 
  getStoredPayments, 
  saveStoredPayments, 
  formatCurrency, 
  formatDate 
} from './utils/storage';
import { 
  isSupabaseConfigured, 
  fetchDebtsRemote, 
  fetchPaymentsRemote, 
  saveDebtRemote, 
  deleteDebtRemote, 
  savePaymentRemote, 
  deletePaymentRemote,
  subscribeToChanges
} from './utils/supabase';

export default function App() {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'debts' | 'payments' | 'stats'
  const [debts, setDebts] = useState(getStoredDebts);
  const [payments, setPayments] = useState(getStoredPayments);

  // Modals state
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  // Form states
  const [newDebt, setNewDebt] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'General',
    notes: ''
  });

  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Transferencia',
    note: ''
  });

  // Supabase Data Load & Realtime Subscription
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadRemoteData = async () => {
      try {
        const [remoteDebts, remotePayments] = await Promise.all([
          fetchDebtsRemote(),
          fetchPaymentsRemote()
        ]);
        if (remoteDebts) {
          setDebts(remoteDebts);
          saveStoredDebts(remoteDebts);
        }
        if (remotePayments) {
          setPayments(remotePayments);
          saveStoredPayments(remotePayments);
        }
      } catch (err) {
        console.error('Error sincronizando con Supabase:', err);
      }
    };

    loadRemoteData();
    const unsubscribe = subscribeToChanges(() => {
      loadRemoteData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Save changes
  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!newDebt.description || !newDebt.amount) return;
    const item = {
      id: 'd_' + Date.now(),
      description: newDebt.description,
      amount: parseFloat(newDebt.amount),
      date: newDebt.date,
      category: newDebt.category || 'General',
      notes: newDebt.notes || ''
    };

    const updated = [item, ...debts];
    setDebts(updated);
    saveStoredDebts(updated);

    if (isSupabaseConfigured) {
      try {
        await saveDebtRemote(item);
      } catch (err) {
        console.error('Error guardando en Supabase:', err);
      }
    }

    setIsAddDebtOpen(false);
    setNewDebt({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'General',
      notes: ''
    });
  };

  const handleDeleteDebt = async (id) => {
    if (confirm('¿Eliminar este registro?')) {
      const updated = debts.filter(d => d.id !== id);
      setDebts(updated);
      saveStoredDebts(updated);

      if (isSupabaseConfigured) {
        try {
          await deleteDebtRemote(id);
        } catch (err) {
          console.error('Error eliminando en Supabase:', err);
        }
      }
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!newPayment.amount) return;
    const item = {
      id: 'p_' + Date.now(),
      amount: parseFloat(newPayment.amount),
      date: newPayment.date,
      method: newPayment.method || 'Transferencia',
      note: newPayment.note || 'Pago mensual'
    };

    const updated = [item, ...payments];
    setPayments(updated);
    saveStoredPayments(updated);

    if (isSupabaseConfigured) {
      try {
        await savePaymentRemote(item);
      } catch (err) {
        console.error('Error guardando en Supabase:', err);
      }
    }

    setIsAddPaymentOpen(false);
    setNewPayment({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      method: 'Transferencia',
      note: ''
    });

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.7 }
    });
  };

  const handleDeletePayment = async (id) => {
    if (confirm('¿Eliminar este pago?')) {
      const updated = payments.filter(p => p.id !== id);
      setPayments(updated);
      saveStoredPayments(updated);

      if (isSupabaseConfigured) {
        try {
          await deletePaymentRemote(id);
        } catch (err) {
          console.error('Error eliminando en Supabase:', err);
        }
      }
    }
  };

  // Calculations
  const totalBorrowed = debts.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remainingBalance = Math.max(0, totalBorrowed - totalPaid);
  const progressPercentage = totalBorrowed > 0 
    ? Math.min(100, Math.round((totalPaid / totalBorrowed) * 100)) 
    : 100;

  // Share summary as text
  const shareSummary = () => {
    const text = `Resumen Iris Pagos:\n` +
      `• Total Prestado: ${formatCurrency(totalBorrowed)}\n` +
      `• Total Pagado: ${formatCurrency(totalPaid)} (${progressPercentage}%)\n` +
      `• Saldo Restante: ${formatCurrency(remainingBalance)}\n\n` +
      `Detalle: ${debts.length} ítems y ${payments.length} pagos registrados.`;
    
    if (navigator.share) {
      navigator.share({ title: 'Resumen Iris Pagos', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Resumen copiado al portapapeles.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-zinc-900 flex flex-col antialiased">
      {/* Top Header / App Bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-zinc-200/80 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
              IP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                  Iris Pagos
                </h1>
                {isSupabaseConfigured ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium">
                    <Cloud className="w-3 h-3 text-emerald-600" /> Sincronizado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">
                    <CloudOff className="w-3 h-3" /> Modo Local
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 hidden sm:block">Control y seguimiento de préstamos y cuotas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Quick Action Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setIsAddPaymentOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                Registrar Pago
              </button>
              <button
                onClick={() => setIsAddDebtOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-600" />
                Agregar Monto
              </button>
            </div>

            <button 
              onClick={shareSummary}
              className="w-9 h-9 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 shadow-xs flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition active:scale-95 cursor-pointer"
              title="Compartir resumen"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-28 sm:pb-8">
        
        {/* Navigation Tabs (Desktop only, on mobile it uses the bottom fixed bar) */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 bg-zinc-200/60 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'summary' 
                ? 'bg-white text-zinc-900 shadow-xs' 
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'debts' 
                ? 'bg-white text-zinc-900 shadow-xs' 
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Montos Prestados ({debts.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'payments' 
                ? 'bg-white text-zinc-900 shadow-xs' 
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <History className="w-4 h-4" />
            Pagos ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'stats' 
                ? 'bg-white text-zinc-900 shadow-xs' 
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Balance
          </button>
        </div>

        {/* TAB 1: RESUMEN */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Primary Balance Card */}
            <div className="rounded-3xl p-6 sm:p-8 bg-white border border-zinc-200/90 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
                  Saldo Restante a Devolver
                </span>
                <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {progressPercentage}% Devuelto
                </span>
              </div>

              <div>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-900 tracking-tight">
                  {formatCurrency(remainingBalance)}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {remainingBalance === 0 ? '🎉 ¡Deuda completamente saldada!' : `Resta abonar ${formatCurrency(remainingBalance)} a Iris`}
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2 pt-2">
                <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs sm:text-sm text-zinc-500 font-medium">
                  <span>Abonado: <strong className="text-zinc-900">{formatCurrency(totalPaid)}</strong></span>
                  <span>Total Prestado: <strong className="text-zinc-900">{formatCurrency(totalBorrowed)}</strong></span>
                </div>
              </div>

              {/* Acciones principales en móvil (balanceadas) */}
              <div className="grid grid-cols-2 gap-3 pt-2 sm:hidden">
                <button
                  onClick={() => setIsAddPaymentOpen(true)}
                  className="py-3 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                  <span>Registrar Pago</span>
                </button>

                <button
                  onClick={() => setIsAddDebtOpen(true)}
                  className="py-3 px-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-200 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-zinc-600" />
                  <span>Agregar Monto</span>
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200/90 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-500 text-xs sm:text-sm font-medium mb-1">
                    <ArrowUpRight className="w-4 h-4 text-rose-500" />
                    <span>Total Prestado</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
                    {formatCurrency(totalBorrowed)}
                  </p>
                  <span className="text-xs text-zinc-400">{debts.length} conceptos registrados</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                  <Receipt className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200/90 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-500 text-xs sm:text-sm font-medium mb-1">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    <span>Total Abonado</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">
                    {formatCurrency(totalPaid)}
                  </p>
                  <span className="text-xs text-zinc-400">{payments.length} transferencias/pagos</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Listas resumidas en 2 columnas en Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Últimos Pagos */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-600 uppercase tracking-wider">
                    Últimos Pagos Realizados
                  </h3>
                  <button 
                    onClick={() => setActiveTab('payments')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    Ver historial <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {payments.slice(0, 4).map((p) => (
                    <div 
                      key={p.id}
                      className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs flex items-center justify-between hover:border-zinc-300 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{p.note || 'Pago a Iris'}</p>
                          <p className="text-xs text-zinc-500">{formatDate(p.date)} · {p.method}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-600">
                          -{formatCurrency(p.amount)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {payments.length === 0 && (
                    <div className="p-8 text-center rounded-2xl bg-white border border-dashed border-zinc-200">
                      <p className="text-sm text-zinc-400">Aún no registraste pagos.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Montos Prestados */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-600 uppercase tracking-wider">
                    Montos Prestados
                  </h3>
                  <button 
                    onClick={() => setActiveTab('debts')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    Ver todos ({debts.length}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {debts.slice(0, 4).map((d) => (
                    <div 
                      key={d.id}
                      className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs flex items-center justify-between hover:border-zinc-300 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{d.description}</p>
                          <p className="text-xs text-zinc-500">{formatDate(d.date)} · {d.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-zinc-900">
                          +{formatCurrency(d.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DETALLE DE DEUDAS */}
        {activeTab === 'debts' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Montos Prestados por Iris</h2>
                <p className="text-xs sm:text-sm text-zinc-500">Total acumulado: {formatCurrency(totalBorrowed)}</p>
              </div>
              <button
                onClick={() => setIsAddDebtOpen(true)}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Agregar Nuevo Monto
              </button>
            </div>

            {debts.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-zinc-200">
                <p className="text-sm text-zinc-400">No hay montos cargados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {debts.map((item) => (
                  <div 
                    key={item.id}
                    className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-zinc-900">{item.description}</h4>
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium border border-zinc-200/60">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">{formatDate(item.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-extrabold text-zinc-900">{formatCurrency(item.amount)}</p>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 mt-2">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-zinc-100">
                      <button
                        onClick={() => handleDeleteDebt(item.id)}
                        className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HISTORIAL DE PAGOS */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Historial de Pagos Realizados</h2>
                <p className="text-xs sm:text-sm text-zinc-500">Total devuelto hasta hoy: {formatCurrency(totalPaid)}</p>
              </div>
              <button
                onClick={() => setIsAddPaymentOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Registrar Pago
              </button>
            </div>

            {payments.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-zinc-200">
                <p className="text-sm text-zinc-400">No hay pagos registrados aún.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {payments.map((pay) => (
                  <div 
                    key={pay.id}
                    className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{pay.note || 'Pago'}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-zinc-500">{formatDate(pay.date)}</span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                            {pay.method}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold text-emerald-600">-{formatCurrency(pay.amount)}</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-zinc-100">
                      <button
                        onClick={() => handleDeletePayment(pay.id)}
                        className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BALANCE / ESTADÍSTICAS */}
        {activeTab === 'stats' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="p-1 text-center sm:text-left">
              <h2 className="text-lg font-bold text-zinc-900">Estado General de Cuenta</h2>
              <p className="text-xs sm:text-sm text-zinc-500">Balance numérico y porcentaje de devolución</p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-zinc-200/90 shadow-sm space-y-4">
              <div className="flex justify-between text-sm text-zinc-600">
                <span className="font-medium">Progreso total de devolución</span>
                <span className="font-bold text-zinc-900">{progressPercentage}%</span>
              </div>
              <div className="overflow-hidden h-3 rounded-full bg-zinc-100">
                <div
                  style={{ width: `${progressPercentage}%` }}
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-zinc-200/90 shadow-sm space-y-3">
              <div className="flex justify-between py-3 border-b border-zinc-100 text-sm">
                <span className="text-zinc-500">Total Solicitado</span>
                <span className="font-bold text-zinc-900">{formatCurrency(totalBorrowed)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-zinc-100 text-sm">
                <span className="text-zinc-500">Total Reintegrado</span>
                <span className="font-bold text-emerald-600">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between py-3 text-base font-bold">
                <span className="text-zinc-800">Saldo Restante</span>
                <span className="text-xl text-zinc-900">{formatCurrency(remainingBalance)}</span>
              </div>
            </div>

            <button
              onClick={shareSummary}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-sm font-semibold active:scale-95 transition cursor-pointer shadow-xs"
            >
              Copiar Resumen para Enviar a Iris
            </button>
          </div>
        )}

      </main>

      {/* Barra de navegación inferior móvil con el botón "+" perfectamente centrado */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 px-4 py-2 pb-5 sm:hidden shadow-lg">
        <div className="grid grid-cols-5 items-center justify-items-center max-w-md mx-auto">
          {/* Tab 1: Resumen */}
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'summary' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px]">Resumen</span>
          </button>

          {/* Tab 2: Montos */}
          <button
            onClick={() => setActiveTab('debts')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'debts' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px]">Montos</span>
          </button>

          {/* Botón Central "+" para registrar pago (centrado exacto en col 3 de 5) */}
          <div className="flex items-center justify-center -translate-y-3">
            <button
              onClick={() => setIsAddPaymentOpen(true)}
              className="w-13 h-13 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer border-4 border-white"
              title="Registrar Pago"
              aria-label="Registrar Pago"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Tab 3: Pagos */}
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'payments' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px]">Pagos</span>
          </button>

          {/* Tab 4: Balance */}
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'stats' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <PieChart className="w-5 h-5" />
            <span className="text-[10px]">Balance</span>
          </button>
        </div>
      </nav>

      {/* MODAL: AGREGAR MONTO */}
      {isAddDebtOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-900">
                Nuevo Monto de Préstamo
              </h3>
              <button 
                onClick={() => setIsAddDebtOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs px-2 py-1 rounded-lg hover:bg-zinc-100"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-600 font-semibold">Concepto / Motivo</label>
                <input
                  type="text"
                  placeholder="Ej: Efectivo, Farmacia, Repuestos..."
                  value={newDebt.description}
                  onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
                  required
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-600 font-semibold">Monto ($)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={newDebt.amount}
                    onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })}
                    required
                    className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-600 font-semibold">Fecha</label>
                  <input
                    type="date"
                    value={newDebt.date}
                    onChange={(e) => setNewDebt({ ...newDebt, date: e.target.value })}
                    className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-semibold">Categoría</label>
                <select
                  value={newDebt.category}
                  onChange={(e) => setNewDebt({ ...newDebt, category: e.target.value })}
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-500"
                >
                  <option value="General">General / Efectivo</option>
                  <option value="Servicios">Servicios / Facturas</option>
                  <option value="Salud">Salud / Farmacia</option>
                  <option value="Supermercado">Compras / Comida</option>
                  <option value="Vehículo">Auto / Transporte</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-semibold">Detalles o Notas (opcional)</label>
                <input
                  type="text"
                  placeholder="Detalles adicionales..."
                  value={newDebt.notes}
                  onChange={(e) => setNewDebt({ ...newDebt, notes: e.target.value })}
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm rounded-xl active:scale-98 transition cursor-pointer"
                >
                  Guardar Monto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PAGO */}
      {isAddPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-900">
                Registrar Pago Realizado
              </h3>
              <button 
                onClick={() => setIsAddPaymentOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs px-2 py-1 rounded-lg hover:bg-zinc-100"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-600 font-semibold">Monto Pagado ($)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  required
                  autoFocus
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-lg font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-600 font-semibold">Fecha de Pago</label>
                  <input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-600 font-semibold">Medio de Pago</label>
                  <select
                    value={newPayment.method}
                    onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                    className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-semibold">Nota / Detalle</label>
                <input
                  type="text"
                  placeholder="Ej: Cuota de Marzo, Devolución parte 1"
                  value={newPayment.note}
                  onChange={(e) => setNewPayment({ ...newPayment, note: e.target.value })}
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm rounded-xl active:scale-98 transition cursor-pointer"
                >
                  Confirmar y Descontar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
