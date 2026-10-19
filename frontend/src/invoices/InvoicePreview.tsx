import type { Company, Customer } from './api';
import { formatMoney } from './calculations';

export const DEFAULT_TERMS = [
  'Goods once sold will not be taken back or exchanged.',
  'Interest @ 18% p.a. will be charged if payment is not received by the due date.',
  'All disputes are subject to the jurisdiction of the seller’s registered office.',
].join('\n');

export type PreviewLine = {
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  gst_percentage: number;
  amount: number;
};

export type InvoicePreviewData = {
  invoice_no: string;
  invoice_date: string;
  due_date: string | null;
  po_reference: string | null;
  place_of_supply: string;
  payment_terms: string | null;
  terms_and_conditions: string | null;
  company: Company | null;
  customer: Customer | null;
  items: PreviewLine[];
  subtotal: number;
  discount: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  round_off: number;
  grand_total: number;
  amount_in_words: string;
  billing_address?: string | null;
  shipping_address?: string | null;
  delivery_spoc?: string | null;
  delivery_date?: string | null;
};

const formatDate = (value: string | null) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function Lines({ value }: { value: string | null | undefined }) {
  if (!value) return <span>—</span>;
  return <>{value.split('\n').map((line, index) => <div key={index}>{line}</div>)}</>;
}

export default function InvoicePreview({ data }: { data: InvoicePreviewData }) {
  const { company, customer } = data;
  const terms = (data.terms_and_conditions || DEFAULT_TERMS).split('\n').filter((line) => line.trim());
  const totals: [string, number][] = [
    ['Subtotal', data.subtotal],
    ['Discount', data.discount],
    ['Taxable Value', data.taxable_value],
    ['CGST', data.cgst],
    ['SGST', data.sgst],
    ['IGST', data.igst],
    ['Round Off', data.round_off],
  ];
  const formatSigned = (value: number) => `${value < 0 ? '-' : ''}₹ ${formatMoney(Math.abs(value))}`;

  return (
    <article className="tax-invoice" aria-label="Tax invoice preview">
      <header className="tax-invoice-title">
        <h2>TAX INVOICE</h2>
        <span>Original for Recipient</span>
      </header>

      <section className="tax-invoice-grid two">
        <div className="tax-invoice-cell">
          <h4>Seller Details</h4>
          <strong>{company?.company_name ?? 'Select a company'}</strong>
          <Lines value={company?.address} />
          {company?.gstin && <div><b>GSTIN:</b> {company.gstin}</div>}
          {company?.pan && <div><b>PAN:</b> {company.pan}</div>}
          {(company?.phone || company?.email) && <div><b>Contact:</b> {[company.phone, company.email].filter(Boolean).join(' | ')}</div>}
        </div>
        <div className="tax-invoice-cell">
          <h4>Invoice Details</h4>
          <dl className="tax-invoice-dl">
            <dt>Invoice No.</dt><dd>{data.invoice_no || 'Auto-generated on save'}</dd>
            <dt>Invoice Date</dt><dd>{formatDate(data.invoice_date)}</dd>
            <dt>Due Date</dt><dd>{formatDate(data.due_date)}</dd>
            <dt>PO Reference</dt><dd>{data.po_reference || '—'}</dd>
            <dt>Place of Supply</dt><dd>{data.place_of_supply || '—'}</dd>
            <dt>Delivery Date</dt><dd>{formatDate(data.delivery_date ?? null)}</dd>
            <dt>Delivery SPOC</dt><dd>{data.delivery_spoc || '—'}</dd>
          </dl>
        </div>
      </section>

      <section className="tax-invoice-grid two">
        <div className="tax-invoice-cell">
          <h4>Bill To</h4>
          <strong>{customer?.customer_name ?? 'Select a customer'}</strong>
          <Lines value={data.billing_address || customer?.billing_address} />
          <div><b>GSTIN:</b> {customer?.gstin || 'Unregistered'}</div>
          {customer?.state_code && <div><b>State Code:</b> {customer.state_code}</div>}
          {(customer?.contact_person || customer?.phone || customer?.email) && (
            <div><b>Contact:</b> {[customer.contact_person, customer.phone, customer.email].filter(Boolean).join(' | ')}</div>
          )}
        </div>
        <div className="tax-invoice-cell">
          <h4>Ship To</h4>
          <strong>{customer?.customer_name ?? '—'}</strong>
          <Lines value={data.shipping_address || customer?.shipping_address || customer?.billing_address} />
          {company?.ship_from_address && <div className="tax-invoice-muted"><b>Ship From:</b> {company.ship_from_address}</div>}
        </div>
      </section>

      <table className="tax-invoice-table">
        <thead>
          <tr>
            <th>#</th><th>Description</th><th>HSN/SAC</th><th className="num">Qty</th><th>Unit</th>
            <th className="num">Rate</th><th className="num">GST %</th><th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{item.description || '—'}</td>
              <td>{item.hsn_sac}</td>
              <td className="num">{item.quantity}</td>
              <td>{item.unit}</td>
              <td className="num">{formatMoney(item.rate)}</td>
              <td className="num">{item.gst_percentage}%</td>
              <td className="num">{formatMoney(item.amount)}</td>
            </tr>
          ))}
          {!data.items.length && <tr><td colSpan={8} className="tax-invoice-muted">No line items</td></tr>}
        </tbody>
      </table>

      <section className="tax-invoice-summary">
        <div className="tax-invoice-summary-left">
          <div className="tax-invoice-cell">
            <h4 className="tax-invoice-band">Amount In Words</h4>
            <strong>{data.amount_in_words}</strong>
          </div>
          <div className="tax-invoice-cell">
            <h4 className="tax-invoice-band">Payment / Bank Details</h4>
            <dl className="tax-invoice-dl">
              <dt>Bank Name</dt><dd>{company?.bank_name || '—'}</dd>
              <dt>Account Name</dt><dd>{company?.bank_account_name || company?.company_name || '—'}</dd>
              <dt>Account No.</dt><dd>{company?.bank_account_no || '—'}</dd>
              <dt>IFSC / SWIFT</dt><dd>{company?.bank_ifsc || '—'}</dd>
              {company?.bank_branch && <><dt>Branch</dt><dd>{company.bank_branch}</dd></>}
              <dt>Payment Terms</dt><dd>{data.payment_terms || '—'}</dd>
            </dl>
          </div>
        </div>
        <table className="tax-invoice-totals" aria-label="Invoice totals">
          <tbody>
            {totals.map(([label, value]) => (
              <tr key={label}><th scope="row">{label}</th><td>{formatSigned(label === 'Discount' && value ? -value : value)}</td></tr>
            ))}
            <tr className="grand"><th scope="row">Grand Total</th><td>{formatSigned(data.grand_total)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="tax-invoice-grid two">
        <div className="tax-invoice-cell">
          <h4 className="tax-invoice-band">Terms &amp; Notes</h4>
          <ol className="tax-invoice-terms">{terms.map((term, index) => <li key={index}>{term}</li>)}</ol>
        </div>
        <div className="tax-invoice-cell tax-invoice-signatory">
          <h4 className="tax-invoice-band">For {company?.company_name ?? '—'}</h4>
          <div className="tax-invoice-sign-line">Authorised Signatory</div>
        </div>
      </section>

      <footer className="tax-invoice-footer">
        This is a computer-generated invoice format. Replace bracketed fields before use.
      </footer>
    </article>
  );
}
