import { requireSupabase } from '@/config/supabase';
import { calculateHealth, type HealthStatus } from '@/utils/calculateHealth';
import type { Database } from '@/types/database.types';

export type CashTransaction = Database['public']['Tables']['cash_transactions']['Row'];
export type CashTransactionView = Omit<CashTransaction, 'proof_url'>;
export type CashPeriod = Database['public']['Tables']['cash_periods']['Row'];
const TRANSACTION_COLUMNS = 'id,user_id,period_id,type,amount,method,status,note,verified_by,created_at,updated_at';

export interface MonthlyFlow {
  month: string; // "Sep"
  income: number;
  expense: number;
}

export interface CashSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  estimatedMonthlyExpense: number;
  healthStatus: HealthStatus;
  healthRatio: number;
  arrearsRatio: number; // rasio member belum bayar periode aktif (PRD: >30% → kritis)
  monthly: MonthlyFlow[]; // 6 bulan terakhir
}

/** Ringkasan kas: saldo, estimasi pengeluaran bulanan, health (rumus PRD §4.2.C). */
export async function fetchCashSummary(): Promise<CashSummary> {
  const { data, error } = await requireSupabase().rpc('get_public_cash_summary');
  if (error) throw error;
  const result = data as unknown as {
    totalIncome: number; totalExpense: number; estimatedMonthlyExpense: number;
    arrearsRatio: number; monthly: Array<{ monthIndex: number; income: number; expense: number }>;
  };
  const totalIncome = Number(result.totalIncome);
  const totalExpense = Number(result.totalExpense);
  const balance = totalIncome - totalExpense;
  const estimatedMonthlyExpense = Number(result.estimatedMonthlyExpense);
  const arrearsRatio = Number(result.arrearsRatio);
  const { status, ratio } = calculateHealth(balance, estimatedMonthlyExpense, arrearsRatio);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthly: MonthlyFlow[] = result.monthly.map((m) => ({
    month: monthNames[m.monthIndex - 1], income: Number(m.income), expense: Number(m.expense),
  }));
  return { totalIncome, totalExpense, balance, estimatedMonthlyExpense, healthStatus: status, healthRatio: ratio, arrearsRatio, monthly };
}

/** Periode kas aktif (dipilih manual; fallback: jatuh tempo terbaru). */
export async function fetchCurrentPeriod(): Promise<CashPeriod | null> {
  const sb = requireSupabase();
  // Sejak migrasi 0014 ada kolom is_active. Kalau belum diterapkan, fallback ke due_date terbaru.
  const active = await sb.from('cash_periods').select('*').eq('is_active', true).maybeSingle();
  if (!active.error) return active.data ?? null;

  const { data, error } = await sb
    .from('cash_periods')
    .select('*')
    .order('due_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Tandai satu periode sebagai periode aktif (periode lain otomatis nonaktif). */
export async function setActivePeriod(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('set_active_period', { p_period_id: id });
  if (!error) return;
  if (error.code === 'PGRST202' || error.code === '42883') {
    throw new Error('Fitur periode aktif belum aktif di database. Terapkan migrasi 0014_period_active.sql lebih dulu.');
  }
  throw error;
}

/** Semua periode kas (dropdown pembayaran & filter). */
export async function fetchPeriods(): Promise<CashPeriod[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('cash_periods')
    .select('*')
    .order('due_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ============ Admin: CRUD periode kas (Fase 8 — DeveloperPanel, RLS officer) ============

export async function createPeriod(input: { title: string; dueDate: string; amount: number }): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('cash_periods').insert({ title: input.title, due_date: input.dueDate, amount: input.amount });
  if (error) throw error;
}

export async function updatePeriod(input: { id: string; title: string; dueDate: string; amount: number }): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('cash_periods').update({ title: input.title, due_date: input.dueDate, amount: input.amount }).eq('id', input.id);
  if (error) throw error;
}

export async function deletePeriod(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('cash_periods').delete().eq('id', id);
  if (error) throw error;
}

export interface TransactionFilters {
  periodId?: string;
  status?: CashTransaction['status'];
  type?: CashTransaction['type'];
}

export async function fetchTransactions(filters: TransactionFilters = {}): Promise<CashTransactionView[]> {
  const sb = requireSupabase();
  let q = sb.from('cash_transactions').select(TRANSACTION_COLUMNS).order('created_at', { ascending: false }).limit(500);
  if (filters.periodId) q = q.eq('period_id', filters.periodId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.type) q = q.eq('type', filters.type);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CashTransactionView[];
}

export async function getTransactionProofPath(id: string): Promise<string | null> {
  const { data, error } = await requireSupabase().rpc('get_payment_proof_path', { p_transaction_id: id });
  if (error) throw error;
  return data;
}

/** Member mengajukan pembayaran kas (status pending, RLS memaksa auth.uid() = user_id). */
export async function submitPayment(input: {
  userId: string;
  periodId: string;
  amount: number;
  method: 'qris';
  proofPath?: string;
  note?: string;
}): Promise<void> {
  const sb = requireSupabase();
  const { data: period, error: periodError } = await sb
    .from('cash_periods')
    .select('id,is_active')
    .eq('id', input.periodId)
    .maybeSingle();
  if (periodError) throw periodError;
  if (!period?.is_active) throw new Error('Periode kas tidak aktif. Upload bukti ditutup.');

  const { error } = await sb
    .from('cash_transactions')
    .insert({
      user_id: input.userId,
      period_id: input.periodId,
      type: 'income',
      amount: input.amount,
      method: input.method,
      status: 'pending',
      proof_url: input.proofPath ?? null,
      note: input.note ?? null,
    });
  if (error) throw error;
}

/** Bendahara mencatat pembayaran tunai siswa sebagai lunas. */
export async function recordCashPayment(input: { userId: string; periodId: string; amount: number; recordedBy: string }): Promise<void> {
  const { error } = await requireSupabase().from('cash_transactions').insert({
    user_id: input.userId, period_id: input.periodId, type: 'income', amount: input.amount,
    method: 'cash', status: 'approved', verified_by: input.recordedBy, note: 'Dicatat langsung oleh bendahara',
  });
  if (error) throw error;
}

/** Bendahara mencatat pengeluaran langsung (approved sejak awal). */
export async function createExpense(input: {
  userId: string;
  amount: number;
  method: CashTransaction['method'];
  note?: string;
}): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('cash_transactions')
    .insert({
      user_id: input.userId,
      type: 'expense',
      amount: input.amount,
      method: input.method,
      status: 'approved',
      note: input.note ?? null,
    });
  if (error) throw error;
}

/** Catat pemasukan lainnya (selain pembayaran kas). */
export async function createIncome(input: {
  userId: string;
  amount: number;
  method: CashTransaction['method'];
  note?: string;
}): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('cash_transactions')
    .insert({
      user_id: input.userId,
      type: 'income',
      amount: input.amount,
      method: input.method,
      status: 'approved',
      note: input.note ?? null,
    });
  if (error) throw error;
}

/** Verifikasi pembayaran: approve → saldo bertambah; reject → alasan dicatat. */
export async function verifyTransaction(input: {
  id: string;
  status: Extract<CashTransaction['status'], 'approved' | 'rejected'>;
  verifiedBy: string;
  reason?: string;
}): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('cash_transactions')
    .update({ status: input.status, verified_by: input.verifiedBy, note: input.reason ?? null })
    .eq('id', input.id);
  if (error) throw error;
}
