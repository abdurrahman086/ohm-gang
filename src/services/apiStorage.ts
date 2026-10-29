import { requireSupabase } from '@/config/supabase';

const BUCKET = 'proof-payments';
const QRIS_BUCKET = 'payment-qris';
const MAX_SIZE = 3 * 1024 * 1024; // 3MB (PRD §4.2.A)
const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf'];

export type UploadValidationError = 'type' | 'size' | null;

/** Validasi client: .jpg/.png/.pdf max 3MB (PRD §4.2.A). */
export function validateProofFile(file: File): UploadValidationError {
  if (!ALLOWED.includes(file.type)) return 'type';
  if (file.size > MAX_SIZE) return 'size';
  return null;
}

/** Upload ke bucket privat (bukti transfer) — folder <uid>/. */
export async function uploadProof(userId: string, file: File): Promise<string> {
  return uploadToBucket(BUCKET, userId, file);
}

export async function getQrisImagePath(): Promise<string | null> {
  const { data, error } = await requireSupabase().from('payment_settings').select('qris_image_path').eq('id', true).single();
  if (error) throw error;
  return data.qris_image_path;
}

export async function setQrisImage(file: File, userId: string): Promise<void> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('QRIS harus berupa JPG atau PNG.');
  if (file.size > MAX_SIZE) throw new Error('Ukuran QRIS maksimal 3MB.');
  const sb = requireSupabase();
  const path = `${crypto.randomUUID()}.${file.type === 'image/png' ? 'png' : 'jpg'}`;
  const { error: uploadError } = await sb.storage.from(QRIS_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (uploadError) throw uploadError;
  const { error } = await sb.from('payment_settings').update({ qris_image_path: path, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', true);
  if (error) throw error;
}

export function qrisPublicUrl(path: string): string {
  return requireSupabase().storage.from(QRIS_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function uploadToBucket(bucket: string, userId: string, file: File): Promise<string> {
  const sb = requireSupabase();
  const err = validateProofFile(file);
  if (err === 'type') throw new Error('Hanya file .jpg, .png, atau .pdf yang diizinkan.');
  if (err === 'size') throw new Error('Ukuran file maksimal 3MB.');

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await sb.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) throw error;
  return path;
}

/** Signed URL (60 detik) untuk preview bukti — bucket privat, RLS tetap berlaku. */
export async function getProofUrl(path: string): Promise<string | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error) return null;
  return data.signedUrl;
}
