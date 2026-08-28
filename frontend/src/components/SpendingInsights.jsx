import {
    AlertTriangle,
    CalendarX,
    Flame,
    Lightbulb,
    PiggyBank,
    Sparkles,
    TrendingUp,
    Zap
} from 'lucide-react';

const INSIGHT_ICONS = {
  TrendingUp: <TrendingUp className="w-4 h-4 text-amber-400" />,
  Sparkles: <Sparkles className="w-4 h-4 text-emerald-400" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4 text-rose-400" />,
  CalendarX: <CalendarX className="w-4 h-4 text-rose-400" />,
  PiggyBank: <PiggyBank className="w-4 h-4 text-cyan-400" />,
  Flame: <Flame className="w-4 h-4 text-amber-400" />
};

export default function SpendingInsights({ insights = [], healthStatus = 'healthy', healthLabel = '' }) {
  if (!insights || insights.length === 0) return null;

  const bgStyles = {
    warning: 'bg-amber-950/20 border-amber-500/30 text-amber-200',
    positive: 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200',
    danger: 'bg-rose-950/20 border-rose-500/30 text-rose-200',
    tip: 'bg-cyan-950/20 border-cyan-500/30 text-cyan-200',
    achievement: 'bg-indigo-950/20 border-indigo-500/30 text-indigo-200'
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/70 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Spending Intelligence</h3>
            <p className="text-xs text-slate-400">Rule-based insights and automated pacing analysis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {insights.map((item, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-2xl border flex items-start gap-3 backdrop-blur-sm transition-all hover:scale-[1.01] ${
              bgStyles[item.type] || bgStyles.tip
            }`}
          >
            <div className="p-2 rounded-xl bg-slate-900/80 shrink-0 border border-slate-800">
              {INSIGHT_ICONS[item.icon] || <Zap className="w-4 h-4 text-teal-400" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 mb-0.5">{item.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

