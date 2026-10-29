import type { Database } from './database.types';

// Alias ringkas untuk enum DB (SAD §3.1).
export type UserRole = Database['public']['Enums']['user_role'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];
export type PaymentMethod = Extract<Database['public']['Enums']['payment_method'], 'cash' | 'qris'>;
export type TransactionType = Database['public']['Enums']['transaction_type'];
export type IdeaCategory = Database['public']['Enums']['idea_category'];
