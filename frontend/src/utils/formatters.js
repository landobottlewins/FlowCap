export const CURRENCIES = {
  INR: { symbol: '₹', code: 'INR', label: 'INR (₹)' },
  USD: { symbol: '$', code: 'USD', label: 'USD ($)' },
  EUR: { symbol: '€', code: 'EUR', label: 'EUR (€)' },
  GBP: { symbol: '£', code: 'GBP', label: 'GBP (£)' }
};

export function formatCurrency(amount, currencyCode = 'INR') {
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }
  const curr = CURRENCIES[currencyCode] || CURRENCIES.INR;
  
  if (currencyCode === 'INR') {
    // Indian numbering format (e.g., ₹1,50,000.00)
    return `${curr.symbol}${Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  return `${curr.symbol}${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export const CATEGORY_COLORS = {
  Food: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', color: '#10b981' },
  Transport: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', color: '#0284c7' },
  Entertainment: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', color: '#a855f7' },
  Shopping: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', color: '#f59e0b' },
  Education: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', color: '#6366f1' },
  Bills: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', color: '#f43f5e' },
  Subscriptions: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', color: '#06b6d4' },
  Other: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', color: '#64748b' }
};

export const CATEGORIES = [
  'Food',
  'Transport',
  'Entertainment',
  'Shopping',
  'Education',
  'Bills',
  'Subscriptions',
  'Other'
];

