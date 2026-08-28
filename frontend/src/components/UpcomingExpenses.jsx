import {
    Calendar,
    CheckCircle2,
    Clock,
    Lock,
    Plus,
    Trash2,
    X
} from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES, formatCurrency, formatDate } from '../utils/formatters';

export default function UpcomingExpenses({
  upcomingExpenses = [],
  currency = 'INR',
  onAddUpcoming,
  onUpdateUpcoming,
  onDeleteUpcoming
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('Bills');

  const totalReserved = upcomingExpenses
    .filter((e) => !e.is_paid)
    .reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount || !dueDate) return;

    await onAddUpcoming({
      title,
      amount: parseFloat(amount),
      due_date: dueDate,
      category
    });

    setTitle('');
    setAmount('');
    setDueDate('');
    setCategory('Bills');
    setIsAddOpen(false);
  };

  const handleTogglePaid = async (exp) => {
    await onUpdateUpcoming(exp.id, {
      title: exp.title,
      amount: exp.amount,
      due_date: exp.due_date,
      category: exp.category,
      is_paid: exp.is_paid ? 0 : 1
    });
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/70 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white tracking-tight">Reserved Upcoming Expenses</h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
              <Lock className="w-3 h-3" /> Auto-Deducted from SDA
            </span>
          </div>
          <p className="text-xs text-slate-400">Future commitments are protected from daily overspending</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Reserve Expense</span>
        </button>
      </div>

      {/* Reserved Total Highlight Banner */}
      {totalReserved > 0 && (
        <div className="mb-4 p-3 bg-slate-900/80 border border-slate-700/80 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-300">Total Reserved Upcoming:</span>
              <div className="text-base font-bold text-amber-300 font-mono">
                {formatCurrency(totalReserved, currency)}
              </div>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 max-w-[200px] text-right hidden sm:block">
            Safeguards your money so you don't accidentally spend money meant for rent, fees, or bills.
          </span>
        </div>
      )}

      {/* List */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {upcomingExpenses.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-700/60 rounded-2xl bg-slate-900/40">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">No reserved expenses yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Add upcoming commitments like "College Fee — {currency} 2,500 — Sep 5" to shield them from your daily allowance.
            </p>
          </div>
        ) : (
          upcomingExpenses.map((exp) => (
            <div
              key={exp.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                exp.is_paid
                  ? 'bg-slate-900/40 border-slate-800 opacity-60'
                  : 'bg-slate-900/80 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleTogglePaid(exp)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors border ${
                    exp.is_paid
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'border-slate-600 text-transparent hover:border-emerald-400'
                  }`}
                  title={exp.is_paid ? 'Mark unpaid' : 'Mark paid & log transaction'}
                >
                  <CheckCircle2 className="w-4 h-4 fill-current" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${exp.is_paid ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                      {exp.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {exp.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>Due: {formatDate(exp.due_date)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold font-mono ${exp.is_paid ? 'text-slate-500' : 'text-amber-300'}`}>
                  {formatCurrency(exp.amount, currency)}
                </span>
                <button
                  onClick={() => onDeleteUpcoming(exp.id)}
                  className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                  title="Delete Reserved Expense"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-lg font-bold text-white">Reserve Upcoming Expense</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Expense Name / Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. College Semester Fee, Broadband Bill"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Amount ({currency})</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="2500"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all"
                >
                  Reserve Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

