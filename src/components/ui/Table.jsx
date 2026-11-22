export default function Table({
  columns = [],
  rows = [],
  keyField = 'id',
  emptyMessage = 'No records found.',
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-soft/70 text-xs font-semibold uppercase tracking-wide text-mut dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300">
            {columns.map((col) => (
              <th key={col.key} className="px-3.5 py-2.5">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length || 1}
                className="px-4 py-8 text-center text-sm text-mut dark:text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={row[keyField] ?? idx}
                className="hover:bg-soft/40 dark:hover:bg-slate-800/40"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3.5 py-2.5 align-middle">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}