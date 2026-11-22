export default function Toast({ message, tone = 'info' }) {
  if (!message) return null;

  const tones = {
    info: 'bg-admin-aside text-white',
    success: 'bg-[#14532d] text-white',
    error: 'bg-red text-white',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-lg ${tones[tone] || tones.info}`}
    >
      {message}
    </div>
  );
}