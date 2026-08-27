import { useEffect, useState } from 'react';

const API_BASE = "https://flowcap-backend.onrender.com/api";

export default function App() {
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to connect to backend engine:", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/transactions`);
      const json = await res.json();
      setTransactions(json);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchTransactions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) return;
    
    await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(amount), category, note })
    });

    setAmount('');
    setNote('');
    fetchDashboard();
    fetchTransactions();
  };

  if (!data) return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-mono text-sm">
      Connecting to FlowCap Backend... Ensure python main.py is running!
    </div>
  );

  const isOverBudget = data.spent_today > data.safe_daily_allowance;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-400">FlowCap</h1>
          <span className="text-sm bg-slate-800 px-3 py-1 rounded-full text-slate-400">
            {data.days_remaining} Days Left in Cycle
          </span>
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

        {/* Financial Metrics Summary */}
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

        {/* Input & Log Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Expense Logger Form */}
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
                placeholder="Lunch with team"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded transition-colors"
            >
              Add Expense
            </button>
          </form>

          {/* History List */}
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
    </div>
  );
}