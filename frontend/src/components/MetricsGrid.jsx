import {
  Calendar,
  CreditCard,
  Gauge,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function MetricsGrid({ data, currency }) {
  if (!data) return null;

  const disposable = data.disposable_funds || 0;
  const totalSpent = data.total_spent || 0;
  const remaining = data.remaining_balance || 0;
  const daysRemaining = data.days_remaining || 1;
  const totalDays = data.total_cycle_days || 30;
  const velocity = data.actual_daily_velocity || 0;
  const baselinePace = data.initial_daily_pace || 0;
  const velocityDelta = velocity - baselinePace;
  const isVelocityHigher = velocityDelta > 0;

  const cycleProgress = Math.min(100, Math.round(((totalDays - daysRemaining) / totalDays) * 100));
  const spendPct = disposable > 0 ? Math.min(100, Math.round((totalSpent / disposable) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* Metric 1: Disposable Funds */}
      <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-2xl flex flex-col justify-between backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Disposable Pool
          </span>
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono">
            {formatCurrency(disposable, currency)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            After fixed costs & savings
          </p>
        </div>
      </div>

      {/* Metric 2: Total Spent */}
      <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-2xl flex flex-col justify-between backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Total Spent
          </span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono">
            {formatCurrency(totalSpent, currency)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${spendPct}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">{spendPct}%</span>
          </div>
        </div>
      </div>

      {/* Metric 3: Remaining Balance */}
      <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-2xl flex flex-col justify-between backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Remaining Funds
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <PiggyBank className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className={`text-xl sm:text-2xl font-bold font-mono ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {formatCurrency(remaining, currency)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {remaining < 0 ? 'Budget exceeded' : 'Available for cycle'}
          </p>
        </div>
      </div>

      {/* Metric 4: Days Remaining */}
      <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-2xl flex flex-col justify-between backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Cycle Days Left
          </span>
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Calendar className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono">
            {daysRemaining} <span className="text-xs text-slate-400 font-normal">/ {totalDays}d</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-sky-500 h-full rounded-full" style={{ width: `${cycleProgress}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">{cycleProgress}%</span>
          </div>
        </div>
      </div>

      {/* Metric 5: Spending Velocity */}
      <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-slate-800/80 border border-slate-700/70 p-4 rounded-2xl flex flex-col justify-between backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Spending Velocity
          </span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Gauge className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono flex items-baseline gap-1">
            {formatCurrency(velocity, currency)}
            <span className="text-xs text-slate-400 font-normal">/ day</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] mt-1">
            {isVelocityHigher ? (
              <span className="text-amber-400 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                +{formatCurrency(velocityDelta, currency)} vs pace
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" />
                Under pace by {formatCurrency(Math.abs(velocityDelta), currency)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

