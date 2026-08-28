import {
    AlertOctagon,
    AlertTriangle,
    CheckCircle,
    Save,
    Sliders,
    X
} from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES, CATEGORY_COLORS, formatCurrency } from '../utils/formatters';

export default function CategoryBudgets({
  categoryStatus = [],
  currency = 'INR',
  onSaveCategoryLimits
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [limitsForm, setLimitsForm] = useState({});

  const handleOpenEdit = () => {
    const map = {};
    CATEGORIES.forEach((cat) => {
      const match = categoryStatus.find((c) => c.category === cat);
      map[cat] = match ? match.limit : 0;
    });
    setLimitsForm(map);
    setIsEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = Object.entries(limitsForm).map(([category, limit]) => ({
      category,
      monthly_limit: parseFloat(limit) || 0
    }));
    await onSaveCategoryLimits(payload);
    setIsEditOpen(false);
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/70 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Category Caps & Pace</h3>
          <p className="text-xs text-slate-400">Track spending limits and alerts per category</p>
        </div>
        <button
          onClick={handleOpenEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-750 hover:bg-slate-700 text-slate-300 border border-slate-750 text-xs font-semibold transition-colors"
        >
          <Sliders className="w-3.5 h-3.5 text-teal-400" />
          <span>Set Caps</span>
        </button>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {CATEGORIES.map((cat) => {
          const item = categoryStatus.find((c) => c.category === cat) || {
            category: cat,
            spent: 0,
            limit: 0,
            percentage: 0,
            status: 'normal'
          };
          const style = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;

          const isExceeded = item.status === 'exceeded';
          const isWarning = item.status === 'warning';

          return (
            <div
              key={cat}
              className={`p-3.5 rounded-2xl bg-slate-900/70 border transition-all ${
                isExceeded
                  ? 'border-rose-500/40 bg-rose-950/20'
                  : isWarning
                  ? 'border-amber-500/40 bg-amber-950/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                  {cat}
                </span>

                {item.limit > 0 && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    {item.percentage}% used
                  </span>
                )}
              </div>

              {/* Numbers: Spent vs Limit */}
              <div className="flex justify-between items-baseline my-1">
                <span className="text-sm font-bold text-white font-mono">
                  {formatCurrency(item.spent, currency)}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / {item.limit > 0 ? formatCurrency(item.limit, currency) : 'No Cap'}
                </span>
              </div>

              {/* Progress Bar */}
              {item.limit > 0 ? (
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-2 p-0.5 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isExceeded
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                  />
                </div>
              ) : (
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-2 p-0.5 border border-slate-800">
                  <div className="h-full bg-slate-700 rounded-full w-full opacity-30" />
                </div>
              )}

              {/* Alert Badge */}
              <div className="mt-2.5 text-[10px] flex items-center gap-1">
                {isExceeded ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" /> Exceeded limit by {formatCurrency(item.spent - item.limit, currency)}
                  </span>
                ) : isWarning ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Approaching budget limit
                  </span>
                ) : item.limit > 0 ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Under normal pace
                  </span>
                ) : (
                  <span className="text-slate-500">No limit set</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Category Limits Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-lg font-bold text-white">Edit Category Budget Caps</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-200 w-28">{cat}</span>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-xs text-slate-400">{currency}</span>
                    <input
                      type="number"
                      step="50"
                      min="0"
                      value={limitsForm[cat] || 0}
                      onChange={(e) => setLimitsForm({ ...limitsForm, [cat]: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Caps</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

