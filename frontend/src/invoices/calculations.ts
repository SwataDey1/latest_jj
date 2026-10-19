import type { InvoiceItemInput } from './api';

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function twoDigits(value: number): string {
  if (value < 20) return ONES[value];
  return `${TENS[Math.floor(value / 10)]} ${ONES[value % 10]}`.trim();
}

function threeDigits(value: number): string {
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  return [hundred ? `${ONES[hundred]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ');
}

function integerToIndianWords(value: number): string {
  if (value === 0) return 'Zero';
  const crore = Math.floor(value / 10_000_000);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  const thousand = Math.floor((value % 100_000) / 1_000);
  const rest = value % 1_000;
  return [
    crore ? `${integerToIndianWords(crore)} Crore` : '',
    lakh ? `${twoDigits(lakh)} Lakh` : '',
    thousand ? `${twoDigits(thousand)} Thousand` : '',
    rest ? threeDigits(rest) : '',
  ].filter(Boolean).join(' ');
}

// Mirrors backend amount_to_words so the live preview matches the saved invoice.
export function amountToWords(amount: number): string {
  const paiseTotal = Math.round(Math.abs(amount) * 100);
  const rupees = Math.floor(paiseTotal / 100);
  const paise = paiseTotal % 100;
  return `Indian Rupees ${integerToIndianWords(rupees)}${paise ? ` and ${twoDigits(paise)} Paise` : ''} Only`;
}

export type InvoiceTotals = {
  lineAmounts: number[];
  subtotal: number;
  discount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
};

export function supplyStateCode(placeOfSupply: string, fallback: string | undefined): string | undefined {
  return placeOfSupply.match(/^\s*(\d{2})/)?.[1] ?? fallback;
}

// Mirrors backend _apply_totals: discount is spread proportionally across lines before GST.
export function calculateTotals(
  items: Pick<InvoiceItemInput, 'quantity' | 'rate' | 'gst_percentage'>[],
  intraState: boolean,
  discountAmount = 0,
): InvoiceTotals {
  const lineAmounts = items.map((item) => round2((Number(item.quantity) || 0) * (Number(item.rate) || 0)));
  const subtotal = round2(lineAmounts.reduce((sum, value) => sum + value, 0));
  const discount = Math.min(round2(Math.max(Number(discountAmount) || 0, 0)), subtotal);
  const taxableValue = round2(subtotal - discount);
  const taxableRatio = subtotal ? taxableValue / subtotal : 0;
  const tax = round2(items.reduce((sum, item, index) => sum + round2(lineAmounts[index] * taxableRatio * (Number(item.gst_percentage) || 0) / 100), 0));
  const cgst = intraState ? round2(tax / 2) : 0;
  const sgst = intraState ? round2(tax - cgst) : 0;
  const totalBeforeRounding = round2(taxableValue + tax);
  const grandTotal = Math.round(totalBeforeRounding);
  return {
    lineAmounts, subtotal, discount, taxableValue, cgst, sgst, igst: intraState ? 0 : tax, tax,
    roundOff: round2(grandTotal - totalBeforeRounding), grandTotal, amountInWords: amountToWords(grandTotal),
  };
}

export const formatMoney = (value: number) =>
  value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
