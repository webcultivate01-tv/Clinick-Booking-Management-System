const STEPS = [
  { key: 'details',  label: 'Your Details' },
  { key: 'service',  label: 'Service' },
  { key: 'slot',     label: 'Date & Time' },
  { key: 'review',   label: 'Review' },
  { key: 'payment',  label: 'Payment' },
];

export default function Stepper({ current }) {
  const idx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <ol className="flex items-center gap-2 min-w-max px-2 py-4">
        {STEPS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${
                  done ? 'bg-gold text-white border-gold' :
                  active ? 'bg-brown text-cream border-brown' :
                  'bg-white text-muted border-gold-light'
                }`}
              >
                {done ? <i className="fa-solid fa-check"></i> : i + 1}
              </div>
              <span className={`text-xs font-medium uppercase tracking-wide ${active ? 'text-brown' : 'text-muted'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="w-6 h-px bg-gold-light/80" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
