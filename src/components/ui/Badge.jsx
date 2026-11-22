const STATUS_STYLES = {
  Published: 'bg-[#bdeebd] text-[#14532d]',
  Ongoing: 'bg-[#bdeebd] text-[#14532d]',
  Active: 'bg-[#bdeebd] text-[#14532d]',
  Approved: 'bg-[#bdeebd] text-[#14532d]',
  Enrolled: 'bg-[#bdeebd] text-[#14532d]',

  Draft: 'bg-[#f3eca0] text-[#713f12]',
  Upcoming: 'bg-[#f3eca0] text-[#713f12]',
  Pending: 'bg-[#f3eca0] text-[#713f12]',

  Archived: 'bg-soft text-ink dark:bg-slate-800 dark:text-slate-300',
  Past: 'bg-soft text-ink dark:bg-slate-800 dark:text-slate-300',
  Rejected: 'bg-abs/30 text-[#7f1d1d] dark:text-red-200',
};

export default function Badge({ children, tone }) {
  const key = tone || String(children || '');
  const style =
    STATUS_STYLES[key] || 'bg-soft text-ink dark:bg-slate-800 dark:text-slate-200';

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {children}
    </span>
  );
}