import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  BatteryMedium, 
  Signal, 
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
  isFirebaseConfigured, 
  subscribeToDebts, 
  subscribeToPayments, 
  saveDebtRemote, 
  deleteDebtRemote, 
  savePaymentRemote, 
  deletePaymentRemote 
} from './utils/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'debts' | 'payments' | 'stats'
  const [debts, setDebts] = useState(getStoredDebts);
  const [payments, setPayments] = useState(getStoredPayments);
  const [currentTime, setCurrentTime] = useState('');
  const [isCloudSync, setIsCloudSync] = useState(isFirebaseConfigured);

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

  // Clock for iPhone status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Firebase Realtime Subscriptions (Si están configuradas las keys de Firebase)
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubDebts = subscribeToDebts((remoteDebts) => {
      if (remoteDebts) {
        setDebts(remoteDebts);
        saveStoredDebts(remoteDebts);
      }
    });

    const unsubPayments = subscribeToPayments((remotePayments) => {
      if (remotePayments) {
        setPayments(remotePayments);
        saveStoredPayments(remotePayments);
      }
    });

    return () => {
      unsubDebts();
      unsubPayments();
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

    if (isFirebaseConfigured) {
      try {
        await saveDebtRemote(item);
      } catch (err) {
        console.error('Error guardando en Firebase:', err);
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

      if (isFirebaseConfigured) {
        try {
          await deleteDebtRemote(id);
        } catch (err) {
          console.error('Error eliminando en Firebase:', err);
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

    if (isFirebaseConfigured) {
      try {
        await savePaymentRemote(item);
      } catch (err) {
        console.error('Error guardando en Firebase:', err);
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

      if (isFirebaseConfigured) {
        try {
          await deletePaymentRemote(id);
        } catch (err) {
          console.error('Error eliminando en Firebase:', err);
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
    <div className="min-h-screen bg-[#f0f2f5] text-zinc-900 flex justify-center items-center py-0 sm:py-6 antialiased">
      {/* iPhone Device Wrapper */}
      <div className="w-full sm:max-w-[420px] h-[100dvh] sm:h-[880px] bg-[#f8f9fc] sm:rounded-[50px] sm:border-[8px] sm:border-[#d7dae2] sm:shadow-[0_20px_60px_rgba(0,0,0,0.12)] flex flex-col relative overflow-hidden">
        
        {/* iPhone Top Status Bar */}
        <div className="w-full pt-3 px-6 flex justify-between items-center z-40 select-none bg-[#f8f9fc]">
          <span className="text-[14px] font-semibold tracking-tight text-zinc-800">
            {currentTime || '09:41'}
          </span>

          {/* Dynamic Island minimal */}
          <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center shadow-sm">
            <div className="w-2 h-2 rounded-full bg-zinc-900" />
          </div>

          <div className="flex items-center gap-1.5 text-zinc-800">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <BatteryMedium className="w-4 h-4" />
          </div>
        </div>

        {/* Clean Header Bar */}
        <header className="px-5 pt-3 pb-2 flex items-center justify-between z-30 bg-[#f8f9fc]">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold text-zinc-900 tracking-tight">
                Iris Pagos
              </h1>
              {isFirebaseConfigured ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200" title="Firebase activo">
                  <Cloud className="w-3 h-3" /> Nube
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full" title="Modo local (configura Firebase en .env para nube)">
                  <CloudOff className="w-3 h-3" /> Local
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">Control de préstamos y pagos</p>
          </div>

          <button 
            onClick={shareSummary}
            className="w-9 h-9 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200/80 shadow-xs flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition active:scale-95 cursor-pointer"
            title="Compartir resumen"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-2 space-y-3.5">
          
          {/* TAB 1: RESUMEN / HOME */}
          {activeTab === 'summary' && (
            <div className="space-y-3.5">
              {/* Primary Balance Card */}
              <div className="rounded-3xl p-5 bg-white/80 backdrop-blur-xl border border-white/90 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
                    Saldo Restante a Devolver
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {progressPercentage}% Pagado
                  </span>
                </div>

                <div>
                  <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">
                    {formatCurrency(remainingBalance)}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {remainingBalance === 0 ? '¡Deuda saldada!' : `Resta abonar ${formatCurrency(remainingBalance)}`}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-500 font-medium">
                    <span>Abonado: {formatCurrency(totalPaid)}</span>
                    <span>Total: {formatCurrency(totalBorrowed)}</span>
                  </div>
                </div>

                {/* Acciones principales centradas y equilibradas */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={() => setIsAddPaymentOpen(true)}
                    className="py-2.5 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Registrar Pago</span>
                  </button>

                  <button
                    onClick={() => setIsAddDebtOpen(true)}
                    className="py-2.5 px-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium text-xs flex items-center justify-center gap-1.5 border border-zinc-200/60 active:scale-95 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Agregar Monto</span>
                  </button>
                </div>
              </div>

              {/* Summary Metrics Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white shadow-xs">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium mb-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                    <span>Total Prestado</span>
                  </div>
                  <p className="text-lg font-bold text-zinc-900 tracking-tight">
                    {formatCurrency(totalBorrowed)}
                  </p>
                  <span className="text-[10px] text-zinc-400">{debts.length} conceptos</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white shadow-xs">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium mb-1">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Total Pagado</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-600 tracking-tight">
                    {formatCurrency(totalPaid)}
                  </p>
                  <span className="text-[10px] text-zinc-400">{payments.length} abonos</span>
                </div>
              </div>

              {/* Últimos Pagos Preview */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Últimos Pagos
                  </h3>
                  <button 
                    onClick={() => setActiveTab('payments')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5 cursor-pointer"
                  >
                    Ver historial <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {payments.slice(0, 3).map((p) => (
                    <div 
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-white/80 border border-white/90 shadow-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-800">{p.note || 'Pago a Iris'}</p>
                          <p className="text-[10px] text-zinc-400">{formatDate(p.date)} · {p.method}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-600">
                          -{formatCurrency(p.amount)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {payments.length === 0 && (
                    <div className="p-5 text-center rounded-2xl bg-white/50 border border-dashed border-zinc-200">
                      <p className="text-xs text-zinc-400">Aún no registraste pagos.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Montos Prestados Preview */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Montos Prestados
                  </h3>
                  <button 
                    onClick={() => setActiveTab('debts')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5 cursor-pointer"
                  >
                    Ver todos ({debts.length}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {debts.slice(0, 3).map((d) => (
                    <div 
                      key={d.id}
                      className="p-3.5 rounded-2xl bg-white/80 border border-white/90 shadow-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-800">{d.description}</p>
                          <p className="text-[10px] text-zinc-400">{formatDate(d.date)} · {d.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-zinc-900">
                          +{formatCurrency(d.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETALLE DE DEUDAS */}
          {activeTab === 'debts' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">Montos Prestados</h2>
                  <p className="text-[11px] text-zinc-500">Total: {formatCurrency(totalBorrowed)}</p>
                </div>
                <button
                  onClick={() => setIsAddDebtOpen(true)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium flex items-center gap-1 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>

              {debts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white/50 border border-dashed border-zinc-200">
                  <p className="text-xs text-zinc-400">No hay montos cargados.</p>
                </div>
              ) : (
                debts.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-xs space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-zinc-900">{item.description}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{formatDate(item.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-zinc-900">{formatCurrency(item.amount)}</p>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-zinc-500 bg-zinc-50 p-2 rounded-xl">
                        {item.notes}
                      </p>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleDeleteDebt(item.id)}
                        className="text-[11px] text-rose-500 hover:text-rose-600 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: HISTORIAL DE PAGOS */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">Historial de Pagos</h2>
                  <p className="text-[11px] text-zinc-500">Total devuelto: {formatCurrency(totalPaid)}</p>
                </div>
                <button
                  onClick={() => setIsAddPaymentOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center gap-1 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar Pago
                </button>
              </div>

              {payments.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white/50 border border-dashed border-zinc-200">
                  <p className="text-xs text-zinc-400">No hay pagos registrados aún.</p>
                </div>
              ) : (
                payments.map((pay) => (
                  <div 
                    key={pay.id}
                    className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-xs space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">{pay.note || 'Pago'}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-zinc-400">{formatDate(pay.date)}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                            {pay.method}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">-{formatCurrency(pay.amount)}</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleDeletePayment(pay.id)}
                        className="text-[11px] text-rose-500 hover:text-rose-600 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: ESTADÍSTICAS */}
          {activeTab === 'stats' && (
            <div className="space-y-3">
              <div className="px-1">
                <h2 className="text-sm font-bold text-zinc-900">Estado de Cuenta</h2>
                <p className="text-[11px] text-zinc-500">Balance general</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-xs space-y-3">
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>Progreso de devolución</span>
                  <span className="font-bold text-zinc-900">{progressPercentage}%</span>
                </div>
                <div className="overflow-hidden h-2.5 rounded-full bg-zinc-100">
                  <div
                    style={{ width: `${progressPercentage}%` }}
                    className="h-full bg-emerald-500 transition-all duration-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-xs space-y-2">
                <div className="flex justify-between py-2 border-b border-zinc-100 text-xs">
                  <span className="text-zinc-500">Total Solicitado</span>
                  <span className="font-semibold text-zinc-900">{formatCurrency(totalBorrowed)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100 text-xs">
                  <span className="text-zinc-500">Total Reintegrado</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between py-2 text-xs font-bold">
                  <span className="text-zinc-800">Saldo Restante</span>
                  <span className="text-sm text-zinc-900">{formatCurrency(remainingBalance)}</span>
                </div>
              </div>

              <button
                onClick={shareSummary}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold active:scale-95 transition cursor-pointer shadow-xs"
              >
                Copiar Resumen para Enviar
              </button>
            </div>
          )}

        </main>

        {/* iPhone Bottom Navigation Bar (Centered layout, clean light style) */}
        <nav className="absolute bottom-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-2xl border-t border-zinc-200/80 px-6 py-2 pb-6 flex justify-around items-center">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'summary' ? 'text-zinc-900 font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px]">Resumen</span>
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'debts' ? 'text-zinc-900 font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px]">Montos</span>
          </button>

          {/* Botón central perfectamente alineado y centrado */}
          <div className="flex items-center justify-center -mt-5">
            <button
              onClick={() => setIsAddPaymentOpen(true)}
              className="w-12 h-12 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center shadow-md active:scale-90 transition cursor-pointer border-4 border-[#f8f9fc]"
              title="Registrar Pago"
              aria-label="Registrar Pago"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'payments' ? 'text-zinc-900 font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px]">Pagos</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center gap-1 transition ${activeTab === 'stats' ? 'text-zinc-900 font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <PieChart className="w-5 h-5" />
            <span className="text-[10px]">Balance</span>
          </button>
        </nav>

        {/* iPhone Home Indicator bar */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-300 rounded-full z-50 pointer-events-none" />

      </div>

      {/* MODAL: AGREGAR MONTO */}
      {isAddDebtOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full sm:max-w-md bg-white border-t sm:border border-zinc-200 rounded-t-[28px] sm:rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto sm:hidden mb-1" />
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-zinc-900">
                Nuevo Monto de Préstamo
              </h3>
              <button 
                onClick={() => setIsAddDebtOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs px-2 py-1"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-500 font-medium">Concepto / Motivo</label>
                <input
                  type="text"
                  placeholder="Ej: Efectivo, Farmacia, Repuestos..."
                  value={newDebt.description}
                  onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
                  required
                  className="w-full mt-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-zinc-500 font-medium">Monto ($)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={newDebt.amount}
                    onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })}
                    required
                    className="w-full mt-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500 font-medium">Fecha</label>
                  <input
                    type="date"
                    value={newDebt.date}
                    onChange={(e) => setNewDebt({ ...newDebt, date: e.target.value })}
                    className="w-full mt-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 font-medium">Categoría</label>
                <select
                  value={newDebt.category}
                  onChange={(e) => setNewDebt({ ...newDebt, category: e.target.value })}
                  className="w-full mt-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
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
                <label className="text-[11px] text-zinc-500 font-medium">Detalles o Notas (opcional)</label>
                <input
                  type="text"
                  placeholder="Detalles adicionales..."
                  value={newDebt.notes}
                  onChange={(e) => setNewDebt({ ...newDebt, notes: e.target.value })}
                  className="w-full mt-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs rounded-xl active:scale-98 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full sm:max-w-md bg-white border-t sm:border border-zinc-200 rounded-t-[28px] sm:rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto sm:hidden mb-1" />
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-zinc-900">
                Registrar Pago Realizado
              </h3>
              <button 
                onClick={() => setIsAddPaymentOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs px-2 py-1"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-500 font-medium">Monto Pagado ($)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  required
                  autoFocus
                  className="w-full mt-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-base font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-zinc-500 font-medium">Fecha de Pago</label>
                  <input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="w-full mt-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500 font-medium">Medio de Pago</label>
                  <select
                    value={newPayment.method}
                    onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                    className="w-full mt-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 font-medium">Nota / Detalle</label>
                <input
                  type="text"
                  placeholder="Ej: Cuota de Marzo, Devolución parte 1"
                  value={newPayment.note}
                  onChange={(e) => setNewPayment({ ...newPayment, note: e.target.value })}
                  className="w-full mt-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs rounded-xl active:scale-98 transition cursor-pointer"
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
