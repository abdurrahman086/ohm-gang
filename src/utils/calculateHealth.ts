// Status kesehatan hasil perhitungan (bukan enum DB — dihitung dari rumus).
export type HealthStatus = 'healthy' | 'warning' | 'critical';

// Rumus PRD §4.2.C:
//   Rasio Kesehatan = Total Saldo / Estimasi Pengeluaran Rutin Bulanan
//   Sehat   : saldo >= 100% kebutuhan bulanan
//   Waspada : saldo 50% - 99%
//   Kritis  : saldo < 50% ATAU rasio tunggakan siswa > 30%
export function calculateHealth(
  currentBalance: number,
  estimatedMonthlyExpense: number,
  arrearsRatio = 0,
): { status: HealthStatus; ratio: number } {
  const ratio = estimatedMonthlyExpense > 0 ? currentBalance / estimatedMonthlyExpense : 0;

  let status: HealthStatus;
  if (ratio >= 1) status = 'healthy';
  else if (ratio >= 0.5) status = 'warning';
  else status = 'critical';

  if (arrearsRatio > 0.3) status = 'critical';

  return { status, ratio };
}