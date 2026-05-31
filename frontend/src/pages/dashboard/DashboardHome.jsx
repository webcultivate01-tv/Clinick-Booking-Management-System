import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiRefreshCw, FiCalendar, FiClock, FiCheckCircle, FiFlag,
  FiDollarSign, FiCreditCard, FiMessageSquare, FiStar, FiZap,
  FiArrowRight, FiInbox,
} from 'react-icons/fi';
import { api } from '../../api/axios';
import { selectUser } from '../../store/authSlice';
import { formatTime12, formatINR, formatDateLong } from '../../utils/formatters';

import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';
import MetricTile from '../../components/dashboard/MetricTile';
import StatusBadge from '../../components/common/StatusBadge';
import { DashboardHomeSkeleton } from '../../components/dashboard/Skeleton';
import ExportButtons from '../../components/dashboard/ExportButtons';
import {
  RevenueTrendChart,
  BookingsPerDayChart,
  StatusDonutChart,
  TopServicesChart,
} from '../../components/dashboard/charts/AnalyticsCharts';

/**
 * Dashboard home — admin sees full stats + analytics; staff sees the subset
 * returned by /api/staff/dashboard-stats. Layout follows the spec's section-6
 * page pattern (space-y-6 → header / 4 stat cards / metric row / charts / table).
 */
export default function DashboardHome() {
  const user = useSelector(selectUser);
  const isAdmin = user?.role === 'admin';

  const [stats, setStats] = useState(null);
  const [today, setToday] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const statsPath = isAdmin ? '/admin/dashboard-stats' : '/staff/dashboard-stats';
    const tasks = [api.get(statsPath), api.get('/appointments/today')];
    if (isAdmin) tasks.push(api.get('/admin/analytics', { params: { days: 30 } }));

    Promise.all(tasks)
      .then(([s, t, a]) => {
        setStats(s.data || {});
        setToday(t.data || []);
        if (a) setAnalytics(a.data);
      })
      .catch((err) => setError(err.message || 'Could not load dashboard'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardHomeSkeleton />;
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 text-[13px] text-red-600">
        {error}
      </div>
    );
  }

  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  });

  const queueColumns = [
    { key: 'queue_number',       label: 'Queue #' },
    { key: 'patient_name',       label: 'Patient' },
    { key: 'patient_mobile',     label: 'Mobile' },
    { key: 'service_title',      label: 'Service' },
    { label: 'Time',   map: (r) => formatTime12(r.appointment_time) },
    { label: 'Amount', map: (r) => (r.amount != null ? `INR ${r.amount}` : '') },
    { key: 'payment_status',     label: 'Payment' },
    { key: 'appointment_status', label: 'Status' },
  ];

  return (
    <div className="space-y-6">
      {/* 6.1 Page header */}
      <PageHeader
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'there'}`}
        subtitle="Here's a snapshot of what's happening across your clinic today."
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg">
          <FiCalendar className="text-[14px] text-slate-400" /> {dateLabel}
        </span>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <FiRefreshCw className="text-[14px]" /> Refresh
        </button>
        {isAdmin && (
          <ExportButtons
            filename="todays-queue"
            title="Today's Queue"
            subtitle={`${today.length} appointment${today.length === 1 ? '' : 's'} · ${formatDateLong(new Date().toISOString().slice(0, 10))}`}
            columns={queueColumns}
            rows={today}
          />
        )}
      </PageHeader>

      {/* 6.2 Stat cards (4 across) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard accent="blue"    iconNode={<FiCalendar className="text-base" />}    label="Today's Appointments" value={stats.today_count}     trend="Live" />
        <StatCard accent="amber"   iconNode={<FiClock className="text-base" />}       label="Pending"              value={stats.pending_count}   trend={stats.pending_count > 0 ? 'Awaiting' : undefined} trendTone="amber" />
        <StatCard accent="emerald" iconNode={<FiCheckCircle className="text-base" />} label="Confirmed"            value={stats.confirmed_count} />
        <StatCard accent="indigo"  iconNode={<FiFlag className="text-base" />}        label="Completed"            value={stats.completed_count} />
      </div>

      {/* Secondary metrics — same grid as stat cards for visual rhythm */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {isAdmin && (
          <MetricTile accent="emerald" iconNode={<FiDollarSign className="text-base" />}
                      label="Revenue (Paid)"
                      value={formatINR(stats.total_revenue || 0)} />
        )}
        {isAdmin && (
          <MetricTile accent="amber" iconNode={<FiCreditCard className="text-base" />}
                      label="Pending Payments"
                      value={stats.pending_payment_count ?? 0} />
        )}
        <MetricTile accent="blue" iconNode={<FiMessageSquare className="text-base" />}
                    label={isAdmin ? 'Total Enquiries' : 'New Enquiries'}
                    value={isAdmin ? stats.total_enquiries : stats.new_enquiries} />
        <MetricTile accent="rose" iconNode={<FiStar className="text-base" />}
                    label={isAdmin ? 'Total Reviews' : 'Pending Reviews'}
                    value={isAdmin ? stats.total_reviews : stats.pending_reviews} />
      </div>

      {/* Analytics charts — admin only */}
      {isAdmin && analytics && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <RevenueTrendChart   data={analytics.series} />
          <BookingsPerDayChart data={analytics.series} />
          <StatusDonutChart    data={analytics.status_breakdown} />
          <TopServicesChart    data={analytics.top_services} />
        </div>
      )}

      {/* 6.4 Data table card — Today's queue */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FiZap className="text-base" />
            </span>
            <div>
              <h3 className="font-semibold text-slate-900 text-[15px]">Today's Queue</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {Math.min(today.length, 8)} of {today.length} · first-booked first
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/today"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            View all <FiArrowRight className="text-[13px]" />
          </Link>
        </div>

        {today.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FiInbox className="text-2xl mx-auto text-slate-300 mb-2" />
            <p className="text-[13px] text-slate-500">No appointments booked for today yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Queue</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Patient</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Service</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Time</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Payment</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {today.slice(0, 8).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 font-mono text-[12px] font-semibold tabular-nums">
                        #{a.queue_number}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-[13px] font-semibold text-slate-900">{a.patient_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">{a.patient_mobile}</div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-slate-700">{a.service_title}</td>
                    <td className="px-5 py-3.5 text-[13px] text-slate-700 tabular-nums">{formatTime12(a.appointment_time)}</td>
                    <td className="px-5 py-3.5"><StatusBadge value={a.payment_status} /></td>
                    <td className="px-5 py-3.5"><StatusBadge value={a.appointment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
