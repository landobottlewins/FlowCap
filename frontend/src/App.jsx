import { GoogleLogin, googleLogout, GoogleOAuthProvider } from '@react-oauth/google';
import { useEffect, useState } from 'react';

const API_BASE = "https://flowcap-backend.onrender.com"; 
// Replace with your actual Render URL
// Replace with your actual Client ID
const GOOGLE_CLIENT_ID = "994951090257-36fnidmbdc76o0nfdtbmqm2ktvlgig0e.apps.googleusercontent.com";

function Dashboard({ token, onLogout }) {
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');

  // Helper to attach the Google token to all requests
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const fetchDashboard = async () => {
    const res = await fetch(`${API_BASE}/dashboard`, { headers: authHeaders });
    if (res.ok) setData(await res.json());
  };

  const fetchTransactions = async () => {
    const res = await fetch(`${API_BASE}/transactions`, { headers: authHeaders });
    if (res.ok) setTransactions(await res.json());
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

  if (!data) return <div className="text-white text-center p-10">Loading your secure dashboard...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-emerald-400">FlowCap</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{data.user}</span>
          <button onClick={onLogout} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-slate-300">
            Sign Out
          </button>
        </div>
      </header>

      {/* Hero Card */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative">
        <div className="text-slate-400 text-sm font-semibold uppercase">Safe Daily Allowance</div>
        <div className="text-5xl font-extrabold my-3 text-white">
          ${data.safe_daily_allowance.toFixed(2)} <span className="text-lg text-slate-400 font-normal">/ day</span>
        </div>
        <p className="text-sm text-slate-400">Spent today: ${data.spent_today.toFixed(2)}</p>
      </div>

      {/* Form & History - simplified for brevity, paste your previous UI here */}
      <form onSubmit={handleSubmit} className="bg-slate-800 p-5 rounded-xl flex gap-2">
         <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="p-2 rounded bg-slate-900 text-white w-24" />
         <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Note" className="p-2 rounded bg-slate-900 text-white flex-1" />
         <button type="submit" className="bg-emerald-600 px-4 rounded text-white font-bold">Add</button>
      </form>
      
      <div className="bg-slate-800 p-5 rounded-xl">
        <h2 className="text-lg text-white mb-2">History</h2>
        {transactions.map(tx => (
           <div key={tx.id} className="flex justify-between text-slate-300 py-1 border-b border-slate-700">
              <span>{tx.category} - {tx.note}</span>
              <span>${tx.amount.toFixed(2)}</span>
           </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('flowcap_token'));

  const handleLoginSuccess = (credentialResponse) => {
    const jwt = credentialResponse.credential;
    localStorage.setItem('flowcap_token', jwt);
    setToken(jwt);
  };

  const handleLogout = () => {
    googleLogout();
    localStorage.removeItem('flowcap_token');
    setToken(null);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-slate-900 p-6 font-sans">
        {!token ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
            <h1 className="text-4xl font-bold text-emerald-400">FlowCap</h1>
            <p className="text-slate-400 text-center max-w-md">Sign in to sync your dynamic budget across devices securely.</p>
            <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl">
              <GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log('Login Failed')} />
            </div>
          </div>
        ) : (
          <Dashboard token={token} onLogout={handleLogout} />
        )}
      </div>
    </GoogleOAuthProvider>
  );
}