import { useEffect, useState } from 'react';

const API_BASE = "http://localhost:8000/api";

function Dashboard({ token, username, onLogout }) {
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard`, { headers: authHeaders });
      if (res.ok) setData(await res.json());
      else if (res.status === 401) onLogout();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/transactions`, { headers: authHeaders });
      if (res.ok) setTransactions(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchTransactions();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) return;
    
    await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ amount: parseFloat(amount), category, note })
    });

    setAmount('');
    setNote('');
    fetchDashboard();
    fetchTransactions();
  };

  if (!data) return <div className="text-white text-center p-10 font-mono">Loading FlowCap Dashboard...</div>;

  const isOverBudget = data.spent_today > data.safe_daily_allowance;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-emerald-400 tracking-tight">FlowCap</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
            User: <strong>{username}</strong>
          </span>
          <button 
            onClick={onLogout} 
            className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1 rounded transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Hero Card: Dynamic Allowance */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">
          Safe Daily Allowance (SDA)
        </div>
        <div className="text-5xl font-extrabold my-3 text-white">
          ${data.safe_daily_allowance.toFixed(2)}
          <span className="text-lg text-slate-400 font-normal"> / day</span>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700/60 flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-400">Spent Today</p>
            <p className={`text-lg font-bold ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
              ${data.spent_today.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Pacing Status</p>
            <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold mt-1 ${
              isOverBudget ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {isOverBudget ? 'Over Safe Pace' : 'On Track'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400">Disposable Income</p>
          <p className="text-lg font-semibold text-slate-200">${data.disposable_funds}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400">Total Spent</p>
          <p className="text-lg font-semibold text-slate-200">${data.total_spent}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400">Remaining Balance</p>
          <p className="text-lg font-semibold text-slate-200">${data.remaining_balance}</p>
        </div>
      </div>

      {/* Input Form & Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 p-5 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Log Expense</h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
              placeholder="12.50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option>Food</option>
              <option>Entertainment</option>
              <option>Transport</option>
              <option>Utilities</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
              placeholder="Coffee with team"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded transition-colors"
          >
            Add Expense
          </button>
        </form>

        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl flex flex-col">
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Recent Transactions</h2>
          <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">No expenses logged yet.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{tx.category}</p>
                    <p className="text-xs text-slate-500">{tx.note || tx.date}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-300">-${tx.amount.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('flowcap_token'));
  const [username, setUsername] = useState(localStorage.getItem('flowcap_user') || '');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isRegistering ? '/register' : '/login';

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: inputUsername, password: inputPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      localStorage.setItem('flowcap_token', data.token);
      localStorage.setItem('flowcap_user', data.username);
      setToken(data.token);
      setUsername(data.username);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('flowcap_token');
    localStorage.removeItem('flowcap_user');
    setToken(null);
    setUsername('');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      {!token ? (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl">
            <h1 className="text-3xl font-extrabold text-emerald-400 text-center mb-2">FlowCap</h1>
            <p className="text-xs text-slate-400 text-center mb-6">Dynamic Allowance & Micro-Budgeting Engine</p>

            {/* Auth Toggle Tabs */}
            <div className="flex border-b border-slate-700 mb-6">
              <button
                type="button"
                onClick={() => { setIsRegistering(false); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors ${
                  !isRegistering ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegistering(true); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors ${
                  isRegistering ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">User ID / Username</label>
                <input
                  type="text"
                  required
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="alex_dev"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded transition-colors mt-2"
              >
                {isRegistering ? 'Register' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <Dashboard token={token} username={username} onLogout={handleLogout} />
      )}
    </div>
  );
}