import {
    AlertCircle,
    CheckCircle2,
    FileSpreadsheet,
    RefreshCw,
    Sparkles,
    Trash2,
    UploadCloud,
    X
} from 'lucide-react';
import { useRef, useState } from 'react';
import { CATEGORIES, formatCurrency } from '../utils/formatters';

export default function CSVImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  existingTransactions = [],
  currency = 'INR'
}) {
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [parsedPreview, setParsedPreview] = useState([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Column Mappings
  const [dateCol, setDateCol] = useState('');
  const [descCol, setDescCol] = useState('');
  const [amountCol, setAmountCol] = useState('');
  const [typeCol, setTypeCol] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Simple CSV Parser
  const parseCSVText = (text) => {
    const lines = text.split(/\r\n|\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error('CSV file must have a header and at least one data row.');

    // Determine delimiter (comma, semicolon, tab)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    let delimiter = ',';
    if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
    if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

    const parseLine = (line) => {
      const row = [];
      let inQuotes = false;
      let token = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          row.push(token.trim().replace(/^["']|["']$/g, ''));
          token = '';
        } else {
          token += char;
        }
      }
      row.push(token.trim().replace(/^["']|["']$/g, ''));
      return row;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine).filter((r) => r.length === headers.length || r.length >= 2);

    return { headers, rows };
  };

  // Intelligent Column Mapping Helper
  const autoDetectColumns = (headers) => {
    let dCol = headers[0] || '';
    let desCol = headers[1] || '';
    let aCol = headers[2] || '';
    let tCol = '';

    headers.forEach((h) => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('date') || lower.includes('time') || lower.includes('txn') && lower.includes('dt')) {
        dCol = h;
      } else if (lower.includes('desc') || lower.includes('narration') || lower.includes('particular') || lower.includes('remark') || lower.includes('payee')) {
        desCol = h;
      } else if (lower.includes('amount') || lower.includes('debit') || lower.includes('spent') || lower.includes('inr') || lower.includes('value')) {
        aCol = h;
      } else if (lower.includes('type') || lower.includes('drcr') || lower.includes('status')) {
        tCol = h;
      }
    });

    setDateCol(dCol);
    setDescCol(desCol);
    setAmountCol(aCol);
    setTypeCol(tCol);

    return { dCol, desCol, aCol, tCol };
  };

  // Keyword auto-categorization
  const guessCategory = (description = '') => {
    const d = description.toLowerCase();
    if (d.includes('swiggy') || d.includes('zomato') || d.includes('restaurant') || d.includes('cafe') || d.includes('coffee') || d.includes('tea') || d.includes('grocer') || d.includes('supermarket') || d.includes('food') || d.includes('bakery') || d.includes('lunch') || d.includes('dinner')) {
      return 'Food';
    }
    if (d.includes('uber') || d.includes('ola') || d.includes('metro') || d.includes('fuel') || d.includes('petrol') || d.includes('cab') || d.includes('train') || d.includes('bus') || d.includes('rapido') || d.includes('auto')) {
      return 'Transport';
    }
    if (d.includes('netflix') || d.includes('spotify') || d.includes('prime') || d.includes('youtube') || d.includes('subscription') || d.includes('icloud') || d.includes('apple') || d.includes('patreon')) {
      return 'Subscriptions';
    }
    if (d.includes('movie') || d.includes('cinema') || d.includes('pvr') || d.includes('inox') || d.includes('game') || d.includes('steam') || d.includes('playstation') || d.includes('pub') || d.includes('club')) {
      return 'Entertainment';
    }
    if (d.includes('amazon') || d.includes('flipkart') || d.includes('myntra') || d.includes('zara') || d.includes('h&m') || d.includes('shopping') || d.includes('clothing') || d.includes('store') || d.includes('mall')) {
      return 'Shopping';
    }
    if (d.includes('fee') || d.includes('college') || d.includes('tuition') || d.includes('course') || d.includes('udemy') || d.includes('book') || d.includes('coursera') || d.includes('exam')) {
      return 'Education';
    }
    if (d.includes('electric') || d.includes('water') || d.includes('wifi') || d.includes('broadband') || d.includes('recharge') || d.includes('airtel') || d.includes('jio') || d.includes('bill') || d.includes('rent')) {
      return 'Bills';
    }
    return 'Other';
  };

  const processRowsWithMapping = (headers, rows, dC, desC, aC, tC) => {
    const dIdx = headers.indexOf(dC);
    const desIdx = headers.indexOf(desC);
    const aIdx = headers.indexOf(aC);
    const tIdx = headers.indexOf(tC);

    const existingKeys = new Set(
      existingTransactions.map((tx) => `${tx.amount}_${tx.date}_${(tx.note || '').trim().toLowerCase()}`)
    );

    let dupes = 0;
    const parsed = [];

    rows.forEach((row, i) => {
      const rawAmtStr = (row[aIdx] || '').replace(/[^0-9.-]/g, '');
      const rawAmt = parseFloat(rawAmtStr);
      if (isNaN(rawAmt) || rawAmt === 0) return;

      const rawDesc = (row[desIdx] || `Transaction ${i + 1}`).trim();
      
      // Parse Date (handles DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY)
      let parsedDate = new Date().toISOString().split('T')[0];
      const rawDateStr = (row[dIdx] || '').trim();
      if (rawDateStr) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDateStr)) {
          parsedDate = rawDateStr;
        } else if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(rawDateStr)) {
          const parts = rawDateStr.split(/[\/-]/);
          // Standard day/month/year assumption
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          parsedDate = `${year}-${month}-${day}`;
        }
      }

      // Check type
      let type = 'expense';
      if (tIdx !== -1) {
        const rawType = (row[tIdx] || '').toLowerCase();
        if (rawType.includes('cr') || rawType.includes('credit') || rawType.includes('income')) {
          type = 'income';
        }
      }

      const category = guessCategory(rawDesc);
      const isDuplicate = existingKeys.has(`${Math.abs(rawAmt)}_${parsedDate}_${rawDesc.toLowerCase()}`);
      if (isDuplicate) dupes++;

      parsed.push({
        id: `csv-${i}`,
        amount: Math.abs(rawAmt),
        category,
        date: parsedDate,
        note: rawDesc,
        type,
        isDuplicate
      });
    });

    setDuplicatesCount(dupes);
    setParsedPreview(parsed);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    loadFile(selectedFile);
  };

  const loadFile = (uploadedFile) => {
    if (!uploadedFile.name.endsWith('.csv') && uploadedFile.type !== 'text/csv') {
      setErrorMsg('Please upload a valid .csv file.');
      return;
    }
    setErrorMsg('');
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const { headers, rows } = parseCSVText(text);
        setRawHeaders(headers);
        setRawRows(rows);

        const { dCol, desCol, aCol, tCol } = autoDetectColumns(headers);
        processRowsWithMapping(headers, rows, dCol, desCol, aCol, tCol);
      } catch (err) {
        setErrorMsg(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(uploadedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemap = (newDateCol, newDescCol, newAmountCol, newTypeCol) => {
    setDateCol(newDateCol);
    setDescCol(newDescCol);
    setAmountCol(newAmountCol);
    setTypeCol(newTypeCol);
    processRowsWithMapping(rawHeaders, rawRows, newDateCol, newDescCol, newAmountCol, newTypeCol);
  };

  const handleCategoryChange = (index, newCat) => {
    setParsedPreview((prev) => {
      const copy = [...prev];
      copy[index].category = newCat;
      return copy;
    });
  };

  const handleRemoveRow = (index) => {
    setParsedPreview((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmImport = async () => {
    if (parsedPreview.length === 0) return;
    setIsProcessing(true);
    try {
      const itemsToImport = parsedPreview.map((item) => ({
        amount: item.amount,
        category: item.category,
        date: item.date,
        note: item.note,
        type: item.type
      }));

      await onImportSuccess(itemsToImport);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Import failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Import CSV Statement</h3>
              <p className="text-xs text-slate-400">Upload bank or UPI statement to update your daily allowance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!file ? (
            /* Drag & Drop Zone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
              }`}
            >
              <UploadCloud className="w-12 h-12 text-emerald-400 mb-3 animate-bounce" />
              <p className="text-sm font-semibold text-slate-200">
                Drag and drop your bank CSV file here
              </p>
              <p className="text-xs text-slate-400 mt-1">or click to browse from your computer</p>
              <span className="mt-4 text-[11px] px-3 py-1 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                Supports HDFC, SBI, ICICI, Axis, Paytm, and standard CSV statements
              </span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,text/csv"
                className="hidden"
              />
            </div>
          ) : (
            /* Column Mapping & Preview */
            <div className="space-y-4">
              {/* Column Mapping Selector */}
              <div className="p-4 bg-slate-900/70 border border-slate-700/80 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    Column Auto-Mapping
                  </span>
                  <span className="text-[11px] text-slate-400">{file.name}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Date Column</label>
                    <select
                      value={dateCol}
                      onChange={(e) => handleRemap(e.target.value, descCol, amountCol, typeCol)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Description Column</label>
                    <select
                      value={descCol}
                      onChange={(e) => handleRemap(dateCol, e.target.value, amountCol, typeCol)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Amount Column</label>
                    <select
                      value={amountCol}
                      onChange={(e) => handleRemap(dateCol, descCol, e.target.value, typeCol)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Type/Dr/Cr (Optional)</label>
                    <select
                      value={typeCol}
                      onChange={(e) => handleRemap(dateCol, descCol, amountCol, e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">None (All Expenses)</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Duplicate Summary Banner */}
              {duplicatesCount > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl flex items-center justify-between">
                  <span>⚠️ {duplicatesCount} potential duplicate transaction(s) detected and highlighted.</span>
                </div>
              )}

              {/* Transactions Preview Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Preview ({parsedPreview.length} items ready to import)
                  </span>
                  <button
                    onClick={() => { setFile(null); setParsedPreview([]); }}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Choose Different File
                  </button>
                </div>

                <div className="border border-slate-700 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700 sticky top-0">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                      {parsedPreview.map((item, idx) => (
                        <tr key={item.id} className={`hover:bg-slate-800/50 ${item.isDuplicate ? 'bg-amber-500/5' : ''}`}>
                          <td className="p-2.5 text-slate-300 whitespace-nowrap">{item.date}</td>
                          <td className="p-2.5 text-slate-200 truncate max-w-[200px]" title={item.note}>
                            {item.note}
                            {item.isDuplicate && (
                              <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full">
                                Duplicate
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <select
                              value={item.category}
                              onChange={(e) => handleCategoryChange(idx, e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-200">
                            {formatCurrency(item.amount, currency)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedPreview.length === 0 || isProcessing}
            onClick={handleConfirmImport}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importing & Recalculating...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Import {parsedPreview.length} Transactions</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

