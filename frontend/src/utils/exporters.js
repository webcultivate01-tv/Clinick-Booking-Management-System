import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Shared client-side export helpers for the admin panel.
 *
 *   columns = [{ key: 'name', label: 'Name', map?: row => string }]
 *   rows    = the array of data already loaded on screen
 *
 * Both exports respect the user's current filters because we hand them
 * exactly what the page is showing.
 */

const todayStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function cellValue(row, col) {
  const raw = col.map ? col.map(row) : row[col.key];
  if (raw == null) return '';
  return raw;
}

export function exportToCSV({ filename, columns, rows }) {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => escape(cellValue(r, c))).join(','));
  // BOM so Excel opens UTF-8 with rupee symbols correctly
  const csv = '﻿' + [header, ...body].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${todayStamp()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToExcel({ filename, sheetName = 'Sheet1', columns, rows }) {
  const header = columns.map((c) => c.label);
  const body = rows.map((r) => columns.map((c) => cellValue(r, c)));
  const aoa = [header, ...body];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto-width: pick the longest string per column, capped at 40
  ws['!cols'] = columns.map((_, idx) => {
    const maxLen = aoa.reduce((m, row) => {
      const s = row[idx] == null ? '' : String(row[idx]);
      return Math.max(m, s.length);
    }, 8);
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}-${todayStamp()}.xlsx`);
}

export function exportToPDF({
  filename,
  title,
  subtitle,
  columns,
  rows,
  orientation = 'landscape',
}) {
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(91, 78, 224); // indigo brand
  doc.rect(0, 0, pageWidth, 56, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Lumière Skin Clinic', 40, 28);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 40, 46);

  // Sub line (subtitle + date)
  doc.setTextColor(90, 98, 122);
  doc.setFontSize(9);
  const dateLabel = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  if (subtitle) doc.text(subtitle, 40, 76);
  doc.text(`Generated: ${dateLabel}`, pageWidth - 40, 76, { align: 'right' });

  autoTable(doc, {
    startY: 90,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => {
      const v = cellValue(r, c);
      return v == null ? '' : String(v);
    })),
    styles: { fontSize: 9, cellPadding: 6, overflow: 'linebreak' },
    headStyles: {
      fillColor: [246, 247, 251],
      textColor: [40, 46, 70],
      fontStyle: 'bold',
      lineWidth: 0.4,
      lineColor: [230, 232, 240],
    },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(140, 148, 165);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' }
      );
      doc.text(
        'Lumière Skin Admin Console',
        40,
        doc.internal.pageSize.getHeight() - 20
      );
    },
  });

  doc.save(`${filename}-${todayStamp()}.pdf`);
}
