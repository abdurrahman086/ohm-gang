import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: 'default' | 'income' | 'expense';
}

const toneColor = {
  default: 'text-primary-600',
  income: 'text-emerald-600',
  expense: 'text-rose-600',
} as const;

export function StatCard({ title, value, icon: Icon, tone = 'default' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-textSecondary">{title}</p>
          <p className={`tabular-nums mt-1 text-2xl font-bold ${toneColor[tone]}`}>{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}