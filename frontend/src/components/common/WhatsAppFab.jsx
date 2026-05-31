export default function WhatsAppFab({ href = 'https://wa.me/919876543210' }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="whatsapp-btn" title="Chat on WhatsApp" aria-label="Chat on WhatsApp">
      <i className="fa-brands fa-whatsapp text-white text-2xl"></i>
    </a>
  );
}
