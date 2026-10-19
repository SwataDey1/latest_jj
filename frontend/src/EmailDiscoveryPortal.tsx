import React, { useEffect, useMemo, useState } from 'react';
import FedExConsignmentForm, { type FedExMailDetails } from './FedExConsignmentForm';

type Sensitivity = 'High' | 'Medium' | 'Low';

type ExcelOrder = {
  order_id: string;
  description: string;
  customer_name: string;
  order_status: string;
  po_number: string;
  po_status: string;
  invoice_status: string;
  invoice_amount: string;
  priority: string;
  current_role: string;
  next_role: string;
  pending_action: string;
};

type ExcelCustomer = {
  customer_name: string;
  customer_id: string;
  total_orders: number;
  open_orders: number;
  open_deliveries: number;
  open_invoices: number;
};

type ExcelEmail = {
  email_id: string;
  order_id: string;
  subject: string;
  sender_email: string;
  received_time: string;
  summary: string;
  next_action: string;
  priority: string;
  order: ExcelOrder | null;
  customer: ExcelCustomer | null;
};

type MailEmail = {
  id: number;
  code: string;
  scenario: string;
  subject: string;
  from: string;
  mailbox: string;
  source: string;
  sensitivity: Sensitivity;
  date: string;
  receivedTime: string;
  attachment: string;
  content: string;
  nextAction: string;
  orderId: string;
  order: ExcelOrder | null;
  customer: ExcelCustomer | null;
};

type AdvFilters = {
  subject: string;
  sender: string;
  attachment: string;
  sensitivity: '' | Sensitivity;
  from: string;
  to: string;
  hasAttachment: boolean;
};

type EmailDiscoveryWorkItem = {
  work_item_id: string;
  label: string;
  work_item: string;
  customer_request_id: string;
};
type ActionType = 'Change Address' | 'Change Delivery Date' | 'Change Delivery SPOC' | 'Cancel Order' | 'Create Invoice' | 'FedEx ID Requested' | 'Draft Mail';
export type OrderMapping = {
  orderNumber: string;
  customerName: string;
  deliveryReference: string;
  invoiceNumber: string;
  orderStatus: string;
  invoiceDate?: string;
  invoiceStatus?: string;
  invoiceAmount?: string;
  invoiceId?: number;
  companyId?: string;
  customerId?: string;
  productId?: string;
  quantity?: number;
};

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (window.location.port === '5173' ? 'http://localhost:8000' : window.location.origin);

const ACTION_BY_SCENARIO: Record<string, ActionType> = {
  'Address Change': 'Change Address', 'Delivery Date Change': 'Change Delivery Date', 'SPOC Change': 'Change Delivery SPOC',
  'Cancel Order': 'Cancel Order', 'Invoice Request': 'Create Invoice', 'New Order Creation': 'Create Invoice', 'FedEx ID Requested': 'FedEx ID Requested', 'General Inquiry': 'Draft Mail',
};
const ACTION_LABEL: Record<ActionType, string> = {
  'Change Address': 'Change Delivery Address',
  'Change Delivery Date': 'Change Delivery Date',
  'Change Delivery SPOC': 'Change SPOC',
  'Cancel Order': 'Cancel Order',
  'Create Invoice': 'Create Invoice',
  'FedEx ID Requested': 'Mail FedEx ID',
  'Draft Mail': 'Draft Mail',
};
const FORM_BUTTON_LABEL: Record<ActionType, string> = {
  'Change Address': 'Open Address Form',
  'Change Delivery Date': 'Open Delivery Date Form',
  'Change Delivery SPOC': 'Open SPOC Form',
  'Cancel Order': 'Open Cancellation Form',
  'Create Invoice': 'Open Invoice Form',
  'FedEx ID Requested': 'Open FedEx Consignment',
  'Draft Mail': 'Draft Mail',
};
const ACTION_REASON: Record<string, string> = {
  'Address Change': 'Customer requested delivery destination modification.',
  'Delivery Date Change': 'Customer requested a revised delivery date.',
  'SPOC Change': 'Customer provided updated order contact details.',
  'Cancel Order': 'Customer requested the order to be cancelled.',
  'Invoice Request': 'Customer requested an invoice for the order.',
  'New Order Creation': 'Customer requested creation of a new order from the purchase request.',
  'FedEx ID Requested': 'Customer requested FedEx ID for the shipment.',
};
const MAILBOXES = ['HP Mailbox', 'HR Mailbox', 'Finance Mailbox', 'Legal Mailbox'];
const FEEDS = ['Exchange', 'Outlook', 'Teams', 'Shared Mailbox'];
const NO_INVOICE_STATUSES = ['', 'not started', 'not created'];
const EMPTY_ADV: AdvFilters = { subject: '', sender: '', attachment: '', sensitivity: '', from: '', to: '', hasAttachment: false };
const BADGE: Record<Sensitivity, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
const has = (v: string, q: string) => !q || v.toLowerCase().includes(q.toLowerCase());
const toggle = (list: string[], x: string) => (list.includes(x) ? list.filter((i) => i !== x) : [...list, x]);
const show = (value?: string | number | null) => (value === undefined || value === null || value === '' ? '—' : value);

const toSensitivity = (...values: string[]): Sensitivity => {
  const value = values.find(Boolean)?.toLowerCase() ?? '';
  if (value.startsWith('high') || value.startsWith('urgent') || value.startsWith('critical')) return 'High';
  if (value.startsWith('low')) return 'Low';
  return 'Medium';
};

const scenarioFor = (subject: string, summary: string) => {
  const text = `${subject} ${summary}`.toLowerCase();
  if (text.includes('address')) return 'Address Change';
  if (text.includes('cancel')) return 'Cancel Order';
  if (text.includes('contact') || text.includes('spoc') || text.includes('account')) return 'SPOC Change';
  if (['delay', 'backorder', 'shipping', 'delivery', 'reschedul', 'expedite'].some((k) => text.includes(k))) return 'Delivery Date Change';
  if (text.includes('purchase order') || text.includes('new order')) return 'New Order Creation';
  if (text.includes('invoice') || text.includes('billing') || text.includes('payment')) return 'Invoice Request';
  if (text.includes('fedex') || text.includes('consignment') || text.includes('tracking')) return 'FedEx ID Requested';
  return 'General Inquiry';
};

const toMailEmail = (row: ExcelEmail, index: number): MailEmail => ({
  id: index + 1,
  code: row.email_id,
  scenario: scenarioFor(row.subject, row.summary),
  subject: row.subject,
  from: row.sender_email,
  mailbox: 'HP Mailbox',
  source: 'Exchange',
  sensitivity: toSensitivity(row.priority, row.order?.priority ?? ''),
  date: row.received_time.slice(0, 10),
  receivedTime: row.received_time.replace('T', ' '),
  attachment: '',
  content: row.summary,
  nextAction: row.next_action,
  orderId: row.order_id,
  order: row.order,
  customer: row.customer,
});

const toMapping = (email: MailEmail): OrderMapping => {
  const invoiceStatus = email.order?.invoice_status ?? '';
  return {
    orderNumber: email.orderId,
    customerName: email.order?.customer_name || '—',
    deliveryReference: email.order?.po_number || 'Not assigned',
    invoiceNumber: NO_INVOICE_STATUSES.includes(invoiceStatus.toLowerCase()) ? 'Not created' : `Invoice ${invoiceStatus}`,
    orderStatus: email.order?.order_status || '—',
    invoiceStatus: invoiceStatus || 'Not created',
    invoiceAmount: email.order?.invoice_amount || undefined,
    invoiceDate: email.date,
  };
};

const formatAmount = (value?: string) => {
  const amount = Number(value);
  return value && Number.isFinite(amount) ? amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—';
};

const CSS = `
*{box-sizing:border-box}
.edp{min-height:100vh;background:#f1f5f9;font-family:"Segoe UI",system-ui,sans-serif;color:#0f172a}
.edp .hdr{background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:14px 24px;gap:16px;flex-wrap:wrap}
.edp .hdr h2{margin:0;font-size:20px}
.edp .row{display:flex;gap:8px;align-items:center}
.edp .inp{padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;width:100%}
.edp .hdr .inp{width:300px;border:none}
.edp .btn{padding:9px 14px;border:none;border-radius:8px;cursor:pointer;font:inherit;font-weight:600;background:#e2e8f0;color:#0f172a;transition:.15s}
.edp .btn:hover{filter:brightness(.92)}.edp .btn:disabled{opacity:.5;cursor:not-allowed}
.edp .pri{background:#2563eb;color:#fff}.edp .dot{background:#f59e0b;border-radius:50%;width:8px;height:8px;display:inline-block;margin-left:6px}
.edp{container-type:inline-size}
.edp .main{display:grid;grid-template-columns:220px minmax(0,1fr) 340px;align-items:start;gap:16px;padding:16px}
.edp .main>section{position:sticky;top:16px}
.edp td:nth-child(1),.edp td:nth-child(5),.edp td:nth-child(6),.edp .badge{white-space:nowrap}
.edp td:nth-child(1){font-weight:600}
@container (max-width:1200px){
.edp .main{grid-template-columns:minmax(0,1fr) 320px}
.edp .main>aside{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr auto;gap:8px 24px;align-items:start}
.edp .main>aside hr{display:none}
.edp .main>aside>.btn{margin-top:0!important;width:auto!important;align-self:center}
.edp .grp{display:flex;flex-wrap:wrap;gap:0 12px}.edp .grp>.row{flex-basis:100%}.edp .grp h3{margin-bottom:4px}
}
@container (max-width:760px){
.edp .main{grid-template-columns:minmax(0,1fr)}
.edp .main>aside{grid-template-columns:1fr}
.edp .main>section{position:static}
.edp .main>main{display:contents}
.edp .main>main>.stats{order:1;margin-bottom:0}.edp .main>section{order:2}.edp .main>main>.card{order:3}
}
.edp .card{background:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.edp .card h3{margin:0 0 12px;font-size:16px}
.edp .chk{display:flex;align-items:center;gap:8px;padding:6px 4px;border-radius:6px;cursor:pointer}
.edp .chk:hover{background:#f1f5f9}.edp .chk span{flex:1}
.edp .x{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px}.edp .x:hover{color:#ef4444}
.edp .link{background:none;border:none;color:#2563eb;cursor:pointer;font-size:12px;padding:0}
.edp .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.edp .stat{color:#fff;padding:14px 16px;border-radius:12px}.edp .stat p{margin:0;opacity:.85;font-size:13px}.edp .stat b{font-size:28px}
.edp table{width:100%;border-collapse:collapse}.edp th{text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;padding:8px}
.edp td{padding:10px 8px;border-top:1px solid #f1f5f9}.edp tbody tr{cursor:pointer}.edp tbody tr:hover{background:#f8fafc}
.edp tr.sel{background:#eff6ff!important}
.edp .badge{color:#fff;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
.edp .muted{color:#64748b;font-size:14px}.edp .meta p{margin:6px 0;font-size:14px}
.edp .ov{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;justify-content:center;align-items:center}
.edp .modal{width:440px;background:#fff;border-radius:12px;padding:22px;display:grid;gap:10px}
.edp .modal h3{margin:0}.edp .lbl{font-size:12px;color:#64748b}
.edp .err{color:#ef4444;font-size:13px}
.edp-workflow{margin:0 16px 16px;background:#fff;border:1px solid #dbeafe}.edp-workflow .workflow-banner{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:16px}.edp-workflow h2{margin:3px 0 6px}.edp-workflow p{margin:0;color:#475569;max-width:900px}.recommendation{background:#dcfce7;color:#166534;padding:8px 12px;border-radius:999px;font-weight:700;white-space:nowrap}.workflow-track{display:flex;gap:6px;overflow:auto;padding:18px 0}.workflow-step{display:flex;align-items:center;gap:7px;min-width:150px;border:1px solid #cbd5e1;background:#f8fafc;color:#475569;border-radius:8px;padding:9px;text-align:left}.workflow-step b{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:#cbd5e1;color:#fff}.workflow-step.done{border-color:#86efac}.workflow-step.done b{background:#16a34a}.workflow-step.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.workflow-step.active b{background:#2563eb}.workflow-columns{display:grid;grid-template-columns:1fr 1fr;gap:20px;border-top:1px solid #e2e8f0;padding-top:16px}.mapping-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0}.mapping-grid div{background:#f8fafc;padding:10px;border-radius:8px}.mapping-grid dt{font-size:11px;color:#64748b;text-transform:uppercase}.mapping-grid dd{margin:3px 0 0;font-weight:600}.action-bar,.history-strip{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px}.action-bar span{color:#1d4ed8;font-weight:700}.action-bar .btn{margin-left:auto}.action-form{margin-top:16px;border:1px solid #bfdbfe;border-radius:10px;padding:16px;background:#f8fbff}.action-form .panel-heading{display:flex;justify-content:space-between}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}.form-grid label{display:grid;gap:5px;font-size:12px;font-weight:700;color:#475569}.form-grid input,.form-grid textarea{width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:9px;font:inherit;color:#0f172a;background:#fff}.status-pill{color:#166534;background:#dcfce7;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700}.history-strip{font-size:12px;color:#475569}.history-strip strong{color:#0f172a}@container (max-width:760px){.edp-workflow{margin:0 8px 8px}.edp-workflow .workflow-banner,.workflow-columns{display:block}.recommendation{display:inline-block;margin-top:12px}.form-grid{grid-template-columns:1fr}.action-bar .btn{margin-left:0;width:100%}}
.workflow-context{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:16px}.workflow-context h3{margin:0 0 10px}
.invoice-context{grid-column:1/-1;width:100%}
.invoice-grid{grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
.invoice-actions{display:flex;justify-content:flex-end}
@container (max-width:480px){.invoice-grid{grid-template-columns:1fr}}
.email-message-field{grid-column:1/-1}
.email-message-field textarea{width:100%;min-height:220px;resize:vertical}
.recommendation-details{align-items:flex-end}.recommendation-details>div{flex:1}.recommendation-details h3{margin:0 0 10px}.recommendation-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0}.recommendation-grid div{background:#fff;border:1px solid #dbe4f0;border-radius:8px;padding:10px}.recommendation-grid dt{font-size:11px;color:#64748b;text-transform:uppercase}.recommendation-grid dd{margin:4px 0 0;font-weight:700;color:#1d4ed8}
.ownership-history{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:16px}.ownership-history h3{margin:0 0 12px}.ownership-timeline{display:grid;gap:0}.ownership-entry{position:relative;display:grid;grid-template-columns:18px 1fr;gap:10px;padding:0 0 16px}.ownership-entry:not(:last-child)::before{content:'';position:absolute;left:8px;top:18px;bottom:0;border-left:2px solid #cbd5e1}.ownership-marker{z-index:1;width:16px;height:16px;margin-top:2px;border:3px solid #cbd5e1;border-radius:50%;background:#fff}.ownership-entry.completed .ownership-marker{border-color:#16a34a;background:#dcfce7}.ownership-entry.current .ownership-marker{border-color:#2563eb;background:#dbeafe}.ownership-entry.next .ownership-marker{border-color:#94a3b8}.ownership-entry strong{display:block;color:#173b69}.ownership-entry small{display:block;margin-top:3px;color:#64748b}.ownership-entry p{margin:5px 0 0;color:#475569;font-size:13px}
.action-modal-card{width:min(720px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto}.action-modal-card .action-form{margin-top:12px}.action-modal-card .action-form .panel-heading{display:none}
.form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.confirmation-box{display:grid;gap:8px;margin-top:14px;padding:14px;border:1px solid #fca5a5;border-radius:8px;background:#fff1f2}.confirmation-box p{margin:0;color:#7f1d1d}.confirmation-box .btn{justify-self:end}
.excel-note{margin:0 0 12px;color:#64748b;font-size:12px}
`;

type CheckListProps = {
  title: string;
  items: string[];
  sel: string[];
  setSel: (items: string[]) => void;
  onRemove?: (item: string) => void;
};

function CheckList({ title, items, sel, setSel, onRemove }: CheckListProps) {
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{title}</h3>
        <button className="link" onClick={() => setSel(sel.length === items.length ? [] : items)}>
          {sel.length === items.length ? 'None' : 'All'}
        </button>
      </div>
      {items.map((i) => (
        <label key={i} className="chk">
          <input type="checkbox" checked={sel.includes(i)} onChange={() => setSel(toggle(sel, i))} />
          <span>{i}</span>
          {onRemove && !FEEDS.includes(i) && (
            <button className="x" title="Remove feed" onClick={(e) => { e.preventDefault(); onRemove(i); }}>×</button>
          )}
        </label>
      ))}
    </>
  );
}

export default function EmailDiscoveryPortal({ onInvoiceAction }: { workItem: EmailDiscoveryWorkItem; onInvoiceAction?: (action: 'create' | 'view' | 'edit', mapping: OrderMapping) => void }) {
  const [allEmails, setAllEmails] = useState<MailEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [adv, setAdv] = useState<AdvFilters>(EMPTY_ADV);
  const [draft, setDraft] = useState<AdvFilters>(EMPTY_ADV);
  const [feeds, setFeeds] = useState<string[]>(FEEDS);
  const [selMailboxes, setSelMailboxes] = useState<string[]>(MAILBOXES);
  const [selSources, setSelSources] = useState<string[]>(FEEDS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modal, setModal] = useState<'adv' | 'feed' | null>(null);
  const [newFeed, setNewFeed] = useState('');
  const [action, setAction] = useState<ActionType | null>(null);
  const [saved, setSaved] = useState(false);
  const [fedexMail, setFedexMail] = useState<FedExMailDetails | null>(null);
  const [fedexMailSent, setFedexMailSent] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`${API_BASE}/api/emails`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Email API returned ${response.status}`);
        const rows = (await response.json()) as ExcelEmail[];
        setAllEmails(rows.map(toMailEmail));
        setLoadError('');
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load emails.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const emails = useMemo(
    () =>
      allEmails.filter(
        (m) =>
          selMailboxes.includes(m.mailbox) &&
          selSources.includes(m.source) &&
          (has(m.subject, query) || has(m.content, query) || has(m.from, query) || has(m.code, query) || has(m.scenario, query) || has(m.orderId, query)) &&
          has(m.subject, adv.subject) &&
          has(m.from, adv.sender) &&
          has(m.attachment || '', adv.attachment) &&
          (!adv.sensitivity || m.sensitivity === adv.sensitivity) &&
          (!adv.hasAttachment || !!m.attachment) &&
          (!adv.from || m.date >= adv.from) &&
          (!adv.to || m.date <= adv.to)
      ),
    [allEmails, selMailboxes, selSources, query, adv]
  );
  const selected = emails.find((m) => m.id === selectedId);
  const mapping = selected ? toMapping(selected) : null;
  const customer = selected?.customer ?? null;
  const order = selected?.order ?? null;
  const recommendedAction = selected ? ACTION_BY_SCENARIO[selected.scenario] ?? 'Change Delivery Date' : null;
  const currentWorkflowProcess = action ? ACTION_LABEL[action] : 'Select Order Mapping';
  const invoiceMissing = mapping ? mapping.invoiceNumber === 'Not created' : false;
  const advActive = JSON.stringify(adv) !== JSON.stringify(EMPTY_ADV);
  const previousOwner = 'Mailbox Intake';
  const currentOwner = order?.current_role || 'Order Management';
  const nextOwner = order?.next_role || 'Fulfillment';

  const selectEmail = (id: number) => {
    setSelectedId(id);
    setAction(null);
    setSaved(false);
    setFedexMail(null);
  };

  const search = () => {
    setQuery(searchText.trim());
    setSelectedId(null);
  };
  const reset = () => {
    setSearchText(''); setQuery(''); setAdv(EMPTY_ADV); setDraft(EMPTY_ADV);
    setSelMailboxes(MAILBOXES); setSelSources(feeds); setSelectedId(null); setAction(null); setSaved(false);
  };
  const feedName = newFeed.trim();
  const feedDup = feeds.some((f) => f.toLowerCase() === feedName.toLowerCase());
  const saveFeed = () => {
    if (!feedName || feedDup) return;
    setFeeds([...feeds, feedName]);
    setSelSources([...selSources, feedName]);
    setNewFeed(''); setModal(null);
  };
  const removeFeed = (f: string) => {
    setFeeds(feeds.filter((x) => x !== f));
    setSelSources(selSources.filter((x) => x !== f));
  };
  const setD = (k: keyof AdvFilters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setDraft({ ...draft, [k]: value });
  };

  return (
    <div className="edp">
      <style>{CSS}</style>

      <header className="hdr">
        <h2>Email Discovery Portal</h2>
        <div className="row">
          <input className="inp" placeholder="Search subject, content, sender, order..." value={searchText}
            onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
          <button className="btn pri" onClick={search}>Search</button>
          <button className="btn" onClick={reset}>Reset</button>
          <button className="btn" onClick={() => { setDraft(adv); setModal('adv'); }}>
            Advanced{advActive && <span className="dot" />}
          </button>
        </div>
      </header>

      <div className="main">
        <aside className="card">
          <div className="grp"><CheckList title="📬 Mailboxes" items={MAILBOXES} sel={selMailboxes} setSel={setSelMailboxes} /></div>
          <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
          <div className="grp"><CheckList title="🔗 Sources" items={feeds} sel={selSources} setSel={setSelSources} onRemove={removeFeed} /></div>
          <button className="btn pri" style={{ width: '100%', marginTop: 16 }} onClick={() => setModal('feed')}>+ Add Feed</button>
        </aside>

        <main>
          <div className="stats">
            <div className="stat" style={{ background: '#2563eb' }}><p>Total Emails</p><b>{emails.length}</b></div>
            <div className="stat" style={{ background: '#ef4444' }}><p>High Sensitivity</p><b>{emails.filter((m) => m.sensitivity === 'High').length}</b></div>
            <div className="stat" style={{ background: '#10b981' }}><p>Active Sources</p><b>{selSources.length}</b></div>
          </div>
          <div className="card">
            <h3>📋 Search Results</h3>
            {loading ? (
              <p className="muted">Loading emails from Excel...</p>
            ) : loadError ? (
              <p className="err">{loadError}</p>
            ) : emails.length ? (
              <table>
                <thead><tr><th>ID</th><th>Scenario</th><th>Subject</th><th>Mailbox</th><th>Date</th><th>Sensitivity</th></tr></thead>
                <tbody>
                  {emails.map((m) => (
                    <tr key={m.id} className={m.id === selectedId ? 'sel' : ''} onClick={() => selectEmail(m.id)}>
                      <td>{m.code}</td><td>{m.scenario}</td><td>{m.subject}</td><td>{m.mailbox}</td><td>{m.date}</td>
                      <td><span className="badge" style={{ background: BADGE[m.sensitivity] }}>{m.sensitivity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">No emails match your filters. <button className="link" onClick={reset}>Clear all filters</button></p>
            )}
          </div>
        </main>

        <section className="card">
          <h3>📩 Email Preview</h3>
          {selected ? (
            <div className="meta">
              <h2 style={{ margin: '0 0 10px' }}>{selected.subject}</h2>
              <p><b>ID:</b> {selected.code}</p>
              <p><b>Order ID:</b> {selected.orderId}</p>
              <p><b>Scenario:</b> {selected.scenario}</p>
              <p><b>From:</b> {selected.from}</p>
              <p><b>Mailbox:</b> {selected.mailbox}</p>
              <p><b>Source:</b> {selected.source}</p>
              <p><b>Received:</b> {selected.receivedTime}</p>
              <p><b>Sensitivity:</b> <span className="badge" style={{ background: BADGE[selected.sensitivity] }}>{selected.sensitivity}</span></p>
              <hr /><p>{selected.content}</p>
              {selected.nextAction && <p><b>Next Action:</b> {selected.nextAction}</p>}
              <hr />
              {selected.attachment && <p>📎 {selected.attachment}</p>}
            </div>
          ) : (
            <p className="muted">Select an email from search results.</p>
          )}
        </section>
      </div>

      {selected && mapping && (
        <section className="edp-workflow card">
          <div className="workflow-banner"><div><span className="lbl">Email Summary</span><h2>{selected.subject}</h2><p>{selected.content}</p></div><span className="recommendation">Recommended: {recommendedAction && ACTION_LABEL[recommendedAction]}</span></div>
          <div className="workflow-columns">
            <div><h3>Email Summary</h3><dl className="mapping-grid"><div><dt>Email ID</dt><dd>{selected.code}</dd></div><div><dt>Sender</dt><dd>{selected.from}</dd></div><div><dt>Received</dt><dd>{selected.receivedTime}</dd></div><div><dt>Requested Action</dt><dd>{selected.scenario}</dd></div><div><dt>Next Action</dt><dd>{show(selected.nextAction)}</dd></div><div><dt>Priority</dt><dd>{selected.sensitivity}</dd></div></dl></div>
            <div><h3>Customer Context</h3><dl className="mapping-grid"><div><dt>Customer Name</dt><dd>{mapping.customerName}</dd></div><div><dt>Customer ID</dt><dd>{show(customer?.customer_id)}</dd></div><div><dt>Total Orders</dt><dd>{show(customer?.total_orders)}</dd></div><div><dt>Open Orders</dt><dd>{show(customer?.open_orders)}</dd></div><div><dt>Open Deliveries</dt><dd>{show(customer?.open_deliveries)}</dd></div><div><dt>Open Invoices</dt><dd>{show(customer?.open_invoices)}</dd></div></dl></div>
            <div className="invoice-context">
  <h3>Invoice Context</h3>

  <dl className="mapping-grid invoice-grid">
    <div>
      <dt>Description</dt>
      <dd>{show(order?.description)}</dd>
    </div>

    <div>
      <dt>PO Number</dt>
      <dd>{mapping.deliveryReference}</dd>
    </div>

    <div>
      <dt>PO Status</dt>
      <dd>{show(order?.po_status)}</dd>
    </div>

    <div>
      <dt>Order Status</dt>
      <dd>{mapping.orderStatus}</dd>
    </div>

    <div>
      <dt>Invoice Status</dt>
      <dd>{mapping.invoiceStatus}</dd>
    </div>

    <div>
      <dt>Invoice Amount</dt>
      <dd>{formatAmount(mapping.invoiceAmount)}</dd>
    </div>

    <div>
      <dt>Linked Order</dt>
      <dd>{mapping.orderNumber}</dd>
    </div>

    <div>
      <dt>Pending Action</dt>
      <dd>{show(order?.pending_action)}</dd>
    </div>
  </dl>

  {invoiceMissing && (
    <>
      <div className="invoice-actions">
        {onInvoiceAction && (
          <button
            className="btn pri"
            type="button"
            onClick={() => onInvoiceAction("create", mapping)}
          >
            Create Invoice
          </button>
        )}
      </div>
    </>
  )}
</div>
          </div>
          
          <div className="ownership-history"><h3>Workflow Ownership History</h3><h5>Status : {saved ? 'Advanced to next process' : 'In Progress'}</h5><div className="ownership-timeline"><article className="ownership-entry completed"><span className="ownership-marker" /><div><strong>Previous Owner: {previousOwner}</strong><small>Assigned Date: {selected.date} · Status: Completed</small><p>Email received and details extracted for order lookup.</p></div></article><article className={`ownership-entry ${saved ? 'completed' : 'current'}`}><span className="ownership-marker" /><div><strong>Current Owner: {currentOwner}</strong><small>Assigned Date: {selected.date} · Status: {saved ? 'Completed' : 'In Progress'}</small><p>{saved ? 'Action form saved and workflow advanced.' : (order?.pending_action || 'Reviewing the customer request and preparing the recommended action.')}</p></div></article><article className={`ownership-entry ${saved ? 'current' : 'next'}`}><span className="ownership-marker" /><div><strong>Next Owner: {nextOwner}</strong><small>Assigned Date: {selected.date} · Status: {saved ? 'In Progress' : 'Pending'}</small><p>{saved ? 'Ready to continue the next workflow process.' : 'Will receive the request after the current action is completed.'}</p></div></article></div></div>
          <div className="action-bar recommendation-details"><div><h3>Recommended Action</h3><dl className="recommendation-grid"><div><dt>Recommended Action</dt><dd>{recommendedAction && ACTION_LABEL[recommendedAction]}</dd></div><div><dt>Reason</dt><dd>{ACTION_REASON[selected.scenario] || 'The selected email requires customer order follow-up.'}</dd></div><div><dt>Priority</dt><dd>{selected.sensitivity}</dd></div></dl></div><button className="btn pri" type="button" onClick={() => { setAction(recommendedAction); setSaved(false); }}>{recommendedAction && FORM_BUTTON_LABEL[recommendedAction]}</button></div>
          {action === 'FedEx ID Requested' && <div className="ov action-modal" onClick={() => { setAction(null); setFedexMail(null); }}><FedExConsignmentForm key={`${selected.code}-fedex`} apiBase={API_BASE} orderId={selected.orderId} saved={saved} onSave={() => setSaved(true)} onCancel={() => { setAction(null); setFedexMail(null); }} onDraftMail={(details) => { setFedexMail(details); setFedexMailSent(false); }} /></div>}
          {action === 'FedEx ID Requested' && fedexMail && <div className="ov action-modal" onClick={() => setFedexMail(null)}><div className="modal action-modal-card" onClick={(event) => event.stopPropagation()}><div className="row" style={{ justifyContent: 'space-between' }}><h3>Draft Mail · FedEx Tracking Number</h3><button className="x" type="button" aria-label="Close mail draft" onClick={() => setFedexMail(null)}>×</button></div><ActionForm key={`${selected.code}-fedex-mail-${fedexMail.orderId}-${fedexMail.tracking}`} action="Draft Mail" mapping={mapping} email={selected} saved={fedexMailSent} initialValues={{ mailSubject: `Re: ${selected.subject} - FedEx Tracking No. ${fedexMail.tracking}`, mailBody: fedexTrackingMailBody(fedexMail) }} onSave={() => setFedexMailSent(true)} onCancel={() => setFedexMail(null)} /></div></div>}
          {action && action !== 'FedEx ID Requested' && <div className="ov action-modal" onClick={() => setAction(null)}><div className="modal action-modal-card" onClick={(event) => event.stopPropagation()}><div className="row" style={{ justifyContent: 'space-between' }}><h3>{recommendedAction && ACTION_LABEL[recommendedAction]}</h3><button className="x" type="button" aria-label="Close form" onClick={() => setAction(null)}>×</button></div><ActionForm key={`${selected.code}-${action}`} action={action} mapping={mapping} email={selected} saved={saved} onSave={() => setSaved(true)} onCancel={() => setAction(null)} /></div></div>}
        </section>
      )}

      {modal === 'adv' && (
        <div className="ov" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Advanced Search</h3>
            <input className="inp" placeholder="Subject" value={draft.subject} onChange={setD('subject')} />
            <input className="inp" placeholder="Sender email" value={draft.sender} onChange={setD('sender')} />
            <input className="inp" placeholder="Attachment name" value={draft.attachment} onChange={setD('attachment')} />
            <select className="inp" value={draft.sensitivity} onChange={setD('sensitivity')}>
              <option value="">All sensitivities</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
            <div className="row">
              <div style={{ flex: 1 }}><span className="lbl">From</span><input className="inp" type="date" value={draft.from} max={draft.to || undefined} onChange={setD('from')} /></div>
              <div style={{ flex: 1 }}><span className="lbl">To</span><input className="inp" type="date" value={draft.to} min={draft.from || undefined} onChange={setD('to')} /></div>
            </div>
            <label className="chk"><input type="checkbox" checked={draft.hasAttachment} onChange={setD('hasAttachment')} /> Has attachment</label>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <button className="btn" onClick={() => setDraft(EMPTY_ADV)}>Clear</button>
              <div className="row">
                <button className="btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn pri" onClick={() => { setAdv(draft); setSelectedId(null); setModal(null); }}>Apply Filters</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'feed' && (
        <div className="ov" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Feed</h3>
            <input className="inp" autoFocus placeholder="Feed name" value={newFeed}
              onChange={(e) => setNewFeed(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveFeed()} />
            {feedDup && feedName && <span className="err">Feed already exists.</span>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => { setNewFeed(''); setModal(null); }}>Cancel</button>
              <button className="btn pri" disabled={!feedName || feedDup} onClick={saveFeed}>Save Feed</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fedexTrackingMailBody({ orderId, tracking, service, shipDate, status, recipient }: FedExMailDetails) {
  const details = [
    `FedEx Tracking Number: ${tracking}`,
    service && `FedEx Service: ${service}`,
    shipDate && `Ship Date: ${shipDate}`,
    status && `Shipment Status: ${status}`,
  ].filter(Boolean).join('\n');
  return [
    `Dear ${recipient || 'Customer'},`,
    `Thank you for your enquiry regarding order ${orderId}. Please find the FedEx consignment details below:`,
    details,
    `You can track your shipment at https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(tracking)}`,
    'Kind regards,\nCustomer Service Team',
  ].join('\n\n');
}

function ActionForm({ action, mapping, email, saved, onSave, onCancel, initialValues }: { action: ActionType; mapping: OrderMapping; email: MailEmail; saved: boolean; onSave: () => void; onCancel: () => void; initialValues?: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>({
    orderNumber: mapping.orderNumber, customerName: mapping.customerName, shipName: mapping.customerName, shipTo: '', city: '', state: '', postalCode: '', phone: '',
    existingDate: '', newDate: '', name: '', email: email.from, department: '', reason: email.content, remarks: email.nextAction,
    invoiceNumber: mapping.invoiceNumber, seller: '', customerDetails: `${mapping.customerName} · ${mapping.orderNumber}`, bill: mapping.customerName, ship: mapping.customerName,
    product: email.order?.description ?? '', quantity: '', unitPrice: '', tax: '', terms: '', total: formatAmount(mapping.invoiceAmount),
    mailTo: email.from, mailSubject: `Re: ${email.subject}`, mailBody: email.content,
    ...initialValues,
  });
  const [confirming, setConfirming] = useState(false);
  const update = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [key]: event.target.value });
  const fields: Record<ActionType, [string, string][]> = {
    'Change Address': [['Order Number', 'orderNumber'], ['Customer Name', 'customerName'], ['Ship To Name', 'shipName'], ['Ship To Address', 'shipTo'], ['City', 'city'], ['State', 'state'], ['Postal Code', 'postalCode'], ['Phone Number', 'phone']],
    'Change Delivery Date': [['Order Number', 'orderNumber'], ['Current Delivery Date', 'existingDate'], ['New Delivery Date', 'newDate'], ['Change Reason', 'reason'], ['Remarks', 'remarks']],
    'Change Delivery SPOC': [['Contact Name', 'name'], ['Email', 'email'], ['Phone Number', 'phone'], ['Department', 'department']],
    'Cancel Order': [['Order Number', 'orderNumber'], ['Customer Name', 'customerName'], ['Cancellation Reason', 'reason'], ['Additional Remarks', 'remarks']],
    'Create Invoice': [['Invoice Number', 'invoiceNumber'], ['Seller Details', 'seller'], ['Customer Details', 'customerDetails'], ['Bill To Address', 'bill'], ['Ship To Address', 'ship'], ['Product Details', 'product'], ['Quantity', 'quantity'], ['Unit Price', 'unitPrice'], ['Tax', 'tax'], ['Payment Terms', 'terms'], ['Total Amount', 'total']],
    'FedEx ID Requested': [['Order Number', 'orderNumber'], ['Customer Name', 'customerName'], ['Email', 'email'], ['FedEx ID', 'remarks']],
    'Draft Mail': [['To', 'mailTo'], ['Subject', 'mailSubject'], ['Message', 'mailBody']],
  };
  const textareas = ['remarks', 'reason', 'shipTo', 'seller', 'bill', 'ship', 'product', 'mailBody'];
  return <div className="action-form"><div className="panel-heading"><div><span className="lbl">Workflow ID: WF-{mapping.orderNumber}</span><h3>{action === 'Draft Mail' ? 'Email Draft' : `${action} Form`}</h3></div><span className="status-pill">{saved ? action === 'Draft Mail' ? 'Sent (Demo)' : 'Saved' : 'Draft'}</span></div><div className="form-grid">{fields[action].map(([label, key]) => <label key={`${action}-${key}`} className={key === 'mailBody' ? 'email-message-field' : undefined}>{label}{textareas.includes(key) ? <textarea rows={key === 'mailBody' ? 8 : 2} value={values[key]} onChange={update(key)} /> : <input value={values[key]} onChange={update(key)} />}</label>)}</div>{action === 'Cancel Order' && confirming && <div className="confirmation-box" role="alert"><strong>Confirm order cancellation?</strong><p>This will submit the cancellation request for {values.orderNumber} on behalf of {values.customerName}.</p><button className="btn" type="button" onClick={() => setConfirming(false)}>Back</button><button className="btn pri" type="button" onClick={onSave}>Confirm Cancellation</button></div>}{!confirming && <div className="form-actions"><button className="btn" type="button" onClick={onCancel}>Cancel</button><button className="btn pri" type="button" onClick={() => action === 'Cancel Order' ? setConfirming(true) : onSave()}>{action === 'Cancel Order' ? 'Review Cancellation' : action === 'Create Invoice' ? 'Save Sales Invoice' : action === 'Draft Mail' ? 'Send Email' : 'Save and Complete Workflow'}</button></div>}</div>;
}
