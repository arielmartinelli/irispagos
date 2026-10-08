import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Receipt, 
  CheckCircle2, 
  Trash2, 
  Edit3,
  History, 
  Share2, 
  ChevronRight, 
  Wallet, 
  PieChart,
  Cloud,
  CloudOff,
  Clock,
  AlertCircle,
  Lock,
  UserPlus,
  Users,
  User,
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  getStoredDebts, 
  saveStoredDebts, 
  getStoredPayments, 
  saveStoredPayments, 
  getStoredPersons,
  saveStoredPersons,
  formatCurrency, 
  formatDate,
  formatDateTime
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
  const [persons, setPersons] = useState(getStoredPersons);

  // Filtro de persona: 'ALL' para ver el total de todos, o el nombre de la persona (ej: 'Iris', 'Juan')
  const [selectedPerson, setSelectedPerson] = useState('ALL');

  // Modals state: Crear
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);

  // Modals state: Editar (1 sola vez permitido)
  const [editingDebt, setEditingDebt] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);

  // Form states: Nueva Persona
  const [newPersonName, setNewPersonName] = useState('');

  // Form states: Crear Préstamo
  const [newDebt, setNewDebt] = useState({
    person: 'Iris',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'General',
    notes: ''
  });

  // Form states: Crear Pago
  const [newPayment, setNewPayment] = useState({
    person: 'Iris',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Transferencia',
    note: ''
  });

  // Form states: Editar Préstamo
  const [editDebtForm, setEditDebtForm] = useState({
    person: 'Iris',
    amount: '',
    description: '',
    category: '',
    notes: ''
  });

  // Form states: Editar Pago
  const [editPaymentForm, setEditPaymentForm] = useState({
    person: 'Iris',
    amount: '',
    note: '',
    method: ''
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
        if (remoteDebts && remoteDebts.length > 0) {
          setDebts(remoteDebts);
          saveStoredDebts(remoteDebts);

          // Extraer personas que existan en la base de datos
          const remotePersons = Array.from(new Set([
            ...persons,
            ...remoteDebts.map(d => d.person || 'Iris'),
            ...remotePayments.map(p => p.person || 'Iris')
          ])).filter(Boolean);
          setPersons(remotePersons);
          saveStoredPersons(remotePersons);
        }
        if (remotePayments && remotePayments.length > 0) {
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

  // Agregar nueva persona
  const handleAddPerson = (e) => {
    e.preventDefault();
    const trimmed = newPersonName.trim();
    if (!trimmed) return;
    if (persons.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      alert('Esta persona ya existe en la lista.');
      return;
    }
    const updated = [...persons, trimmed];
    setPersons(updated);
    saveStoredPersons(updated);
    setSelectedPerson(trimmed);
    setNewPersonName('');
    setIsAddPersonOpen(false);
  };

  // Agregar nuevo préstamo
  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!newDebt.description || !newDebt.amount) return;
    const nowIso = new Date().toISOString();
    const targetPerson = newDebt.person || (selectedPerson !== 'ALL' ? selectedPerson : persons[0] || 'Iris');
    const item = {
      id: 'd_' + Date.now(),
      person: targetPerson,
      description: newDebt.description,
      amount: parseFloat(newDebt.amount),
      date: newDebt.date,
      category: newDebt.category || 'General',
      notes: newDebt.notes || '',
      created_at: nowIso,
      updated_at: null,
      edit_count: 0
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
      person: targetPerson,
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'General',
      notes: ''
    });
  };

  // Abrir modal de edición de préstamo
  const openEditDebtModal = (debt) => {
    if ((debt.edit_count || 0) >= 1) {
      alert('Este monto ya fue modificado una vez. No se permiten más modificaciones.');
      return;
    }
    setEditingDebt(debt);
    setEditDebtForm({
      person: debt.person || 'Iris',
      amount: debt.amount,
      description: debt.description,
      category: debt.category || 'General',
      notes: debt.notes || ''
    });
  };

  // Guardar edición de préstamo (consume el único intento)
  const handleSaveEditDebt = async (e) => {
    e.preventDefault();
    if (!editingDebt || !editDebtForm.amount) return;

    const nowIso = new Date().toISOString();
    const updatedItem = {
      ...editingDebt,
      person: editDebtForm.person || editingDebt.person || 'Iris',
      amount: parseFloat(editDebtForm.amount),
      description: editDebtForm.description,
      category: editDebtForm.category,
      notes: editDebtForm.notes,
      updated_at: nowIso,
      edit_count: (editingDebt.edit_count || 0) + 1
    };

    const updated = debts.map(d => d.id === editingDebt.id ? updatedItem : d);
    setDebts(updated);
    saveStoredDebts(updated);

    if (isSupabaseConfigured) {
      try {
        await saveDebtRemote(updatedItem);
      } catch (err) {
        console.error('Error actualizando en Supabase:', err);
      }
    }

    setEditingDebt(null);
  };

  const handleDeleteDebt = async (id) => {
    if (confirm('¿Eliminar este registro de deuda?')) {
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

  // Agregar nuevo pago
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!newPayment.amount) return;
    const nowIso = new Date().toISOString();
    const targetPerson = newPayment.person || (selectedPerson !== 'ALL' ? selectedPerson : persons[0] || 'Iris');
    const item = {
      id: 'p_' + Date.now(),
      person: targetPerson,
      amount: parseFloat(newPayment.amount),
      date: newPayment.date,
      method: newPayment.method || 'Transferencia',
      note: newPayment.note || 'Pago mensual',
      created_at: nowIso,
      updated_at: null,
      edit_count: 0
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
      person: targetPerson,
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

  // Abrir modal de edición de pago
  const openEditPaymentModal = (payment) => {
    if ((payment.edit_count || 0) >= 1) {
      alert('Este pago ya fue modificado una vez. No se permiten más modificaciones.');
      return;
    }
    setEditingPayment(payment);
    setEditPaymentForm({
      person: payment.person || 'Iris',
      amount: payment.amount,
      note: payment.note || '',
      method: payment.method || 'Transferencia'
    });
  };

  // Guardar edición de pago (consume el único intento)
  const handleSaveEditPayment = async (e) => {
    e.preventDefault();
    if (!editingPayment || !editPaymentForm.amount) return;

    const nowIso = new Date().toISOString();
    const updatedItem = {
      ...editingPayment,
      person: editPaymentForm.person || editingPayment.person || 'Iris',
      amount: parseFloat(editPaymentForm.amount),
      note: editPaymentForm.note,
      method: editPaymentForm.method,
      updated_at: nowIso,
      edit_count: (editingPayment.edit_count || 0) + 1
    };

    const updated = payments.map(p => p.id === editingPayment.id ? updatedItem : p);
    setPayments(updated);
    saveStoredPayments(updated);

    if (isSupabaseConfigured) {
      try {
        await savePaymentRemote(updatedItem);
      } catch (err) {
        console.error('Error actualizando pago en Supabase:', err);
      }
    }

    setEditingPayment(null);
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

  // ========================================================
  // CÁLCULOS GLOBALES (TOTAL DE TODOS) Y POR PERSONA FILTRADA
  // ========================================================

  // 1. Total Global (Suma de todas las personas)
  const grandTotalBorrowed = debts.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const grandTotalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const grandRemainingBalance = Math.max(0, grandTotalBorrowed - grandTotalPaid);
  const grandProgressPercentage = grandTotalBorrowed > 0 
    ? Math.min(100, Math.round((grandTotalPaid / grandTotalBorrowed) * 100)) 
    : 100;

  // 2. Filtrado según la persona seleccionada
  const isAll = selectedPerson === 'ALL';
  const displayedDebts = isAll 
    ? debts 
    : debts.filter(d => (d.person || 'Iris').toLowerCase() === selectedPerson.toLowerCase());

  const displayedPayments = isAll 
    ? payments 
    : payments.filter(p => (p.person || 'Iris').toLowerCase() === selectedPerson.toLowerCase());

  // 3. Totales de la vista actual (o de la persona seleccionada)
  const currentTotalBorrowed = displayedDebts.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const currentTotalPaid = displayedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const currentRemainingBalance = Math.max(0, currentTotalBorrowed - currentTotalPaid);
  const currentProgressPercentage = currentTotalBorrowed > 0 
    ? Math.min(100, Math.round((currentTotalPaid / currentTotalBorrowed) * 100)) 
    : 100;

  // 4. Desglose detallado por persona
  const personsBreakdown = persons.map(personName => {
    const pDebts = debts.filter(d => (d.person || 'Iris').toLowerCase() === personName.toLowerCase());
    const pPayments = payments.filter(p => (p.person || 'Iris').toLowerCase() === personName.toLowerCase());
    const borrowed = pDebts.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const paid = pPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remaining = Math.max(0, borrowed - paid);
    const progress = borrowed > 0 ? Math.min(100, Math.round((paid / borrowed) * 100)) : 100;
    return {
      name: personName,
      borrowed,
      paid,
      remaining,
      progress,
      debtsCount: pDebts.length,
      paymentsCount: pPayments.length
    };
  });

  // Compartir resumen por WhatsApp
  const shareSummary = () => {
    let text = '';
    if (isAll) {
      text = `📊 *Resumen General de Deudas*\n\n` +
        `• *TOTAL GENERAL PENDIENTE:* ${formatCurrency(grandRemainingBalance)}\n` +
        `• Total Prestado (Todos): ${formatCurrency(grandTotalBorrowed)}\n` +
        `• Total Pagado (Todos): ${formatCurrency(grandTotalPaid)} (${grandProgressPercentage}%)\n\n` +
        `*Desglose por persona:*\n` +
        personsBreakdown.map(p => `👉 *${p.name}:* Resta ${formatCurrency(p.remaining)} (Prestado: ${formatCurrency(p.borrowed)} | Pagado: ${formatCurrency(p.paid)})`).join('\n');
    } else {
      text = `📊 *Resumen de Cuenta con ${selectedPerson}*\n\n` +
        `• Total Prestado: ${formatCurrency(currentTotalBorrowed)}\n` +
        `• Total Pagado: ${formatCurrency(currentTotalPaid)} (${currentProgressPercentage}%)\n` +
        `• *SALDO PENDIENTE:* ${formatCurrency(currentRemainingBalance)}\n\n` +
        `_Detalle de ${displayedDebts.length} ítems y ${displayedPayments.length} pagos registrados._`;
    }
    
    if (navigator.share) {
      navigator.share({ title: 'Resumen de Pagos', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Resumen copiado al portapapeles.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-zinc-900 flex flex-col antialiased">
      {/* Top Header / App Bar with iOS Safe Area support */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-4 sm:px-8 py-3.5 safe-top-header shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.svg" 
              alt="Iris Pagos Logo" 
              className="w-10 h-10 rounded-xl shadow-xs object-cover border border-zinc-200"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                  Control de Préstamos
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
              <p className="text-xs text-zinc-500 hidden sm:block">Seguimiento de deudas y pagos por persona</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Quick Action Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setIsAddPersonOpen(true)}
                className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
                title="Agregar nueva persona"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Nueva Persona
              </button>
              <button
                onClick={() => {
                  setNewPayment({ ...newPayment, person: selectedPerson !== 'ALL' ? selectedPerson : persons[0] || 'Iris' });
                  setIsAddPaymentOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                Registrar Pago
              </button>
              <button
                onClick={() => {
                  setNewDebt({ ...newDebt, person: selectedPerson !== 'ALL' ? selectedPerson : persons[0] || 'Iris' });
                  setIsAddDebtOpen(true);
                }}
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
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-5 pb-28 sm:pb-8">

        {/* ======================================================== */}
        {/* BANNER PRINCIPAL: TOTAL GENERAL QUE DEBO A TODOS JUNTOS */}
        {/* ======================================================== */}
        <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white shadow-md space-y-3 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs uppercase tracking-wider font-bold text-zinc-300">
                Total Global Que Debo (A Todos)
              </span>
            </div>
            <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-emerald-300 border border-white/15">
              {grandProgressPercentage}% Total Pagado
            </span>
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {formatCurrency(grandRemainingBalance)}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-zinc-400 font-medium">
              <span>Total Pedido: <strong className="text-zinc-200">{formatCurrency(grandTotalBorrowed)}</strong></span>
              <span>•</span>
              <span>Total Abonado: <strong className="text-emerald-400">{formatCurrency(grandTotalPaid)}</strong></span>
              <span>•</span>
              <span>Personas: <strong className="text-zinc-200">{persons.length}</strong></span>
            </div>
          </div>

          {/* Barra de progreso global */}
          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10 relative z-10">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${grandProgressPercentage}%` }}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* SELECTOR DE PERSONA (TODOS O CADA UNO POR SEPARADO)      */}
        {/* ======================================================== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              Ver cuenta de:
            </label>
            <button
              onClick={() => setIsAddPersonOpen(true)}
              className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" /> + Agregar persona
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {/* Opción Todos */}
            <button
              onClick={() => setSelectedPerson('ALL')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-xs ${
                selectedPerson === 'ALL'
                  ? 'bg-zinc-900 text-white ring-2 ring-zinc-900/20'
                  : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Todos Juntos</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${selectedPerson === 'ALL' ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                {formatCurrency(grandRemainingBalance)}
              </span>
            </button>

            {/* Opciones individuales por persona */}
            {persons.map((personName) => {
              const pData = personsBreakdown.find(p => p.name.toLowerCase() === personName.toLowerCase());
              const isCurrent = selectedPerson.toLowerCase() === personName.toLowerCase();
              return (
                <button
                  key={personName}
                  onClick={() => setSelectedPerson(personName)}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-xs ${
                    isCurrent
                      ? 'bg-purple-600 text-white ring-2 ring-purple-600/30'
                      : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>{personName}</span>
                  {pData && (
                    <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${isCurrent ? 'bg-white/25 text-white' : 'bg-purple-50 text-purple-700'}`}>
                      {formatCurrency(pData.remaining)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs (Desktop only) */}
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
            Montos ({displayedDebts.length})
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
            Pagos ({displayedPayments.length})
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
            Desglose & Balance
          </button>
        </div>

        {/* TAB 1: RESUMEN (VISTA FILTRADA POR PERSONA O TODOS) */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Primary Balance Card para la selección actual */}
            <div className="rounded-3xl p-6 sm:p-7 bg-white border border-zinc-200/90 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-zinc-500">
                  {isAll ? 'Saldo pendiente total a devolver' : `Saldo pendiente con ${selectedPerson}`}
                </span>
                <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentProgressPercentage}% Devuelto
                </span>
              </div>

              <div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
                  {formatCurrency(currentRemainingBalance)}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {currentRemainingBalance === 0 
                    ? `🎉 ¡Deuda con ${isAll ? 'todas las personas' : selectedPerson} completamente saldada!` 
                    : `Resta abonar ${formatCurrency(currentRemainingBalance)} ${isAll ? 'en total' : `a ${selectedPerson}`}`
                  }
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2 pt-1">
                <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${currentProgressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs sm:text-sm text-zinc-500 font-medium">
                  <span>Abonado: <strong className="text-zinc-900">{formatCurrency(currentTotalPaid)}</strong></span>
                  <span>Total Prestado: <strong className="text-zinc-900">{formatCurrency(currentTotalBorrowed)}</strong></span>
                </div>
              </div>

              {/* Acciones principales en móvil */}
              <div className="grid grid-cols-2 gap-3 pt-2 sm:hidden">
                <button
                  onClick={() => {
                    setNewPayment({ ...newPayment, person: selectedPerson !== 'ALL' ? selectedPerson : persons[0] || 'Iris' });
                    setIsAddPaymentOpen(true);
                  }}
                  className="py-3 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                  <span>Registrar Pago</span>
                </button>

                <button
                  onClick={() => {
                    setNewDebt({ ...newDebt, person: selectedPerson !== 'ALL' ? selectedPerson : persons[0] || 'Iris' });
                    setIsAddDebtOpen(true);
                  }}
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
                    <span>Total Prestado {isAll ? '' : `(${selectedPerson})`}</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
                    {formatCurrency(currentTotalBorrowed)}
                  </p>
                  <span className="text-xs text-zinc-400">{displayedDebts.length} conceptos registrados</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                  <Receipt className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200/90 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-500 text-xs sm:text-sm font-medium mb-1">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    <span>Total Abonado {isAll ? '' : `(${selectedPerson})`}</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">
                    {formatCurrency(currentTotalPaid)}
                  </p>
                  <span className="text-xs text-zinc-400">{displayedPayments.length} pagos realizados</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Tarjetas individuales de personas cuando se está en vista "TODOS" */}
            {isAll && (
              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-600 uppercase tracking-wider">
                    Estado por persona (Separado)
                  </h3>
                  <button 
                    onClick={() => setIsAddPersonOpen(true)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    + Agregar otra persona
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {personsBreakdown.map((p) => (
                    <div 
                      key={p.name}
                      onClick={() => setSelectedPerson(p.name)}
                      className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs hover:border-purple-300 hover:shadow-sm transition cursor-pointer space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-zinc-900">{p.name}</h4>
                            <p className="text-[11px] text-zinc-400">{p.debtsCount} préstamos · {p.paymentsCount} pagos</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.progress}%
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline pt-1 border-t border-zinc-100">
                        <span className="text-xs text-zinc-500">Deuda pendiente:</span>
                        <span className="text-base font-extrabold text-zinc-900">{formatCurrency(p.remaining)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listas resumidas en 2 columnas en Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Últimos Pagos */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-600 uppercase tracking-wider">
                    Últimos Pagos {isAll ? '' : `a ${selectedPerson}`}
                  </h3>
                  <button 
                    onClick={() => setActiveTab('payments')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    Ver todos <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {displayedPayments.slice(0, 4).map((p) => (
                    <div 
                      key={p.id}
                      className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs flex items-center justify-between hover:border-zinc-300 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs">
                          {p.person ? p.person.charAt(0).toUpperCase() : 'I'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-zinc-900">{p.note || 'Pago'}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                              {p.person || 'Iris'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">{formatDate(p.date)} · {p.method}</p>
                          {p.updated_at && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                              Editado
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-600">
                          -{formatCurrency(p.amount)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {displayedPayments.length === 0 && (
                    <div className="p-8 text-center rounded-2xl bg-white border border-dashed border-zinc-200">
                      <p className="text-sm text-zinc-400">No hay pagos registrados para esta selección.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Montos Prestados */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-600 uppercase tracking-wider">
                    Montos Prestados {isAll ? '' : `por ${selectedPerson}`}
                  </h3>
                  <button 
                    onClick={() => setActiveTab('debts')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    Ver todos <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {displayedDebts.slice(0, 4).map((d) => (
                    <div 
                      key={d.id}
                      className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs flex items-center justify-between hover:border-zinc-300 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 font-bold text-xs">
                          {d.person ? d.person.charAt(0).toUpperCase() : 'I'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-zinc-900">{d.description}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                              {d.person || 'Iris'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">{formatDate(d.date)} · {d.category}</p>
                          {d.updated_at && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                              Editado
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-zinc-900">
                          +{formatCurrency(d.amount)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {displayedDebts.length === 0 && (
                    <div className="p-8 text-center rounded-2xl bg-white border border-dashed border-zinc-200">
                      <p className="text-sm text-zinc-400">No hay montos cargados para esta selección.</p>
                    </div>
                  )}
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
                <h2 className="text-lg font-bold text-zinc-900">
                  {isAll ? 'Montos Prestados (Todas las Personas)' : `Montos Prestados por ${selectedPerson}`}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500">Total acumulado: {formatCurrency(currentTotalBorrowed)}</p>
              </div>
              <button
                onClick={() => {
                  setNewDebt({ ...newDebt, person: selectedPerson !== 'ALL' ? selectedPerson : persons[0] || 'Iris' });
                  setIsAddDebtOpen(true);
                }}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Agregar Nuevo Monto
              </button>
            </div>

            {displayedDebts.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-zinc-200">
                <p className="text-sm text-zinc-400">No hay montos cargados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {displayedDebts.map((item) => {
                  const isModified = Boolean(item.updated_at) || (item.edit_count || 0) >= 1;
                  return (
                    <div 
                      key={item.id}
                      className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-zinc-900">{item.description}</h4>
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                                {item.person || 'Iris'}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium">
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

                        {/* Auditoría de fechas */}
                        <div className="mt-3 pt-2.5 border-t border-zinc-100 text-[11px] text-zinc-500 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span>Creado: <strong>{formatDateTime(item.created_at || item.date)}</strong></span>
                          </div>
                          {item.updated_at ? (
                            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/70">
                              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Modificado: <strong>{formatDateTime(item.updated_at)}</strong> (única modificación)</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">Sin modificaciones previas</span>
                          )}
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                        {isModified ? (
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium bg-zinc-100 px-2 py-1 rounded-lg">
                            <Lock className="w-3 h-3" /> Modificación ya usada
                          </span>
                        ) : (
                          <button
                            onClick={() => openEditDebtModal(item)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 transition cursor-pointer hover:underline"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Modificar monto (1 intento)
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteDebt(item.id)}
                          className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HISTORIAL DE PAGOS */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  {isAll ? 'Historial de Pagos Realizados (A Todos)' : `Historial de Pagos a ${selectedPerson}`}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500">Total devuelto: {formatCurrency(currentTotalPaid)}</p>
              </div>
              <button
                onClick={() => {
                  setNewPayment({ ...newPayment, person: selectedPerson !== 'ALL' ? selectedPerson : persons[0] || 'Iris' });
                  setIsAddPaymentOpen(true);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Registrar Pago
              </button>
            </div>

            {displayedPayments.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-zinc-200">
                <p className="text-sm text-zinc-400">No hay pagos registrados aún para esta selección.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {displayedPayments.map((pay) => {
                  const isModified = Boolean(pay.updated_at) || (pay.edit_count || 0) >= 1;
                  return (
                    <div 
                      key={pay.id}
                      className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-zinc-900">{pay.note || 'Pago'}</h4>
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                                {pay.person || 'Iris'}
                              </span>
                            </div>
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

                        {/* Auditoría de fechas */}
                        <div className="mt-3 pt-2.5 border-t border-zinc-100 text-[11px] text-zinc-500 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span>Creado: <strong>{formatDateTime(pay.created_at || pay.date)}</strong></span>
                          </div>
                          {pay.updated_at ? (
                            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/70">
                              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Modificado: <strong>{formatDateTime(pay.updated_at)}</strong> (única modificación)</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">Sin modificaciones previas</span>
                          )}
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                        {isModified ? (
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium bg-zinc-100 px-2 py-1 rounded-lg">
                            <Lock className="w-3 h-3" /> Modificación ya usada
                          </span>
                        ) : (
                          <button
                            onClick={() => openEditPaymentModal(pay)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 transition cursor-pointer hover:underline"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Modificar monto (1 intento)
                          </button>
                        )}

                        <button
                          onClick={() => handleDeletePayment(pay.id)}
                          className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BALANCE / ESTADÍSTICAS */}
        {activeTab === 'stats' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="p-1 text-center sm:text-left">
              <h2 className="text-lg font-bold text-zinc-900">Desglose Detallado por Persona</h2>
              <p className="text-xs sm:text-sm text-zinc-500">Comparativa de montos prestados, abonados y pendientes</p>
            </div>

            {/* Tarjetas individuales de resumen por persona */}
            <div className="space-y-3">
              {personsBreakdown.map((p) => (
                <div key={p.name} className="p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-zinc-900">{p.name}</h4>
                        <span className="text-xs text-zinc-400">{p.debtsCount} préstamos · {p.paymentsCount} pagos</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-zinc-500 block">Resta pagar</span>
                      <span className="text-lg font-black text-purple-700">{formatCurrency(p.remaining)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-600">
                      <span>Progreso de devolución</span>
                      <span className="font-bold">{p.progress}%</span>
                    </div>
                    <div className="overflow-hidden h-2.5 rounded-full bg-zinc-100">
                      <div
                        style={{ width: `${p.progress}%` }}
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-100">
                    <div>
                      <span className="text-zinc-400 block">Prestado:</span>
                      <strong className="text-zinc-800">{formatCurrency(p.borrowed)}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">Abonado:</span>
                      <strong className="text-emerald-600">{formatCurrency(p.paid)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total General Consolidado */}
            <div className="p-6 rounded-3xl bg-zinc-900 text-white space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Consolidado (Todos los acreedores)</h3>
              <div className="flex justify-between py-2 border-b border-zinc-800 text-sm">
                <span className="text-zinc-400">Total Solicitado</span>
                <span className="font-bold text-white">{formatCurrency(grandTotalBorrowed)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-800 text-sm">
                <span className="text-zinc-400">Total Reintegrado</span>
                <span className="font-bold text-emerald-400">{formatCurrency(grandTotalPaid)}</span>
              </div>
              <div className="flex justify-between py-2 text-base font-bold">
                <span className="text-zinc-300">Total Restante Que Debo</span>
                <span className="text-2xl text-white font-black">{formatCurrency(grandRemainingBalance)}</span>
              </div>
            </div>

            <button
              onClick={shareSummary}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-sm font-semibold active:scale-95 transition cursor-pointer shadow-xs"
            >
              Copiar Resumen Completo para WhatsApp
            </button>
          </div>
        )}

      </main>

      {/* Barra de navegación inferior móvil con el botón "+" perfectamente centrado y soporte para safe area de iOS */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 px-4 py-2 safe-bottom-nav sm:hidden shadow-lg">
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

          {/* Botón Central "+" para registrar pago */}
          <div className="flex items-center justify-center -translate-y-3">
            <button
              onClick={() => {
                setNewPayment({ ...newPayment, person: selectedPerson !== 'ALL' ? selectedPerson : persons[0] || 'Iris' });
                setIsAddPaymentOpen(true);
              }}
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

      {/* MODAL: AGREGAR NUEVA PERSONA */}
      {isAddPersonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-600" />
                Nueva Persona a Quien le Debo
              </h3>
              <button 
                onClick={() => setIsAddPersonOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs px-2 py-1 rounded-lg hover:bg-zinc-100"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleAddPerson} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-600 font-semibold">Nombre de la persona</label>
                <input
                  type="text"
                  placeholder="Ej: Mamá, Lucas, Banco, etc."
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  required
                  autoFocus
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl active:scale-98 transition cursor-pointer shadow-sm"
                >
                  Agregar a la Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR MONTO PRESTADO */}
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
                <label className="text-xs text-zinc-600 font-semibold">¿Quién te prestó?</label>
                <select
                  value={newDebt.person}
                  onChange={(e) => setNewDebt({ ...newDebt, person: e.target.value })}
                  className="w-full mt-1.5 bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 font-bold focus:outline-none focus:border-purple-500"
                >
                  {persons.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

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

      {/* MODAL: EDITAR MONTO PRESTADO (1 sola vez) */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Modificar Monto de Préstamo
                </h3>
                <p className="text-xs text-amber-600 font-medium">⚠️ Solo podés modificarlo una única vez.</p>
              </div>
              <button 
                onClick={() => setEditingDebt(null)}
                className="text-zinc-400 hover:text-zinc-700 text-xs px-2 py-1 rounded-lg hover:bg-zinc-100"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSaveEditDebt} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-600 font-semibold">Persona</label>
                <select
                  value={editDebtForm.person}
                  onChange={(e) => setEditDebtForm({ ...editDebtForm, person: e.target.value })}
                  className="w-full mt-1.5 bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 font-bold focus:outline-none focus:border-purple-500"
                >
                  {persons.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-semibold">Monto ($)</label>
                <input
                  type="number"
                  step="any"
                  value={editDebtForm.amount}
                  onChange={(e) => setEditDebtForm({ ...editDebtForm, amount: e.target.value })}
                  required
                  autoFocus
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-base font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-semibold">Concepto / Motivo</label>
                <input
                  type="text"
                  value={editDebtForm.description}
                  onChange={(e) => setEditDebtForm({ ...editDebtForm, description: e.target.value })}
                  required
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-semibold">Categoría</label>
                <select
                  value={editDebtForm.category}
                  onChange={(e) => setEditDebtForm({ ...editDebtForm, category: e.target.value })}
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
                <label className="text-xs text-zinc-600 font-semibold">Notas</label>
                <input
                  type="text"
                  value={editDebtForm.notes}
                  onChange={(e) => setEditDebtForm({ ...editDebtForm, notes: e.target.value })}
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl active:scale-98 transition cursor-pointer shadow-sm"
                >
                  Guardar Modificación Definitiva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PAGO NUEVO */}
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
                <label className="text-xs text-zinc-600 font-semibold">¿A quién le pagás?</label>
                <select
                  value={newPayment.person}
                  onChange={(e) => setNewPayment({ ...newPayment, person: e.target.value })}
                  className="w-full mt-1.5 bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 font-bold focus:outline-none focus:border-purple-500"
                >
                  {persons.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

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

      {/* MODAL: EDITAR PAGO (1 sola vez) */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Modificar Pago Realizado
                </h3>
                <p className="text-xs text-amber-600 font-medium">⚠️ Solo podés modificarlo una única vez.</p>
              </div>
              <button 
                onClick={() => setEditingPayment(null)}
                className="text-zinc-400 hover:text-zinc-700 text-xs px-2 py-1 rounded-lg hover:bg-zinc-100"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSaveEditPayment} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-600 font-semibold">Persona</label>
                <select
                  value={editPaymentForm.person}
                  onChange={(e) => setEditPaymentForm({ ...editPaymentForm, person: e.target.value })}
                  className="w-full mt-1.5 bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 font-bold focus:outline-none focus:border-purple-500"
                >
                  {persons.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-semibold">Monto Pagado ($)</label>
                <input
                  type="number"
                  step="any"
                  value={editPaymentForm.amount}
                  onChange={(e) => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })}
                  required
                  autoFocus
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-lg font-bold text-emerald-600 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-semibold">Medio de Pago</label>
                <select
                  value={editPaymentForm.method}
                  onChange={(e) => setEditPaymentForm({ ...editPaymentForm, method: e.target.value })}
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-500"
                >
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Mercado Pago">Mercado Pago</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-600 font-semibold">Nota / Detalle</label>
                <input
                  type="text"
                  value={editPaymentForm.note}
                  onChange={(e) => setEditPaymentForm({ ...editPaymentForm, note: e.target.value })}
                  className="w-full mt-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl active:scale-98 transition cursor-pointer shadow-sm"
                >
                  Guardar Modificación Definitiva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
