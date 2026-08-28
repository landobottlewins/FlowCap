import {
    Calendar as CalendarIcon,
    Flame,
    X
} from 'lucide-react';
import { useState } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function StreakCalendar({
  streakData = {},
  currency = 'INR'
}) {
  const [selectedDay, setSelectedDay] = useState(null);

  const streakCount = streakData.streak_count || 0;
  const days = streakData.calendar_days || [];

  const statusColors = {
    under: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30',
    near: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',
    over: 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30',
    future: 'bg-slate-900/40 text-slate-600 border-slate-800'
  };

  const statusDots = {
    under: 'bg-emerald-400',
    near: 'bg-amber-400',
    over: 'bg-rose-400',
    future: 'bg-slate-700'
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/70 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      {/* Streak Hero Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Flame className="w-7 h-7 fill-amber-400 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                🔥 {streakCount} Day Under-Budget Streak
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {streakCount >= 7 
                ? 'Superb discipline! Keep the momentum going.' 
                : 'Stay within your daily allowance each day to grow your streak!'}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Under SDA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Near Limit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span>Over Budget</span>
          </div>
        </div>
      </div>

      {/* Calendar Matrix */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Current Budget Cycle Heatmap
          </h4>
          <span className="text-xs text-slate-400">Click any day for details</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((item) => {
            const isToday = item.is_today;
            const style = statusColors[item.status] || statusColors.future;
            const dot = statusDots[item.status] || statusDots.future;

            return (
              <button
                key={item.date}
                type="button"
                onClick={() => setSelectedDay(item)}
                className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-between transition-all aspect-square relative ${style} ${
                  isToday ? 'ring-2 ring-teal-400 shadow-md shadow-teal-500/20' : ''
                }`}
              >
                {isToday && (
                  <span className="absolute -top-1.5 right-1 text-[9px] bg-teal-400 text-slate-900 font-bold px-1.5 py-0.2 rounded-full">
                    Today
                  </span>
                )}
                <span className="text-xs font-bold text-slate-200">{item.day}</span>
                
                {item.status !== 'future' ? (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono font-semibold truncate max-w-full">
                      {formatCurrency(item.spent, currency)}
                    </span>
                    <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dot}`} />
                  </div>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-auto" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-teal-400" />
                {formatDate(selectedDay.date)}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Total Spent</span>
                <span className="text-base font-bold font-mono text-white">
                  {formatCurrency(selectedDay.spent, currency)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Safe Daily Allowance</span>
                <span className="text-base font-bold font-mono text-teal-300">
                  {formatCurrency(selectedDay.sda, currency)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Status</span>
                <span className={`px-2.5 py-0.5 rounded-full font-semibold ${
                  selectedDay.status === 'under' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                  selectedDay.status === 'near' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                  selectedDay.status === 'over' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                  'text-slate-500'
                }`}>
                  {selectedDay.status === 'under' ? '🟢 Under Allowance' :
                   selectedDay.status === 'near' ? '🟡 Near Limit' :
                   selectedDay.status === 'over' ? '🔴 Over Allowance' : 'Future Day'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-300">
                {selectedDay.spent === 0 ? (
                  <span>Zero expenses logged on this day. Funds rolled over to future allowance!</span>
                ) : selectedDay.spent <= selectedDay.sda ? (
                  <span>Spent {formatCurrency(selectedDay.spent, currency)}, saving {formatCurrency(selectedDay.sda - selectedDay.spent, currency)} to boost future SDA.</span>
                ) : (
                  <span>Overspent by {formatCurrency(selectedDay.spent - selectedDay.sda, currency)}. The overage was smoothed across the remaining cycle days.</span>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

