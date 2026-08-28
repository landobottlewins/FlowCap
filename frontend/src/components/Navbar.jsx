import {
    Activity,
    Calculator,
    FileSpreadsheet,
    Flame,
    LogOut,
    Moon,
    PlusCircle,
    Settings,
    Sparkles,
    Sun
} from 'lucide-react';
import { CURRENCIES } from '../utils/formatters';

export default function Navbar({
  username,
  currency,
  onCurrencyChange,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenAddModal,
  onOpenCSVModal,
  onOpenSimulator,
  onLoadDemoData,
  onLogout,
  streakCount = 0
}) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 dark:bg-slate-900/90 light:bg-white/90 backdrop-blur-md border-b border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                FlowCap
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live SDA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Micro-Budgeting & Dynamic Allowance</p>
          </div>
        </div>

        {/* Center/Right Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {streakCount > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
              <span>{streakCount}d Streak</span>
            </div>
          )}

          {/* Quick Add Expense */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Expense</span>
          </button>

          {/* CSV Import */}
          <button
            onClick={onOpenCSVModal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs sm:text-sm font-medium transition-colors"
            title="Import CSV Statement"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Import CSV</span>
          </button>

          {/* What-if Simulator button */}
          <button
            onClick={onOpenSimulator}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs sm:text-sm font-medium transition-colors"
            title="What-If Purchase Calculator"
          >
            <Calculator className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">Simulator</span>
          </button>

          {/* Demo Data button */}
          <button
            onClick={onLoadDemoData}
            className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-medium transition-colors"
            title="Populate demo transactions and budgets"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Demo Data</span>
          </button>

          {/* Currency Switcher */}
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {Object.values(CURRENCIES).map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </select>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Settings Modal */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Budget Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Sign Out */}
          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

