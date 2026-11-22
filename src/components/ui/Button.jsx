export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...props
}) {
  const variants = {
    primary:
      'bg-admin-active text-white hover:opacity-95 disabled:opacity-60',
    secondary:
      'border border-line bg-soft text-ink hover:bg-card/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    danger:
      'bg-red text-white hover:opacity-95 disabled:opacity-60',
    ghost:
      'bg-transparent text-ink hover:bg-soft dark:text-slate-200 dark:hover:bg-slate-800',
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-xs rounded-lg',
    md: 'px-3.5 py-2 text-sm rounded-[10px]',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-colors ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}