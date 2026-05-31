/** Format a YYYY-MM-DD string as 'Wed, 20 May 2026' in IST. */
export function formatDateLong(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00+05:30`);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** 'HH:MM' or 'HH:MM:SS' → '10:30 AM'. */
export function formatTime12(hhmmss) {
  if (!hhmmss) return '';
  const [h, m] = hhmmss.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr12 = ((h + 11) % 12) + 1;
  return `${hr12}:${String(m).padStart(2, '0')} ${period}`;
}

/** ₹ formatter with Indian grouping. */
export function formatINR(value) {
  if (value == null) return '';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Today's date as YYYY-MM-DD in IST — useful for date-picker min values. */
export function todayISO() {
  const d = new Date();
  const ist = new Date(d.getTime() + (5.5 * 60 + d.getTimezoneOffset()) * 60_000);
  return ist.toISOString().slice(0, 10);
}
