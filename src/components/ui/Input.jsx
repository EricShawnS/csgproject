export function Input({ label, id, className = '', ...props }) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-xs font-semibold text-ink dark:text-slate-200"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink placeholder:text-mut dark:border-slate-700 dark:bg-slate-800 dark:text-white ${className}`}
        {...props}
      />
    </div>
  );
}

export function Select({ label, id, children, className = '', ...props }) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-xs font-semibold text-ink dark:text-slate-200"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-white ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, id, className = '', ...props }) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-xs font-semibold text-ink dark:text-slate-200"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink placeholder:text-mut dark:border-slate-700 dark:bg-slate-800 dark:text-white ${className}`}
        {...props}
      />
    </div>
  );
}