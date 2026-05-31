import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exporters';

/**
 * Single "Export" button that opens a wizard:
 *   1. Refine date range (only shown when `dateField` is provided)
 *   2. Pick which columns to include
 *   3. Choose format (PDF / Excel / CSV) and download
 *
 *   <ExportButtons
 *     filename="appointments"
 *     title="Appointments report"
 *     subtitle="42 results · filter: This week"
 *     columns={[{ key:'name', label:'Name' }, { label:'Amount', map: r => r.amount }]}
 *     rows={rows}
 *     dateField="appointment_date"   // optional, enables the date-range step
 *   />
 */
export default function ExportButtons({
  filename,
  title,
  subtitle = '',
  columns,
  rows,
  orientation = 'landscape',
  disabled = false,
  className = '',
  dateField = '',
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState('excel');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(() => columns.map(colKey));

  const empty = !rows || rows.length === 0 || disabled;

  useEffect(() => {
    setSelectedKeys(columns.map(colKey));
  }, [columns]);

  useEffect(() => {
    if (open) {
      setFrom('');
      setTo('');
      setFormat('excel');
      setSelectedKeys(columns.map(colKey));
    }
  }, [open, columns]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const filteredRows = useMemo(() => {
    if (!dateField || (!from && !to)) return rows || [];
    const fromTs = from ? new Date(from + 'T00:00:00').getTime() : -Infinity;
    const toTs = to ? new Date(to + 'T23:59:59').getTime() : Infinity;
    return (rows || []).filter((r) => {
      const raw = r?.[dateField];
      if (!raw) return false;
      const ts = new Date(raw).getTime();
      if (Number.isNaN(ts)) return false;
      return ts >= fromTs && ts <= toTs;
    });
  }, [rows, dateField, from, to]);

  const chosenColumns = useMemo(
    () => columns.filter((c) => selectedKeys.includes(colKey(c))),
    [columns, selectedKeys]
  );

  function toggleKey(key) {
    setSelectedKeys((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
    );
  }

  async function handleDownload() {
    if (filteredRows.length === 0) {
      toast.error('No rows match the date range.');
      return;
    }
    if (chosenColumns.length === 0) {
      toast.error('Select at least one column.');
      return;
    }
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 0));
      const rangeNote =
        from || to ? `Range: ${from || '…'} → ${to || '…'}` : '';
      const composedSubtitle = [subtitle, rangeNote].filter(Boolean).join(' · ');

      if (format === 'pdf') {
        exportToPDF({
          filename,
          title,
          subtitle: composedSubtitle,
          columns: chosenColumns,
          rows: filteredRows,
          orientation,
        });
      } else if (format === 'excel') {
        exportToExcel({ filename, columns: chosenColumns, rows: filteredRows });
      } else {
        exportToCSV({ filename, columns: chosenColumns, rows: filteredRows });
      }
      toast.success(`${format.toUpperCase()} downloaded`);
      setOpen(false);
    } catch (err) {
      toast.error(`Export failed: ${err.message || 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  }

  const allSelected = selectedKeys.length === columns.length;
  const stepNum = dateField ? 3 : 2;

  return (
    <div className={`inline-flex ${className}`}>
      <button
        type="button"
        className="dbtn dbtn-secondary"
        onClick={() => {
          if (empty) {
            toast.error('Nothing to export yet.');
            return;
          }
          setOpen(true);
        }}
        disabled={empty}
        title="Export data"
      >
        <i className="fa-solid fa-file-export"></i>
        <span>Export</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-white w-full max-w-xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white relative">
              <button
                type="button"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50"
                onClick={() => setOpen(false)}
                disabled={busy}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <i className="fa-solid fa-file-export text-base"></i>
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-tight">Export {title}</h3>
                  <p className="text-[12px] text-blue-100 mt-0.5">
                    {rows.length} record{rows.length === 1 ? '' : 's'} available
                    {subtitle ? ` · ${subtitle}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto space-y-5">
              {/* Step 1 — date range */}
              {dateField && (
                <Section step="1" title="Filter by date" icon="fa-calendar-days">
                  <div className="grid grid-cols-2 gap-3">
                    <DateField
                      label="From"
                      value={from}
                      max={to || undefined}
                      onChange={setFrom}
                    />
                    <DateField
                      label="To"
                      value={to}
                      min={from || undefined}
                      onChange={setTo}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[12px]">
                    <span className="text-slate-500">
                      Leave blank to include every row currently shown.
                    </span>
                    <span className="font-semibold text-slate-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                      {filteredRows.length} of {rows.length} match
                    </span>
                  </div>
                </Section>
              )}

              {/* Step 2 — columns */}
              <Section
                step={dateField ? '2' : '1'}
                title="Columns to include"
                icon="fa-table-columns"
                action={
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-blue-600 hover:text-blue-700"
                    onClick={() =>
                      setSelectedKeys(allSelected ? [] : columns.map(colKey))
                    }
                  >
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                }
              >
                <div className="flex flex-wrap gap-1.5">
                  {columns.map((c) => {
                    const key = colKey(c);
                    const checked = selectedKeys.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleKey(key)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                          checked
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <i
                          className={`fa-solid text-[10px] ${
                            checked ? 'fa-check text-blue-600' : 'fa-plus text-slate-400'
                          }`}
                        ></i>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {chosenColumns.length} of {columns.length} columns selected
                </p>
              </Section>

              {/* Step 3 — format */}
              <Section step={stepNum.toString()} title="Choose format" icon="fa-file-arrow-down">
                <div className="grid grid-cols-3 gap-2.5">
                  <FormatTile
                    active={format === 'excel'}
                    onClick={() => setFormat('excel')}
                    icon="fa-file-excel"
                    iconColor="#1f9a4f"
                    label="Excel"
                    hint=".xlsx workbook"
                  />
                  <FormatTile
                    active={format === 'pdf'}
                    onClick={() => setFormat('pdf')}
                    icon="fa-file-pdf"
                    iconColor="#d4434a"
                    label="PDF"
                    hint="A4 report"
                  />
                  <FormatTile
                    active={format === 'csv'}
                    onClick={() => setFormat('csv')}
                    icon="fa-file-csv"
                    iconColor="#0b67c2"
                    label="CSV"
                    hint="Plain text"
                  />
                </div>
              </Section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="text-[12px] text-slate-600">
                Ready to download{' '}
                <span className="font-semibold text-slate-900">
                  {filteredRows.length} row{filteredRows.length === 1 ? '' : 's'}
                </span>{' '}
                ·{' '}
                <span className="font-semibold text-slate-900">
                  {chosenColumns.length} column{chosenColumns.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="dbtn dbtn-secondary"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="dbtn dbtn-primary"
                  onClick={handleDownload}
                  disabled={
                    busy || filteredRows.length === 0 || chosenColumns.length === 0
                  }
                >
                  {busy ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-download"></i>
                  )}
                  <span>Download {format.toUpperCase()}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ step, title, icon, action, children }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold flex items-center justify-center border border-blue-100">
            {step}
          </span>
          <h4 className="text-[13px] font-semibold text-slate-900">
            <i className={`fa-solid ${icon} mr-1.5 text-slate-400 text-[12px]`}></i>
            {title}
          </h4>
        </div>
        {action}
      </div>
      <div className="pl-8">{children}</div>
    </section>
  );
}

function DateField({ label, value, min, max, onChange }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </span>
      <input
        type="date"
        className="dash-input"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function FormatTile({ active, onClick, icon, iconColor, label, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 px-3 py-4 rounded-xl text-xs transition-all ${
        active
          ? 'bg-blue-50 border-2 border-blue-500 shadow-[0_0_0_3px_#dbeafe]'
          : 'bg-white border-2 border-slate-200 hover:border-slate-300'
      }`}
    >
      {active && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
          <i className="fa-solid fa-check text-[8px]"></i>
        </span>
      )}
      <i className={`fa-solid ${icon} text-2xl`} style={{ color: iconColor }}></i>
      <span className="font-semibold text-slate-900 mt-0.5">{label}</span>
      <span className="text-[10px] text-slate-500">{hint}</span>
    </button>
  );
}

function colKey(c) {
  return c.key || c.label;
}
