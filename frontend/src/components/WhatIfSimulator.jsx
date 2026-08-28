import {
    Calculator,
    CheckCircle2,
    HelpCircle,
    Plus,
    ShieldAlert,
    Sparkles,
    X
} from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES, formatCurrency } from '../utils/formatters';

export default function WhatIfSimulator({
  isOpen,
  onClose,
  currentSda = 0,
  remainingBalance = 0,
  daysRemaining = 1,
  currency = 'INR',
  onLogAsExpense,
  onSaveAsUpcoming
}) {
  const [purchaseName, setPurchaseName] = useState('');
  const [amount, setAmount] = useState('350');
  const [category, setCategory] = useState('Food');

  if (!isOpen) return null;

  const cost = parseFloat(amount) || 0;
  const newRemaining = remainingBalance - cost;
  const newSda = Math.max(0, newRemaining / Math.max(1, daysRemaining));
  const dailyReduction = Math.max(0, currentSda - newSda);

  // Verdict calculation
  let verdict = 'Safe Purchase';
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  let explanation = `Your daily spending allowance will adjust from ${formatCurrency(currentSda, currency)} to ${formatCurrency(newSda, currency)} (-${formatCurrency(dailyReduction, currency)}/day) across the remaining ${daysRemaining} days.`;

  if (newRemaining < 0) {
    verdict = 'High Risk / Budget Deficit';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    icon = <ShieldAlert className="w-5 h-5 text-rose-400" />;
    explanation = `This purchase exceeds your remaining pocket money by ${formatCurrency(Math.abs(newRemaining), currency)}. Your Safe Daily Allowance will drop to 0!`;
  } else if (newSda < 0.3 * currentSda && currentSda > 0) {
    verdict = 'Tight Squeeze';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    icon = <HelpCircle className="w-5 h-5 text-amber-400" />;
    explanation = `This purchase sharply cuts your daily allowance by ${formatCurrency(dailyReduction, currency)}/day, leaving very little pocket money (${formatCurrency(newSda, currency)}/day left).`;
  }

  const handleApplyAsExpense = () => {
    if (cost <= 0) return;
    onLogAsExpense({
      amount: cost,
      category,
      note: purchaseName ? `[Simulated] ${purchaseName}` : `[Simulated] ${category} purchase`,
      type: 'expense'
    });
    onClose();
  };

  const handleApplyAsUpcoming = () => {
    if (cost <= 0) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    onSaveAsUpcoming({
      title: purchaseName || `Planned ${category}`,
      amount: cost,
      due_date: tomorrow.toISOString().split('T')[0],
      category
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">What-If Purchase Simulator</h3>
              <p className="text-xs text-slate-400">See how any planned expense impacts your daily pocket allowance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hypothetical Purchase
              </label>
              <input
                type="text"
                value={purchaseName}
                onChange={(e) => setPurchaseName(e.target.value)}
                placeholder='e.g., "Weekend Cafe Outing", "Hoodie", "Campus Event"'
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Price / Amount ({currency})
              </label>
              <input
                type="number"
                step="10"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400">Quick tests:</span>
            {[50, 150, 300, 600].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-slate-300 transition-colors"
              >
                {formatCurrency(preset, currency)}
              </button>
            ))}
          </div>

          {/* Comparison Cards: Current vs After Purchase */}
          <div className="p-4 bg-slate-900/90 border border-slate-700 rounded-2xl space-y-3 mt-4">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span>Impact Simulation</span>
              <div className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 ${badgeColor}`}>
                {icon}
                <span>{verdict}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                  Current SDA
                </span>
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {formatCurrency(currentSda, currency)}
                  <span className="text-xs font-normal text-slate-400">/day</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-cyan-500/30">
                <span className="text-[11px] text-cyan-400 uppercase tracking-wider block mb-1 font-semibold">
                  After Purchase
                </span>
                <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
                  {formatCurrency(newSda, currency)}
                  <span className="text-xs font-normal text-slate-400">/day</span>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{explanation}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-5 flex flex-wrap gap-2 justify-end mt-2 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleApplyAsUpcoming}
            className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all"
          >
            Reserve as Upcoming Bill
          </button>
          <button
            type="button"
            onClick={handleApplyAsExpense}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Log Expense Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}

