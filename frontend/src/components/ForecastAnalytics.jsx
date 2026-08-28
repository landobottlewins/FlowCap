import {
    BarChart3,
    CalendarX,
    LineChart as LineIcon,
    PieChart as PieIcon,
    Sparkles,
    TrendingUp
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { CATEGORY_COLORS, formatCurrency } from '../utils/formatters';

export default function ForecastAnalytics({
  dailyHistory = [],
  categoryBreakdown = [],
  forecast = {},
  disposableFunds = 0,
  safeDailyAllowance = 0,
  currency = 'INR'
}) {
  const chartDailyData = dailyHistory
    .filter((d) => d.spent !== null)
    .map((d) => ({
      name: `${d.day} (${d.day_name})`,
      Spent: d.spent,
      Allowance: d.sda
    }));

  const burndownData = dailyHistory
    .filter((d) => d.budget_burndown !== null)
    .map((d) => ({
      name: `${d.day}`,
      Remaining: d.budget_burndown,
      TotalSpent: d.cumulative_spent
    }));

  const pieData = categoryBreakdown.map((c) => ({
    name: c.category,
    value: c.amount,
    color: (CATEGORY_COLORS[c.category] && CATEGORY_COLORS[c.category].color) || '#64748b'
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs">
          <p className="font-bold text-slate-200 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="font-semibold font-mono">
              {entry.name}: {formatCurrency(entry.value, currency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Forecast Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-3xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Projected Month-End
            </span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono ${
            (forecast.projected_remaining_balance || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {formatCurrency(forecast.projected_remaining_balance || 0, currency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Based on current daily velocity
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-3xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Estimated Total Spend
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatCurrency(forecast.estimated_cycle_spending || 0, currency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Projected cycle spending
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-3xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Runway Status
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <CalendarX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {forecast.runout_days_early > 0 ? (
              <span className="text-rose-400">Runs out {forecast.runout_days_early}d early</span>
            ) : (
              <span className="text-emerald-400">Full Month Covered</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {forecast.runout_date ? `Projected exhaustion: ${forecast.runout_date}` : 'Spending is fully sustainable'}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Spending vs SDA */}
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 sm:p-6 rounded-3xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Daily Spending vs Safe Daily Allowance</h3>
              <p className="text-[11px] text-slate-400">Actual daily spend bars vs the dynamic SDA line</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartDailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No daily transaction data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Spent" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Allowance" stroke="#10b981" strokeWidth={2} dot={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Category Breakdown */}
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 sm:p-6 rounded-3xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Category Spending Breakdown</h3>
              <p className="text-[11px] text-slate-400">Distribution of discretionary expenses</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center">
            {pieData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                No category expense data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Budget Burn-Down & Velocity */}
        <div className="col-span-1 lg:col-span-2 bg-slate-800/80 border border-slate-700/70 p-5 sm:p-6 rounded-3xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <LineIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Budget Burn-Down Trajectory</h3>
              <p className="text-[11px] text-slate-400">Remaining disposable funds decaying over the cycle</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {burndownData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No cycle trajectory data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burndownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="Remaining"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRemaining)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

