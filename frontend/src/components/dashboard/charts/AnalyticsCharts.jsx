import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { FiTrendingUp, FiCalendar, FiPieChart, FiPackage } from 'react-icons/fi';
import ChartCard from './ChartCard';
import { formatINR } from '../../../utils/formatters';

// Spec status palette: pending→amber, confirmed→blue, completed→emerald,
// cancelled→red, no_show→slate, rescheduled→amber.
const STATUS_COLORS = {
  pending:     '#d97706', // amber-600
  confirmed:   '#2563eb', // blue-600
  completed:   '#059669', // emerald-600
  cancelled:   '#dc2626', // red-600
  no_show:     '#64748b', // slate-500
  rescheduled: '#f59e0b', // amber-500
};

const formatDayShort = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const formatRevenue = (v) => {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${v}`;
};

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  fontSize: '12px',
  color: '#0f172a',
};

/* ------------------------- Revenue trend (line) ------------------------- */
export function RevenueTrendChart({ data }) {
  return (
    <ChartCard
      title="Revenue trend"
      subtitle={`Paid revenue · last ${data.length} days`}
      icon={FiTrendingUp}
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="day" tickFormatter={formatDayShort} stroke="#94a3b8" fontSize={11} tickMargin={6} />
          <YAxis tickFormatter={formatRevenue} stroke="#94a3b8" fontSize={11} width={56} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={formatDayShort}
            formatter={(value) => [formatINR(value), 'Revenue']}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#2563eb' }}
            activeDot={{ r: 5 }}
            fill="url(#revGrad)"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ----------------------- Bookings per day (bar) ------------------------ */
export function BookingsPerDayChart({ data }) {
  return (
    <ChartCard
      title="Appointments per day"
      subtitle={`Booking volume · last ${data.length} days`}
      icon={FiCalendar}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="day" tickFormatter={formatDayShort} stroke="#94a3b8" fontSize={11} tickMargin={6} />
          <YAxis stroke="#94a3b8" fontSize={11} width={36} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={formatDayShort}
            formatter={(value) => [value, 'Bookings']}
          />
          <Bar dataKey="bookings" fill="#1f6fd0" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ----------------------- Status breakdown (donut) ----------------------- */
export function StatusDonutChart({ data }) {
  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);

  return (
    <ChartCard
      title="Status breakdown"
      subtitle={`${total} appointment${total === 1 ? '' : 's'} total`}
      icon={FiPieChart}
    >
      <ResponsiveContainer>
        <PieChart>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, _name, p) => [value, p.payload.status.replace('_', ' ')]}
          />
          <Legend
            iconType="circle"
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ fontSize: '0.78rem', color: '#4a5168' }}
            formatter={(v) => v.replace('_', ' ')}
          />
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            innerRadius={50}
            outerRadius={84}
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ----------------------- Top services (horiz bar) ----------------------- */
export function TopServicesChart({ data }) {
  // Recharts doesn't wrap long labels — truncate so the Y axis stays readable.
  const prepared = data.map((d) => ({
    ...d,
    label: d.title.length > 26 ? `${d.title.slice(0, 24)}…` : d.title,
  }));

  return (
    <ChartCard
      title="Top services"
      subtitle="Most-booked services"
      icon={FiPackage}
    >
      <ResponsiveContainer>
        <BarChart
          data={prepared}
          layout="vertical"
          margin={{ top: 6, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            stroke="#4a5168"
            fontSize={11}
            width={160}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, _n, p) => [`${value} bookings`, p.payload.title]}
            labelFormatter={() => ''}
          />
          <Bar dataKey="bookings" fill="#0d9488" radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
