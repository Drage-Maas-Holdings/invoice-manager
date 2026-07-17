import type { APIRoute } from 'astro';
import { transitionInvoice } from '../../../../../lib/invoice-approval';

export const POST: APIRoute = (context) => transitionInvoice(context, 'rejected', 'rejected');
