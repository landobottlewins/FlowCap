import {
    AlertOctagon,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Info,
    Lock,
    ShieldCheck,
    Sparkles,
    TrendingDown,
    TrendingUp
} from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '../utils/formatters';

export default function HeroSDA({ data, currency }) {
  const [showExplanation, setShowExplanation] = useState(true);

  if (!data) return null;

  const sda = data.safe_daily_allowance || 0;
  const spentToday = data.spent_today || 0;
  const daysRemaining = data.days_remaining || 1;
  const healthStatus = data.health_status || 'healthy';
  const isOverToday = spentToday > sda && sda > 0;
  const remainingToday = Math.max(0, sda - spentToday);

  // Status configuration
  const statusConfig = {
    healthy: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      label: '🟢 Healthy & On Track',
      glow: 'from-emerald-500/10 via-teal-500/5 to-transparent',
      borderColor: 'border-emerald-500/30'
    },
    caution: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      label: '🟡 Caution / Over Pace',
      glow: 'from-amber-500/10 via-orange-500/5 to-transparent',
      borderColor: 'border-amber-500/30'
    },
    at_risk: {
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
      label: '🔴 At Risk / Deficit',
      glow: 'from-rose-500/10 via-red-500/5 to-transparent',
      borderColor: 'border-rose-500/30'
    }
  };

  const currentTheme = statusConfig[healthStatus] || statusConfig.healthy;
  const todayProgress = sda > 0 ? Math.min(100, (spentToday / sda) * 100) : 100;

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-slate-800/90 border ${currentTheme.borderColor} p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-300`}>
      {/* Background Glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentTheme.glow} pointer-events-none`} />

      <div className="relative z-10">
        {/* Top bar: label & health status badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-400">
              Safe Daily Allowance (SDA)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-300 font-medium">
              Dynamic Pacing
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${currentTheme.badge}`}>
            {currentTheme.icon}
            <span>{currentTheme.label}</span>
          </div>
        </div>

        {/* Main Hero Metric */}
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 my-2">
          <div className="flex items-baseline gap-3">
            <h2 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white font-mono">
              {formatCurrency(sda, currency)}
            </h2>
            <span className="text-lg sm:text-xl font-medium text-slate-400">/ day</span>
          </div>

          {/* Differentiator callout: Traditional vs FlowCap */}
          <div className="hidden lg:flex flex-col items-end text-right bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2.5">
            <span className="text-[11px] text-slate-400">Traditional Budget vs FlowCap</span>
            <div className="text-xs text-slate-400 mt-0.5">
              Traditional: <span className="line-through text-slate-500">{formatCurrency(data.remaining_balance, currency)} total</span>
            </div>
            <div className="text-xs font-semibold text-emerald-400">
              FlowCap: <span>{formatCurrency(sda, currency)} is safe to spend today</span>
            </div>
          </div>
        </div>

        {/* Today's Spend Pacing Bar */}
        <div className="mt-6 pt-5 border-t border-slate-700/70">
          <div className="flex justify-between items-center text-xs mb-2">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span>Today's Spending:</span>
              <strong className={`font-semibold ${isOverToday ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatCurrency(spentToday, currency)}
              </strong>
            </div>

            <div className="text-slate-400">
              {isOverToday ? (
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Over by {formatCurrency(spentToday - sda, currency)}
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {formatCurrency(remainingToday, currency)} remaining today
                </span>
              )}
            </div>
          </div>

          {/* Custom Multi-Color Progress Bar */}
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverToday 
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                  : 'bg-gradient-to-r from-teal-400 to-emerald-500'
              }`}
              style={{ width: `${Math.max(4, Math.min(100, todayProgress))}%` }}
            />
          </div>
        </div>

        {/* Dynamic SDA Explanation Collapse */}
        <div className="mt-5">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1"
          >
            <Info className="w-3.5 h-3.5 text-teal-400" />
            <span>Why did my SDA change?</span>
            {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showExplanation && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/70 text-xs space-y-2 animate-in fade-in duration-200">
              {data.sda_explanation && data.sda_explanation.length > 0 ? (
                data.sda_explanation.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">
                  Your SDA is calculated dynamically from your remaining funds divided across {daysRemaining} days remaining in this cycle.
                </p>
              )}

              {data.reserved_upcoming > 0 && (
                <div className="flex items-center gap-2 text-amber-300/90 pt-1 border-t border-slate-800">
                  <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>
                    {formatCurrency(data.reserved_upcoming, currency)} is securely withheld for upcoming bills.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

