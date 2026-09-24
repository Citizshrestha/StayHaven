/**
 * Client-side CSV export — no dependency, native Blob download.
 * @param {string} filename  e.g. 'rooms.csv'
 * @param {string[]} headers column headers
 * @param {Array<Array<string|number>>} rows  row values (order matches headers)
 */
export function exportToCsv(filename, headers, rows) {
  const escapeCell = (val) => {
    const s = val == null ? '' : String(val);
    // Quote if it contains comma, quote, or newline; escape embedded quotes.
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [];
  lines.push(headers.map(escapeCell).join(','));
  rows.forEach((row) => {
    lines.push(row.map(escapeCell).join(','));
  });

  // Prepend BOM so Excel reads UTF-8 correctly.
  const csv = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Defer revoke so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
