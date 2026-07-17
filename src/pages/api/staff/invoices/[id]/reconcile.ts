import type { APIRoute } from 'astro';
import { transitionToReconcile } from '../../../../../lib/invoice-reconciliation';

export const POST: APIRoute = (context) => transitionToReconcile(context, 'ready_for_payment', 'reconciled', 'reconciled');
