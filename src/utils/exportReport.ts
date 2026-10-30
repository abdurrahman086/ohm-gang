import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportRow {
  tanggal: string;
  nama: string;
  tipe: string;
  metode: string;
  status: string;
  nominal: number;
  keterangan: string;
}

const HEADERS = ['Tanggal', 'Nama', 'Tipe', 'Metode', 'Status', 'Nominal', 'Keterangan'];
const METHOD_LABEL: Record<string, string> = {
  transfer: 'Transfer',
  qris: 'QRIS',
  cash: 'Tunai',
  e_wallet: 'E-Wallet',
};
const TYPE_LABEL: Record<string, string> = { income: 'Pemasukan', expense: 'Pengeluaran' };
const STATUS_LABEL: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

export function mapRow(r: { created_at: string; user_id: string; type: string; method: string; status: string; amount: number; note: string | null }, nama: string): ReportRow {
  return {
    tanggal: new Date(r.created_at).toLocaleDateString('id-ID'),
    nama: nama || r.user_id.slice(0, 8),
    tipe: TYPE_LABEL[r.type] ?? r.type,
    metode: METHOD_LABEL[r.method] ?? r.method,
    status: STATUS_LABEL[r.status] ?? r.status,
    nominal: Number(r.amount),
    keterangan: r.note ?? '',
  };
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Export CSV (native, tanpa dependency). */
export function exportCSV(rows: ReportRow[], filename = 'laporan-kas.csv') {
  const lines = [HEADERS.join(','), ...rows.map((r) => [r.tanggal, r.nama, r.tipe, r.metode, r.status, r.nominal, r.keterangan].map((c) => csvEscape(String(c))).join(','))];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}

/** Export PDF via jsPDF + autoTable. */
export function exportPDF(rows: ReportRow[], title = 'Laporan Kas Kelas', filename = 'laporan-kas.pdf') {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 22);

  const total = rows.reduce((s, r) => s + r.nominal, 0);
  const body = rows.map((r) => [r.tanggal, r.nama, r.tipe, r.metode, r.status, `Rp ${r.nominal.toLocaleString('id-ID')}`, r.keterangan]);

  autoTable(doc, {
    startY: 26,
    head: [HEADERS],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  const endY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(10);
  doc.text(`Total Transaksi: Rp ${total.toLocaleString('id-ID')}`, 14, endY + 8);
  doc.save(filename);
}

export interface PaymentReportRow {
  nama: string;
  periode: string;
  status: string;
  tagihan: number;
  nominal: number;
  metode: string;
  tanggal: string;
  keterangan: string;
}

const PAYMENT_HEADERS = ['Nama', 'Periode', 'Status', 'Tagihan', 'Dibayar', 'Metode', 'Tanggal', 'Keterangan'];

/** Export daftar pembayaran siswa (hasil filter di UI). */
export function exportPaymentCSV(rows: PaymentReportRow[], filename = 'daftar-pembayaran.csv') {
  const lines = [
    PAYMENT_HEADERS.join(','),
    ...rows.map((r) =>
      [r.nama, r.periode, r.status, r.tagihan, r.nominal, r.metode, r.tanggal, r.keterangan]
        .map((c) => csvEscape(String(c)))
        .join(','),
    ),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}

/** Export PDF daftar pembayaran siswa. */
export function exportPaymentPDF(rows: PaymentReportRow[], title = 'Daftar Pembayaran Kas', filename = 'daftar-pembayaran.pdf') {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 22);

  const paid = rows.filter((r) => r.status.startsWith('Lunas'));
  const total = paid.reduce((sum, r) => sum + r.nominal, 0);
  const body = rows.map((r) => [
    r.nama,
    r.periode,
    r.status,
    `Rp ${r.tagihan.toLocaleString('id-ID')}`,
    `Rp ${r.nominal.toLocaleString('id-ID')}`,
    r.metode,
    r.tanggal,
    r.keterangan,
  ]);

  autoTable(doc, {
    startY: 26,
    head: [PAYMENT_HEADERS],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  const endY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(10);
  doc.text(
    `Lunas: ${paid.length}/${rows.length} · Terkumpul: Rp ${total.toLocaleString('id-ID')}`,
    14,
    endY + 8,
  );
  doc.save(filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}