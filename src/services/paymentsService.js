import { supabase } from '../lib/supabase';
import { logActivity } from './ActivityLogService';

export async function fetchPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('id, student_id, event_id, reference_no, payment_date, amount, status, proof_name, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function recordPayment({ studentId, eventId, amount, referenceNo, proofName }, actor) {
  const today = new Date().toISOString().split('T')[0];
  const ref =
    referenceNo?.trim() ||
    `PAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const payload = {
    student_id: studentId,
    event_id: eventId || null,
    reference_no: ref,
    payment_date: today,
    amount: Number(amount),
    status: 'Paid',
    proof_name: proofName || null,
  };

  const { data, error } = await supabase
    .from('payments')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actor,
    action: 'Recorded Payment',
    module: 'Penalties & Payments',
    description: `Recorded ₱${Number(amount).toFixed(2)} payment (${ref}) for student ${studentId}.`,
  });

  return data;
}