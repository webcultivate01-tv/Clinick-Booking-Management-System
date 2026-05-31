export default function Loader({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-muted ${className}`}>
      <div className="w-10 h-10 rounded-full border-4 border-gold-light border-t-gold animate-spin mb-3" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
