import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';
import { formatDateLong, formatTime12 } from '../../utils/formatters';

import PageHeader from '../../components/dashboard/PageHeader';
import Loader from '../../components/common/Loader';
import TimePickerAMPM from '../../components/common/TimePickerAMPM';

const TODAY_IST = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const SLOT_OPTIONS = [10, 15, 20, 30, 45, 60];

/**
 * Simple, staff-friendly OPD schedule manager.
 *
 * One combined view:
 *   - Pick a date (defaults to today).
 *   - Set start time, end time, slot length, open/closed.
 *   - Save. That date now uses these hours (overrides any default).
 *   - "Use clinic defaults" removes the override so defaults apply again.
 *   - Live preview shows the slot grid (booked / past / available) so the
 *     manager can see what patients will see.
 *
 * No separate "defaults vs overrides" UI — the defaults still live in DB
 * and apply on any unconfigured day, but day-to-day, staff just pick a
 * date and set the hours.
 */
export default function OpdSchedule() {
  const [date, setDate] = useState(TODAY_IST);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    start_time: '09:00',
    end_time: '18:00',
    slot_duration_minutes: 15,
    is_open: true,
    note: '',
  });
  const [source, setSource] = useState('default'); // 'override' | 'default'
  const [board, setBoard] = useState(null);

  async function loadDate(d) {
    setLoading(true);
    try {
      const [dayRes, slotsRes] = await Promise.all([
        api.get(`/opd/day/${d}`),
        api.get('/appointments/slots', { params: { date: d } }),
      ]);
      const schedule = dayRes.data.schedule;
      setForm({
        start_time: hhmm(schedule.start_time),
        end_time: hhmm(schedule.end_time),
        slot_duration_minutes: Number(schedule.slot_duration_minutes) || 15,
        is_open: !!schedule.is_open,
        note: schedule.note || '',
      });
      setSource(schedule.source);
      setBoard(slotsRes.data);
    } catch (err) {
      toast.error(err.message || 'Could not load schedule');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDate(date); }, [date]);

  async function save(e) {
    e?.preventDefault?.();
    setBusy(true);
    try {
      // Persist as a per-day override. The defaults endpoint stays available
      // (only via API) for the rare "change clinic forever" case.
      await api.put(`/opd/${date}`, {
        start_time: form.start_time,
        end_time: form.end_time,
        slot_duration_minutes: Number(form.slot_duration_minutes),
        is_open: form.is_open,
        note: form.note || null,
      });
      toast.success(`Saved hours for ${formatDateLong(date)}`);
      await loadDate(date);
    } catch (err) {
      toast.error(err.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function useDefaults() {
    if (source !== 'override') return;
    if (!window.confirm(`Remove custom hours for ${formatDateLong(date)} and fall back to defaults?`)) return;
    setBusy(true);
    try {
      await api.delete(`/opd/${date}`);
      toast.success('Reverted to defaults');
      await loadDate(date);
    } catch (err) {
      toast.error(err.message || 'Could not revert');
    } finally {
      setBusy(false);
    }
  }

  function setF(patch) { setForm((f) => ({ ...f, ...patch })); }

  return (
    <>
      <PageHeader title="OPD Schedule" subtitle="Set today's clinic hours and slot size">
        <button onClick={() => loadDate(date)} className="dbtn dbtn-secondary" disabled={loading || busy}>
          <i className="fa-solid fa-arrows-rotate"></i> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ----------- editor ----------- */}
        <section className="dash-card p-6 lg:col-span-2">
          <div className="mb-4">
            <label className="text-xs text-[#6b7385] block mb-1">Choose a date</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="dash-input"
                value={date}
                min={TODAY_IST}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                type="button"
                className="dbtn dbtn-secondary whitespace-nowrap"
                onClick={() => setDate(TODAY_IST)}
              >
                Today
              </button>
            </div>
            <p className="text-xs mt-2">
              {source === 'override'
                ? <span className="text-emerald-700"><i className="fa-solid fa-circle-check mr-1"></i>Custom hours saved for this date</span>
                : <span className="text-[#6b7385]"><i className="fa-regular fa-circle mr-1"></i>Using default hours</span>
              }
            </p>
          </div>

          {loading ? (
            <Loader label="Loading…" />
          ) : (
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-xs text-[#6b7385] block mb-1">Clinic state</label>
                <div className="flex gap-2">
                  <Toggle
                    active={form.is_open}
                    onClick={() => setF({ is_open: true })}
                    icon="fa-door-open"
                    label="Open"
                  />
                  <Toggle
                    active={!form.is_open}
                    onClick={() => setF({ is_open: false })}
                    icon="fa-door-closed"
                    label="Closed (holiday)"
                  />
                </div>
              </div>

              <fieldset disabled={!form.is_open} className={form.is_open ? '' : 'opacity-60'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#6b7385] block mb-1">OPD starts at</label>
                    <TimePickerAMPM value={form.start_time} onChange={(v) => setF({ start_time: v })} />
                  </div>
                  <div>
                    <label className="text-xs text-[#6b7385] block mb-1">OPD ends at</label>
                    <TimePickerAMPM value={form.end_time} onChange={(v) => setF({ end_time: v })} />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs text-[#6b7385] block mb-1">Each appointment takes</label>
                  <div className="flex flex-wrap gap-2">
                    {SLOT_OPTIONS.map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setF({ slot_duration_minutes: m })}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                          form.slot_duration_minutes === m
                            ? 'border-admin-deep bg-admin-soft text-admin-deep font-semibold'
                            : 'border-dash-line bg-white text-[#2d3142] hover:bg-[#f6f7fb]'
                        }`}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>
              </fieldset>

              <div>
                <label className="text-xs text-[#6b7385] block mb-1">Note (optional, only staff sees this)</label>
                <input
                  type="text"
                  className="dash-input"
                  value={form.note}
                  maxLength={255}
                  placeholder="Eg. Doctor on leave"
                  onChange={(e) => setF({ note: e.target.value })}
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-dash-line">
                <button className="dbtn dbtn-primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Save hours for this date'}
                </button>
                {source === 'override' && (
                  <button
                    type="button"
                    className="dbtn dbtn-secondary"
                    onClick={useDefaults}
                    disabled={busy}
                    title="Remove custom hours so clinic defaults apply"
                  >
                    Use clinic defaults
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        {/* ----------- preview ----------- */}
        <section className="dash-card p-6 lg:col-span-3">
          <h3 className="text-base font-semibold text-[#1f2230] mb-1">
            <i className="fa-regular fa-eye text-admin mr-2"></i>
            Slot preview · {formatDateLong(date)}
          </h3>
          <p className="text-xs text-[#6b7385] mb-4">
            This is exactly what patients will see when they pick this date.
          </p>

          {!board && !loading && <p className="text-sm text-[#6b7385]">No preview available.</p>}

          {board && !board.is_open && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {board.note || 'Clinic is closed on this date.'}
            </div>
          )}

          {board?.is_open && board.slots.length === 0 && (
            <p className="text-sm text-[#6b7385]">No slots — please widen the OPD window.</p>
          )}

          {board?.is_open && board.slots.length > 0 && (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {board.slots.map((s) => {
                  let cls = 'px-2 py-2 text-xs sm:text-sm rounded-lg border text-center font-medium';
                  if (s.status === 'booked') cls += ' border-rose-200 bg-rose-50 text-rose-500 line-through';
                  else if (s.status === 'past') cls += ' border-gray-200 bg-gray-100 text-gray-400';
                  else cls += ' border-emerald-200 bg-emerald-50 text-emerald-700';
                  return <span key={s.time} className={cls}>{formatTime12(s.time)}</span>;
                })}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-[#6b7385] mt-4">
                <Legend cls="border-emerald-200 bg-emerald-50" label="Available" />
                <Legend cls="border-rose-200 bg-rose-50" label="Booked" />
                <Legend cls="border-gray-200 bg-gray-100" label="Past" />
              </div>
              <p className="text-xs text-[#6b7385] mt-3">
                OPD {formatTime12(board.start_time)} – {formatTime12(board.end_time)} · {board.slot_duration_minutes} min per slot · {board.slots.length} total
              </p>
            </>
          )}
        </section>
      </div>
    </>
  );
}

function Toggle({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition ${
        active
          ? 'border-admin-deep bg-admin-soft text-admin-deep'
          : 'border-dash-line bg-white text-[#6b7385] hover:bg-[#f6f7fb]'
      }`}
    >
      <i className={`fa-solid ${icon} mr-2`}></i>{label}
    </button>
  );
}

function Legend({ cls, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3.5 h-3.5 rounded border ${cls}`}></span>
      {label}
    </span>
  );
}

function hhmm(t) {
  if (!t) return '';
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}
