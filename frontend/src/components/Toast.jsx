import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400" />,
    info: <Info className="w-5 h-5 text-sky-400" />
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-200',
    error: 'border-rose-500/30 bg-rose-950/80 text-rose-200',
    info: 'border-sky-500/30 bg-sky-950/80 text-sky-200'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md ${borders[type] || borders.success}`}>
        {icons[type] || icons.success}
        <span className="text-sm font-medium">{message}</span>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:opacity-75 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

