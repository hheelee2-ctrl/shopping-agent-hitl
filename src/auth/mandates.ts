import type { SupabaseClient } from '@supabase/supabase-js';
import type { Watch } from '../agent/watch';

/**
 * 사전 승인 기록(supabase/002_mandates.sql). 누가, 어떤 조건으로 자리를 비운 동안의 결제를 맡겼는지 남긴다.
 * 행은 본인만 읽고 쓸 수 있다(RLS).
 */
export async function recordMandate(sb: SupabaseClient, w: Omit<Watch, 'id'>, productName: string): Promise<string> {
  const { data, error } = await sb.from('mandates').insert({
    product_id: w.productId,
    product_name: productName,
    size: w.size,
    max_total: w.maxTotal,
    domestic_only: w.domesticOnly,
    days: w.days,
  }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'mandate');
  return data.id as string;
}

/** 사전 승인으로 샀거나 대기를 끝냈으면 기록을 닫는다. 실패해도 쇼핑은 멈추지 않는다. */
export async function closeMandate(sb: SupabaseClient, id: string, status: 'used' | 'ended', orderId?: string) {
  await sb.from('mandates').update({ status, order_id: orderId ?? null, closed_at: new Date().toISOString() }).eq('id', id);
}
