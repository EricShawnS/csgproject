export default function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section
      className={`rounded-xl border border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            {title && (
              <h3 className="text-[15px] font-bold text-ink dark:text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-mut dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}