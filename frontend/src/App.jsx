import React, { useEffect, useState, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart as PieIcon, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Settings, 
  PlusCircle, 
  FileSpreadsheet, 
  Calculator, 
  Flame,
  Sparkles,
  Lock,
  RefreshCw,
  Sliders,
  Wallet
} from 'lucide-react';

import Navbar from './components/Navbar';
import HeroSDA from './components/HeroSDA';
import MetricsGrid from './components/MetricsGrid';
import TransactionList from './components/TransactionList';
import CSVImportModal from './components/CSVImportModal';
import CategoryBudgets from './components/CategoryBudgets';
import UpcomingExpenses from './components/UpcomingExpenses';
import SpendingInsights from './components/SpendingInsights';
import StreakCalendar from './components/StreakCalendar';
import WhatIfSimulator from './components/WhatIfSimulator';
import ForecastAnalytics from './components/ForecastAnalytics';
import BudgetSetupModal from './components/BudgetSetupModal';
import Toast from './components/Toast';

const API_BASE = "http://localhost:8000/api";

export default function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('flowcap_token'));
  const [username, setUsername] = useState(localStorage.getItem('flowcap_user') || '');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // App data state
  const [dashboardData, setDashboardData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [upcomingExpenses, setUpcomingExpenses] = useState([]);
  const [categoryBudgets, setCategoryBudgets] = useState([]);
  const [insightsData, setInsightsData] = useState({ insights: [] });
  const [streakData, setStreakData] = useState({ calendar_days: [], streak_count: 0 });
  const [config, setConfig] = useState(null);

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('flowcap_theme') || 'dark');
  const [currency, setCurrency] = useState('INR');
  const [toast, setToast] = useState(null);

  // Modals
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('flowcap_theme', nextTheme);
  };

  // Fetch all core state
  const refreshAllData = useCallback(async () => {
    if (!token) return;
    try {
      const [dashRes, txRes, upRes, catRes, insRes, strkRes, cfgRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`, { headers: authHeaders }),
        fetch(`${API_BASE}/transactions`, { headers: authHeaders }),
        fetch(`${API_BASE}/upcoming-expenses`, { headers: authHeaders }),
        fetch(`${API_BASE}/category-budgets`, { headers: authHeaders }),
        fetch(`${API_BASE}/insights`, { headers: authHeaders }),
        fetch(`${API_BASE}/calendar-streak`, { headers: authHeaders }),
        fetch(`${API_BASE}/config`, { headers: authHeaders })
      ]);

      if (dashRes.status === 401) {
        handleLogout();
        return;
      }

      if (dashRes.ok) {
        const d = await dashRes.json();
        setDashboardData(d);
        if (d.currency) setCurrency(d.currency);
      }

      if (txRes.ok) setTransactions(await txRes.json());
      if (upRes.ok) setUpcomingExpenses(await upRes.json());
      if (catRes.ok) setCategoryBudgets(await catRes.json());
      if (insRes.ok) setInsightsData(await insRes.json());
      if (strkRes.ok) setStreakData(await strkRes.json());
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setConfig(cfg);
        if (cfg.currency) setCurrency(cfg.currency);
      }
    } catch (err) {
      console.error("Data fetch error:", err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshAllData();
    }
  }, [token, refreshAllData]);

  // Auth Handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoadingAuth(true);

    const endpoint = isRegistering ? '/register' : '/login';
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      localStorage.setItem('flowcap_token', data.token);
      localStorage.setItem('flowcap_user', data.username);
      setToken(data.token);
      setUsername(data.username);

      if (isRegistering) {
        setIsOnboardingOpen(true);
        showToast('Welcome to FlowCap! Let\'s setup your budget.');
      } else {
        showToast(`Welcome back, ${data.username}!`);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('flowcap_token');
    localStorage.removeItem('flowcap_user');
    setToken(null);
    setUsername('');
    setDashboardData(null);
    setTransactions([]);
  };

  // Currency switch
  const handleCurrencyChange = async (newCurr) => {
    setCurrency(newCurr);
    if (config) {
      const updated = { ...config, currency: newCurr };
      setConfig(updated);
      try {
        await fetch(`${API_BASE}/config`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(updated)
        });
        refreshAllData();
        showToast(`Currency changed to ${newCurr}`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Transaction Actions
  const handleAddTransaction = async (newTx) => {
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newTx)
      });
      if (res.ok) {
        showToast('Transaction logged successfully! SDA updated.');
        refreshAllData();
      }
    } catch (err) {
      showToast('Failed to add transaction', 'error');
    }
  };

  const handleUpdateTransaction = async (id, updatedTx) => {
    try {
      const res = await fetch(`${API_BASE}/transactions/${id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(updatedTx)
      });
      if (res.ok) {
        showToast('Transaction updated! SDA recalculated.');
        refreshAllData();
      }
    } catch (err) {
      showToast('Failed to update transaction', 'error');
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/transactions/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        showToast('Transaction removed! SDA recalculated.');
        refreshAllData();
      }
    } catch (err) {
      showToast('Failed to delete transaction', 'error');
    }
  };

  // CSV Import
  const handleImportCSV = async (items) => {
    try {
      const res = await fetch(`${API_BASE}/transactions/csv-import`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(items)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Imported ${data.inserted_count} transaction(s)! (Skipped ${data.duplicate_count} duplicates). SDA recalculated.`);
        refreshAllData();
      } else {
        throw new Error(data.detail || 'Import failed');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Upcoming Expenses Actions
  const handleAddUpcoming = async (exp) => {
    try {
      const res = await fetch(`${API_BASE}/upcoming-expenses`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(exp)
      });
      if (res.ok) {
        showToast('Reserved expense added! Available daily allowance adjusted.');
        refreshAllData();
      }
    } catch (err) {
      showToast('Failed to add reserved expense', 'error');
    }
  };

  const handleUpdateUpcoming = async (id, exp) => {
    try {
      const res = await fetch(`${API_BASE}/upcoming-expenses/${id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(exp)
      });
      if (res.ok) {
        showToast(exp.is_paid ? 'Marked as paid and logged as expense!' : 'Upcoming expense updated');
        refreshAllData();
      }
    } catch (err) {
      showToast('Failed to update upcoming expense', 'error');
    }
  };

  const handleDeleteUpcoming = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/upcoming-expenses/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        showToast('Reserved expense released! Funds returned to daily allowance.');
        refreshAllData();
      }
    } catch (err) {
      showToast('Failed to delete reserved expense', 'error');
    }
  };

  // Category limits save
  const handleSaveCategoryLimits = async (limits) => {
    try {
      const res = await fetch(`${API_BASE}/category-budgets`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(limits)
      });
      if (res.ok) {
        showToast('Category budget limits saved!');
        refreshAllData();
      }
    } catch (err) {
      showToast('Failed to save category limits', 'error');
    }
  };

  // Save budget config
  const handleSaveConfig = async (newCfg) => {
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(newCfg)
      });
      if (res.ok) {
        showToast('Budget configuration updated! SDA recalculated.');
        refreshAllData();
      }
    } catch (err) {
      showToast('Failed to save config', 'error');
    }
  };

  // Seed demo data
  const handleLoadDemoData = async () => {
    try {
      const res = await fetch(`${API_BASE}/demo-data`, {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        showToast('Demo data seeded with transactions, bills, and category limits!');
        refreshAllData();
      }
    } catch (err) {
      showToast('Failed to seed demo data', 'error');
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {!token ? (
        /* Authentication Screen */
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Flame className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                FlowCap
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Micro-Budgeting & Dynamic Daily Allowance Engine
              </p>
            </div>

            {/* Auth Toggle Tabs */}
            <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => { setIsRegistering(false); setAuthError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  !isRegistering
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegistering(true); setAuthError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  isRegistering
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl text-center">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username / ID
                </label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="alex_dev"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isLoadingAuth}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all mt-2"
              >
                {isLoadingAuth ? 'Please wait...' : isRegistering ? 'Start My Micro-Budget' : 'Sign In to Dashboard'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
              <span className="text-[11px] text-slate-500">
                Converts monthly budgets into live, adaptive daily allowances.
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated Main App */
        <div className="min-h-screen flex flex-col">
          {/* Top Navbar */}
          <Navbar
            username={username}
            currency={currency}
            onCurrencyChange={handleCurrencyChange}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAddModal={() => setIsAddTxOpen(true)}
            onOpenCSVModal={() => setIsCSVModalOpen(true)}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
            onLoadDemoData={handleLoadDemoData}
            onLogout={handleLogout}
            streakCount={streakData.streak_count || 0}
          />

          {/* Tab Navigation */}
          <div className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-16 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 py-2.5 no-scrollbar">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                { id: 'transactions', label: 'Transactions & CSV', icon: <Receipt className="w-4 h-4" /> },
                { id: 'budgets', label: 'Caps & Reserved Bills', icon: <Sliders className="w-4 h-4" /> },
                { id: 'analytics', label: 'Forecast & Charts', icon: <TrendingUp className="w-4 h-4" /> },
                { id: 'calendar', label: 'Streak Calendar', icon: <CalendarIcon className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {!dashboardData ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                <p className="text-sm font-semibold text-slate-300">Calculating Dynamic Allowance...</p>
              </div>
            ) : (
              <>
                {/* 1. DASHBOARD VIEW */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    {/* Hero SDA Display */}
                    <HeroSDA data={dashboardData} currency={currency} />

                    {/* Metrics Grid */}
                    <MetricsGrid data={dashboardData} currency={currency} />

                    {/* Spending Insights Engine */}
                    <SpendingInsights
                      insights={insightsData.insights}
                      healthStatus={dashboardData.health_status}
                      healthLabel={dashboardData.health_label}
                    />

                    {/* Dashboard Split: Recent Transactions + Category Caps Mini Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <TransactionList
                        transactions={transactions.slice(0, 10)}
                        currency={currency}
                        onAddTransaction={handleAddTransaction}
                        onUpdateTransaction={handleUpdateTransaction}
                        onDeleteTransaction={handleDeleteTransaction}
                        isAddModalOpen={isAddTxOpen}
                        setIsAddModalOpen={setIsAddTxOpen}
                      />

                      <div className="space-y-6">
                        <CategoryBudgets
                          categoryStatus={dashboardData.category_status || []}
                          currency={currency}
                          onSaveCategoryLimits={handleSaveCategoryLimits}
                        />

                        <UpcomingExpenses
                          upcomingExpenses={upcomingExpenses}
                          currency={currency}
                          onAddUpcoming={handleAddUpcoming}
                          onUpdateUpcoming={handleUpdateUpcoming}
                          onDeleteUpcoming={handleDeleteUpcoming}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. TRANSACTIONS VIEW */}
                {activeTab === 'transactions' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-800/60 border border-slate-700/70 p-4 rounded-3xl">
                      <div>
                        <h2 className="text-base font-bold text-white">Full Transaction Register</h2>
                        <p className="text-xs text-slate-400">Search, filter, edit, or batch-import bank statement transactions</p>
                      </div>
                      <button
                        onClick={() => setIsCSVModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-750 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>Import Statement (CSV)</span>
                      </button>
                    </div>

                    <TransactionList
                      transactions={transactions}
                      currency={currency}
                      onAddTransaction={handleAddTransaction}
                      onUpdateTransaction={handleUpdateTransaction}
                      onDeleteTransaction={handleDeleteTransaction}
                      isAddModalOpen={isAddTxOpen}
                      setIsAddModalOpen={setIsAddTxOpen}
                    />
                  </div>
                )}

                {/* 3. BUDGETS & RESERVED BILLS VIEW */}
                {activeTab === 'budgets' && (
                  <div className="space-y-6">
                    <CategoryBudgets
                      categoryStatus={dashboardData.category_status || []}
                      currency={currency}
                      onSaveCategoryLimits={handleSaveCategoryLimits}
                    />

                    <UpcomingExpenses
                      upcomingExpenses={upcomingExpenses}
                      currency={currency}
                      onAddUpcoming={handleAddUpcoming}
                      onUpdateUpcoming={handleUpdateUpcoming}
                      onDeleteUpcoming={handleDeleteUpcoming}
                    />
                  </div>
                )}

                {/* 4. ANALYTICS & FORECAST VIEW */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-800/60 border border-slate-700/70 p-4 rounded-3xl">
                      <div>
                        <h2 className="text-base font-bold text-white">Forecast & Burn-Down Trajectory</h2>
                        <p className="text-xs text-slate-400">Interactive charts and month-end projections</p>
                      </div>
                      <button
                        onClick={() => setIsSimulatorOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all"
                      >
                        <Calculator className="w-4 h-4" />
                        <span>Run What-If Test</span>
                      </button>
                    </div>

                    <ForecastAnalytics
                      dailyHistory={dashboardData.daily_history || []}
                      categoryBreakdown={dashboardData.category_breakdown || []}
                      forecast={dashboardData.forecast || {}}
                      disposableFunds={dashboardData.disposable_funds || 0}
                      safeDailyAllowance={dashboardData.safe_daily_allowance || 0}
                      currency={currency}
                    />
                  </div>
                )}

                {/* 5. STREAK & CALENDAR VIEW */}
                {activeTab === 'calendar' && (
                  <div className="space-y-6">
                    <StreakCalendar
                      streakData={streakData}
                      currency={currency}
                    />
                  </div>
                )}
              </>
            )}
          </main>

          {/* Modals */}
          <CSVImportModal
            isOpen={isCSVModalOpen}
            onClose={() => setIsCSVModalOpen(false)}
            onImportSuccess={handleImportCSV}
            existingTransactions={transactions}
            currency={currency}
          />

          <WhatIfSimulator
            isOpen={isSimulatorOpen}
            onClose={() => setIsSimulatorOpen(false)}
            currentSda={dashboardData?.safe_daily_allowance || 0}
            remainingBalance={dashboardData?.remaining_balance || 0}
            daysRemaining={dashboardData?.days_remaining || 1}
            currency={currency}
            onLogAsExpense={handleAddTransaction}
            onSaveAsUpcoming={handleAddUpcoming}
          />

          <BudgetSetupModal
            isOpen={isSettingsOpen || isOnboardingOpen}
            isOnboarding={isOnboardingOpen}
            onClose={() => { setIsSettingsOpen(false); setIsOnboardingOpen(false); }}
            config={config}
            onSaveConfig={handleSaveConfig}
          />
        </div>
      )}
    </div>
  );
}