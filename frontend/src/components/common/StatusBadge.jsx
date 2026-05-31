/**
 * Status pill. The CSS class is derived from the value (e.g. `badge-paid`),
 * so paid → green, pending → yellow, failed → red, etc.
 * Matches the styles in styles/index.css.
 */
export default function StatusBadge({ value, label }) {
  if (!value) return null;
  return <span className={`badge badge-${value}`}>{label || pretty(value)}</span>;
}

function pretty(v) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
