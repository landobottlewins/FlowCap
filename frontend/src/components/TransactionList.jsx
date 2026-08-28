import {
    Calendar,
    Car,
    Edit2,
    Film,
    GraduationCap,
    Plus,
    Receipt,
    RefreshCw,
    Search,
    ShoppingBag,
    Tag,
    Trash2,
    Utensils,
    X
} from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES, CATEGORY_COLORS, formatCurrency, formatDate } from '../utils/formatters';

const CATEGORY_ICONS = {
  Food: <Utensils className="w-3.5 h-3.5" />,
  Transport: <Car className="w-3.5 h-3.5" />,
  Entertainment: <Film className="w-3.5 h-3.5" />,
  Shopping: <ShoppingBag className="w-3.5 h-3.5" />,
  Education: <GraduationCap className="w-3.5 h-3.5" />,
  Bills: <Receipt className="w-3.5 h-3.5" />,
  Subscriptions: <RefreshCw className="w-3.5 h-3.5" />,
  Other: <Tag className="w-3.5 h-3.5" />
};

export default function TransactionList({
  transactions,
  currency,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  isAddModalOpen,
  setIsAddModalOpen
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingTx, setEditingTx] = useState(null);

  // Form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [dateVal, setDateVal] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [txType, setTxType] = useState('expense');

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesCat = selectedCategory === 'All' || tx.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.category && tx.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tx.amount.toString().includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  const handleOpenAdd = () => {
    setAmount('');
    setCategory('Food');
    setDateVal(new Date().toISOString().split('T')[0]);
    setNote('');
    setTxType('expense');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setAmount(tx.amount.toString());
    setCategory(tx.category);
    setDateVal(tx.date);
    setNote(tx.note || '');
    setTxType(tx.type || 'expense');
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    await onAddTransaction({
      amount: parseFloat(amount),
      category,
      date: dateVal,
      note,
      type: txType
    });
    setIsAddModalOpen(false);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingTx || !amount || parseFloat(amount) <= 0) return;
    await onUpdateTransaction(editingTx.id, {
      amount: parseFloat(amount),
      category,
      date: dateVal,
      note,
      type: txType
    });
    setEditingTx(null);
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/70 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      {/* Header with Search and Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Transactions</h3>
          <p className="text-xs text-slate-400">All expenses and income influencing your SDA</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Add Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all ml-auto sm:ml-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-700/60 rounded-2xl bg-slate-900/40">
            <Tag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">No transactions found</p>
            <p className="text-xs text-slate-500 mt-1">Log a transaction or import a BHIM UPI PDF to update your daily allowance</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const catStyle = CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.Other;
            const isIncome = tx.type === 'income';

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all group"
              >
                {/* Left: Icon & Info */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                    {CATEGORY_ICONS[tx.category] || <Tag className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        {tx.note || tx.category}
                      </span>
                      <span className={`text-[10px] px-2 py-0.2 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                        {tx.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{formatDate(tx.date)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-sm font-bold font-mono ${isIncome ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(tx)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                      title="Edit Transaction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                      title="Delete Transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingTx) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">
                {editingTx ? 'Edit Transaction' : 'Log New Transaction'}
              </h3>
              <button
                onClick={() => { setIsAddModalOpen(false); setEditingTx(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingTx ? handleSubmitEdit : handleSubmitAdd} className="space-y-4">
              {/* Type Switch (Expense / Income) */}
              <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    txType === 'expense' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    txType === 'income' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400'
                  }`}
                >
                  Income / Top-up
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="250.00"
                  autoFocus
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={dateVal}
                  onChange={(e) => setDateVal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Note / Description */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Grocery shopping at supermarket"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingTx(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all"
                >
                  {editingTx ? 'Save Changes' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
