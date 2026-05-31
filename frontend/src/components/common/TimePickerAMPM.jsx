/**
 * Three-dropdown 12-hour time picker (Hour · Minute · AM/PM).
 *
 * - `value` is a "HH:MM" or "HH:MM:SS" 24-hour string (DB/API format).
 * - `onChange` always emits "HH:MM" 24-hour so callers don't have to
 *   reason about AM/PM.
 *
 * Built specifically for non-technical clinic staff: native browser
 * `<input type="time">` shows 24-hour on some Windows setups and is
 * fiddly on touch — three plain selects are universally easy.
 */
export default function TimePickerAMPM({ value, onChange, minuteStep = 5, className = '' }) {
  const { hour12, minute, period } = parse(value);

  function emit(next) {
    const h12 = next.hour12;
    const m = next.minute;
    const p = next.period;
    const h24 = to24(h12, p);
    onChange(`${pad(h24)}:${pad(m)}`);
  }

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [];
  for (let m = 0; m < 60; m += minuteStep) minutes.push(m);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <select
        className="dash-input flex-1"
        value={hour12}
        onChange={(e) => emit({ hour12: Number(e.target.value), minute, period })}
      >
        {hours.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-[#6b7385] font-semibold">:</span>
      <select
        className="dash-input flex-1"
        value={minute}
        onChange={(e) => emit({ hour12, minute: Number(e.target.value), period })}
      >
        {minutes.map((m) => (
          <option key={m} value={m}>{pad(m)}</option>
        ))}
      </select>
      <select
        className="dash-input flex-1"
        value={period}
        onChange={(e) => emit({ hour12, minute, period: e.target.value })}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

function pad(n) { return String(n).padStart(2, '0'); }

function parse(v) {
  if (!v) return { hour12: 9, minute: 0, period: 'AM' };
  const s = String(v);
  const [hStr, mStr] = s.split(':');
  const h24 = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = ((h24 + 11) % 12) + 1;
  return { hour12, minute: m, period };
}

function to24(hour12, period) {
  const h = Number(hour12) % 12;
  return period === 'PM' ? h + 12 : h;
}
