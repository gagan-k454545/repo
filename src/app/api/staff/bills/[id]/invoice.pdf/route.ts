import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { bills, billLines, billTaxLines, tableSessions, tables, restaurants, payments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { formatPaiseToRupees } from '@/lib/money';
import { formatErrorResponse, AppError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: billId } = await params;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'CASHIER']);

    const [bill] = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, billId), eq(bills.restaurantId, auth.restaurantId)))
      .limit(1);

    if (!bill) throw new AppError('BILL_NOT_FOUND', 'Bill not found', 404);

    const [session] = await db.select().from(tableSessions).where(eq(tableSessions.id, bill.sessionId)).limit(1);
    const [table] = session ? await db.select().from(tables).where(eq(tables.id, session.tableId)).limit(1) : [null];
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, auth.restaurantId)).limit(1);

    const lines = await db.select().from(billLines).where(eq(billLines.billId, bill.id));
    const taxLines = await db.select().from(billTaxLines).where(eq(billTaxLines.billId, bill.id));
    const paymentRows = await db.select().from(payments).where(eq(payments.billId, bill.id));

    // Generate clean printable Tax Invoice HTML
    const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${bill.invoiceNumber || 'DRAFT'}</title>
  <style>
    body { font-family: monospace, sans-serif; font-size: 13px; max-width: 320px; margin: 0 auto; padding: 15px; color: #111; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #666; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 3px 0; }
    @media print { body { max-width: 100%; padding: 0; } }
  </style>
</head>
<body onload="window.print()">
  <div class="center">
    <div class="bold" style="font-size: 16px;">${restaurant?.name || 'Restaurant'}</div>
    <div>${restaurant?.legalName || ''}</div>
    <div>${restaurant?.address || ''}</div>
    <div>GSTIN: ${restaurant?.gstin || 'Unregistered'}</div>
    <div>FSSAI Lic: ${restaurant?.fssaiNumber || 'N/A'}</div>
    <div class="divider"></div>
    <div class="bold">TAX INVOICE</div>
    <div>Invoice: ${bill.invoiceNumber || 'DRAFT BILL'}</div>
    <div>Date: ${bill.issuedAt ? new Date(bill.issuedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}</div>
    <div>Table: ${table?.label || 'N/A'} | SAC: 996331</div>
  </div>

  <div class="divider"></div>

  <table>
    <tr class="bold">
      <td>Item</td>
      <td class="center">Qty</td>
      <td class="right">Amount</td>
    </tr>
    ${lines.map((l) => `
    <tr>
      <td>${l.name}</td>
      <td class="center">${l.qty}</td>
      <td class="right">${formatPaiseToRupees(l.lineTotal)}</td>
    </tr>
    `).join('')}
  </table>

  <div class="divider"></div>

  <table>
    <tr><td>Subtotal</td><td class="right font-bold">${formatPaiseToRupees(bill.subtotal)}</td></tr>
    ${bill.discount > 0 ? `<tr><td>Discount</td><td class="right">-${formatPaiseToRupees(bill.discount)}</td></tr>` : ''}
    ${bill.serviceCharge > 0 ? `<tr><td>Service Charge</td><td class="right">${formatPaiseToRupees(bill.serviceCharge)}</td></tr>` : ''}
    <tr><td>Taxable Value</td><td class="right">${formatPaiseToRupees(bill.taxableTotal)}</td></tr>
    ${taxLines.map((t) => `
    <tr><td>CGST (${(t.taxRateBp / 200).toFixed(1)}%)</td><td class="right">${formatPaiseToRupees(t.cgst)}</td></tr>
    <tr><td>SGST (${(t.taxRateBp / 200).toFixed(1)}%)</td><td class="right">${formatPaiseToRupees(t.sgst)}</td></tr>
    `).join('')}
    ${bill.roundOff !== 0 ? `<tr><td>Round off</td><td class="right">${bill.roundOff > 0 ? `+${bill.roundOff}p` : `${bill.roundOff}p`}</td></tr>` : ''}
    <tr class="bold" style="font-size: 15px;">
      <td>Total</td>
      <td class="right">${formatPaiseToRupees(bill.total)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <div>
    <span class="bold">Payments:</span>
    ${paymentRows.map((p) => `
    <div style="display:flex; justify-content:space-between;">
      <span>${p.method} (${p.kind})</span>
      <span>${formatPaiseToRupees(p.amount)}</span>
    </div>
    `).join('')}
  </div>

  <div class="divider"></div>
  <div class="center" style="font-size: 11px;">
    Thank you for dining with us!
  </div>
</body>
</html>`;

    return new Response(invoiceHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
