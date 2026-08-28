import {
  Save,
  Settings,
  Sparkles,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CURRENCIES, formatCurrency } from '../utils/formatters';

export default function BudgetSetupModal({
  isOpen,
  onClose,
  config = {},
  onSaveConfig,
  isOnboarding = false
}) {
  const [income, setIncome] = useState('5000');
  const [fixedCosts, setFixedCosts] = useState('1000');
  const [savingsTarget, setSavingsTarget] = useState('500');
  const [emergencyBuffer, setEmergencyBuffer] = useState('300');
  const [cycleStartDay, setCycleStartDay] = useState('1');
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    if (config && Object.keys(config).length > 0) {
      if (config.monthly_income !== undefined) setIncome(config.monthly_income.toString());
      if (config.fixed_costs !== undefined) setFixedCosts(config.fixed_costs.toString());
      if (config.savings_target !== undefined) setSavingsTarget(config.savings_target.toString());
      if (config.emergency_buffer !== undefined) setEmergencyBuffer(config.emergency_buffer.toString());
      if (config.cycle_start_day !== undefined) setCycleStartDay(config.cycle_start_day.toString());
      if (config.currency) setCurrency(config.currency);
    }
  }, [config]);

  if (!isOpen) return null;

  const inc = parseFloat(income) || 0;
  const fix = parseFloat(fixedCosts) || 0;
  const sav = parseFloat(savingsTarget) || 0;
  const buf = parseFloat(emergencyBuffer) || 0;
  
  const estimatedDisposable = Math.max(0, inc - fix - sav - buf);
  const estimatedInitialSDA = estimatedDisposable / 30;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSaveConfig({
      monthly_income: inc,
      fixed_costs: fix,
      savings_target: sav,
      emergency_buffer: buf,
      cycle_start_day: parseInt(cycleStartDay, 10) || 1,
      currency
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-700 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              {isOnboarding ? <Sparkles className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isOnboarding ? 'Welcome to FlowCap Budget Setup' : 'Budget & Engine Settings'}
              </h3>
              <p className="text-xs text-slate-400">
                {isOnboarding ? 'Set your baseline pocket money/stipend to calculate your daily allowance' : 'Update monthly income/pocket money, fixed costs, and cycle rules'}
              </p>
            </div>
          </div>
          {!isOnboarding && (
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monthly Income */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Monthly Pocket Money / Stipend from Parents
            </label>
            <div className="relative">
              <input
                type="number"
                step="50"
                min="100"
                required
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="5000"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                {currency}
              </span>
            </div>
          </div>

          {/* Fixed Expenses */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Fixed Monthly Expenses (Hostel, Mobile Data, Laundry)
            </label>
            <input
              type="number"
              step="50"
              min="0"
              required
              value={fixedCosts}
              onChange={(e) => setFixedCosts(e.target.value)}
              placeholder="1000"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Savings Target */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Savings Target
              </label>
              <input
                type="number"
                step="50"
                min="0"
                value={savingsTarget}
                onChange={(e) => setSavingsTarget(e.target.value)}
                placeholder="500"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Emergency Buffer */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Emergency Buffer
              </label>
              <input
                type="number"
                step="50"
                min="0"
                value={emergencyBuffer}
                onChange={(e) => setEmergencyBuffer(e.target.value)}
                placeholder="300"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cycle Start Day */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Budget Cycle Start Day
              </label>
              <select
                value={cycleStartDay}
                onChange={(e) => setCycleStartDay(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}{d === 1 ? 'st of Month (Default)' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/20 space-y-2 mt-4">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Calculated Disposable Pool:</span>
              <strong className="text-slate-200 font-mono">
                {formatCurrency(estimatedDisposable, currency)}
              </strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-emerald-400 font-semibold">Initial Safe Daily Allowance (SDA):</span>
              <strong className="text-emerald-400 font-mono text-base">
                ~{formatCurrency(estimatedInitialSDA, currency)} / day
              </strong>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 flex gap-3">
            {!isOnboarding && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isOnboarding ? 'Complete Setup & Enter FlowCap' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

