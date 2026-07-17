import type { APIRoute } from 'astro';
import { transitionToReconcile } from '../../../../../lib/invoice-reconciliation';

export const POST: APIRoute = (context) => transitionToReconcile(context, 'approved', 'ready_for_payment', 'ready_for_payment');
