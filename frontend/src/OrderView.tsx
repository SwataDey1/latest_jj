import { useState } from 'react';

type ConnectedRecord = {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  summary: string;
  nextAction: string;
};

type InvoiceResult = {
  orderId?: string;
  poNumber?: string;
  invoiceNumber?: string;
  status: 'Invoice Created' | 'FAILED' | 'VALIDATION_FAILED';
  errors?: string[];
};

type InvoiceHistory = {
  orderId: string;
  invoices: Array<{
    invoiceNumber: string;
    poNumber: string;
    status: string;
    validationStatus: string;
    createdAt: string;
  }>;
};

type WorkflowConfig = {
  previousRole: string;
  currentRole: string;
  nextRole: string;
  previousState: string;
  currentState: string;
  nextState: string;
  pendingAction: string;
  currentStep: number;
  steps: string[];
};

type InvoiceScenario = 'existing-po' | 'no-po' | 'validation-required';

const SCENARIOS: Record<InvoiceScenario, { label: string; orderId: string; description: string; fields: string }> = {
  'existing-po': { label: 'Existing PO', orderId: 'ORD-78419', description: 'Existing PO invoice flow', fields: 'PO-1001 is valid and ready for invoice processing.' },
  'no-po': { label: 'No PO', orderId: 'ORD-78420', description: 'New order creates a PO before invoicing', fields: 'No purchase order is available; create a new order and PO.' },
  'validation-required': { label: 'Validation Required', orderId: 'ORD-VALIDATION-FAILED', description: 'Missing invoice details validation flow', fields: 'Collect Bill To, Ship To, and Tax Details before continuing.' },
};

const PENDING_TASKS = [
  { order: 'ORD-78419', action: 'Map Email to Order', priority: 'High', due: 'Today, 4:00 PM', status: 'In Progress' },
  { order: 'ORD-78420', action: 'Validate PO', priority: 'Medium', due: 'Today, 5:30 PM', status: 'Pending' },
  { order: 'ORD-78421', action: 'Create Invoice', priority: 'High', due: 'Tomorrow, 10:00 AM', status: 'Pending' },
];

const AUDIT_TRAIL = [
  { time: '08-Oct-2026 09:00', actor: 'Email Triage System', action: 'Email Received', comment: 'Purchase order submission identified.' },
  { time: '08-Oct-2026 09:15', actor: 'CC Customer Manager', action: 'Mapped Email To Order', comment: 'Recommended order selected.' },
  { time: '08-Oct-2026 09:26', actor: 'Finance Manager', action: 'PO Validation Requested', comment: 'Awaiting invoice approval.' },
];

const COMMUNICATION_INSIGHTS = [
  ['Email', 'PO submitted with confirmed delivery address.', 'Invoice may proceed after PO validation.', 'Map email to the approved order.'],
  ['Chat', 'Customer requested expedited delivery.', 'High-priority freight approval is required.', 'Confirm the freight approval.'],
  ['Voice', 'Customer confirmed the PO reference.', 'Prevents invoice reference mismatch.', 'Validate PO reference.'],
  ['Document', 'Signed PO provides approved quantities and terms.', 'Supports invoice compliance.', 'Use PO terms on the invoice.'],
];

const WORKFLOWS: Record<string, WorkflowConfig> = {
  'ORD-78419': {
    previousRole: 'Customer', currentRole: 'CC Customer Manager', nextRole: 'Finance Manager', previousState: 'Email Details Completed', currentState: 'Query Orders In Progress', nextState: 'Select Order Mapping', pendingAction: 'Map Email To Existing Order', currentStep: 3,
    steps: ['Email Sent', 'Email View', 'Email Details', 'Query Orders', 'Select Order Mapping', 'Validate PO', 'Create Invoice', 'Invoice History'],
  },
  'ORD-78420': {
    previousRole: 'Customer', currentRole: 'CC Customer Manager', nextRole: 'Finance Manager', previousState: 'Query Orders Completed', currentState: 'No Existing Order Found', nextState: 'Create New Order', pendingAction: 'Create order and purchase order', currentStep: 4,
    steps: ['Email Sent', 'Email View', 'Email Details', 'Query Orders', 'No Existing Order Found', 'Create New Order', 'Create PO', 'Update Email Status', 'Create Invoice', 'Invoice History'],
  },
  'ORD-VALIDATION-FAILED': {
    previousRole: 'Customer', currentRole: 'CC Customer Manager', nextRole: 'Finance Manager', previousState: 'Select Order Mapping Completed', currentState: 'Validation', nextState: 'Create Invoice', pendingAction: 'Collect Bill To, Ship To, and Tax Details', currentStep: 4,
    steps: ['Email Sent', 'Email View', 'Email Details', 'Query Orders', 'Validation', 'Create Invoice', 'Invoice History'],
  },
};

const EMAILS: ConnectedRecord[] = [
  {
    id: 'EML-4821',
    title: 'Delivery address correction',
    source: 'maya.patel@northstar.example',
    timestamp: '08 Oct 2026, 09:18',
    summary: 'Customer confirmed the corrected delivery address and requested shipment confirmation.',
    nextAction: 'Verify the address update before releasing the shipment.',
  },
  {
    id: 'EML-4824',
    title: 'Purchase order confirmation',
    source: 'procurement@northstar.example',
    timestamp: '08 Oct 2026, 10:02',
    summary: 'Procurement approved the revised quantity and attached the purchase order.',
    nextAction: 'Validate the PO total against the order before creating the invoice.',
  },
];

const CHATS: ConnectedRecord[] = [
  {
    id: 'CHT-9907',
    title: 'Priority delivery request',
    source: 'Northstar Support Channel',
    timestamp: '08 Oct 2026, 10:26',
    summary: 'Customer requested expedited delivery because their field stock is below the minimum level.',
    nextAction: 'Confirm whether expedited freight is approved for this priority order.',
  },
];

const VOICE: ConnectedRecord[] = [
  {
    id: 'VOI-2104',
    title: 'Delivery and invoice confirmation call',
    source: 'Customer Care Voice',
    timestamp: '08 Oct 2026, 10:44',
    summary: 'Customer confirmed delivery requirements and asked that the invoice reference the approved purchase order.',
    nextAction: 'Confirm the delivery SPOC and PO reference before generating the invoice.',
  },
];

const DOCUMENTS: ConnectedRecord[] = [
  {
    id: 'DOC-3102',
    title: 'Northstar PO-78419.pdf',
    source: 'Scanner Upload',
    timestamp: '08 Oct 2026, 10:06',
    summary: 'Signed purchase order for 24 replacement sensors, net 30 payment terms.',
    nextAction: 'Use the approved quantity and payment terms on the invoice.',
  },
  {
    id: 'DOC-3105',
    title: 'Expedited freight approval.pdf',
    source: 'Email Attachment',
    timestamp: '08 Oct 2026, 10:31',
    summary: 'Manager approval authorizes expedited freight for the current shipment.',
    nextAction: 'Add the expedited freight line before finalizing the invoice.',
  },
];

function ConnectedSection({ title, records }: { title: string; records: ConnectedRecord[] }) {
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? '');
  const [analysis, setAnalysis] = useState('');
  const selected = records.find((record) => record.id === selectedId) ?? records[0];

  return (
    <section className="order-connected-section">
      <div className="order-section-heading"><div><h3>{title}</h3><p>{records.length} linked record{records.length === 1 ? '' : 's'}</p></div></div>
      <div className="order-record-layout">
        <div className="order-record-list">
          {records.map((record) => (
            <button className={`order-record${record.id === selected?.id ? ' selected' : ''}`} type="button" key={record.id} onClick={() => { setSelectedId(record.id); setAnalysis(''); }}>
              <strong>{record.title}</strong><span>{record.id} · {record.timestamp}</span><small>{record.source}</small>
            </button>
          ))}
        </div>
        {selected && <article className="order-record-detail">
          <div className="order-record-detail-header"><div><span>{selected.id}</span><h4>{selected.title}</h4><p>{selected.source} · {selected.timestamp}</p></div></div>
          <p>{analysis || selected.summary}</p>
          <div className="order-action-row">
            <button type="button" className="text-button" onClick={() => setAnalysis(`Detailed review: ${selected.summary}`)}>View details</button>
            <button type="button" className="text-button" onClick={() => setAnalysis(`Analysis complete: ${selected.summary}`)}>Analyze content</button>
            <button type="button" className="text-button" onClick={() => setAnalysis(`Generated summary: ${selected.summary}`)}>Generate summary</button>
          </div>
          <div className="order-next-action"><strong>Next pending action</strong><span>{selected.nextAction}</span></div>
        </article>}
      </div>
    </section>
  );
}

function WorkItemWorkflow({ orderId }: { orderId: string }) {
  const workflow = WORKFLOWS[orderId];
  return <section className="order-workflow-section">
    <div className="order-section-heading"><div><h3>Work Item Workflow</h3><p>Order workflow visibility and role transition details.</p></div></div>
    <div className="work-item-status-card">
      <div><span>Order ID</span><strong>{orderId}</strong></div>
      <div><span>Previous Role</span><strong>{workflow.previousRole}</strong></div>
      <div><span>Current Role</span><strong>{workflow.currentRole}</strong></div>
      <div><span>Next Role</span><strong>{workflow.nextRole}</strong></div>
      <div><span>Previous Process Status</span><strong>{workflow.previousState}</strong></div>
      <div><span>Current Process Status</span><strong>{workflow.currentState}</strong></div>
      <div><span>Next Process Status</span><strong>{workflow.nextState}</strong></div>
      <div><span>Action Pending</span><strong>{workflow.pendingAction}</strong></div>
    </div>
    <div className="workflow-progress" aria-label="Order workflow progress">
      {workflow.steps.map((step, index) => <div className={`workflow-step ${index < workflow.currentStep ? 'complete' : index === workflow.currentStep ? 'current' : 'pending'}`} key={step}><span>{index < workflow.currentStep ? '✓' : index === workflow.currentStep ? '●' : '○'}</span><strong>{step}</strong></div>)}
    </div>
  </section>;
}

function EmailContext() {
  const [open, setOpen] = useState(false);
  return <section className="order-workflow-section"><button className="order-collapse-button" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span>Email Context</span><span>{open ? 'Hide' : 'Show'}</span></button>{open && <div className="work-item-status-card"><div><span>Email Subject</span><strong>PO Submission for Invoice Processing</strong></div><div><span>Sender Email</span><strong>customer@northstarhealth.com</strong></div><div><span>Received</span><strong>08 Oct 2026, 09:00</strong></div><div><span>Attachment Count</span><strong>3</strong></div><div><span>Customer Name</span><strong>Northstar Health</strong></div><div><span>PO Available</span><strong>Yes</strong></div><div><span>Order Reference Found</span><strong>Yes</strong></div></div>}</section>;
}

function AuditTrail() {
  return <section className="order-workflow-section"><div className="order-section-heading"><div><h3>Audit Trail</h3><p>Order activity timeline.</p></div></div><div className="audit-trail">{AUDIT_TRAIL.map((entry) => <article key={`${entry.time}-${entry.action}`}><time>{entry.time}</time><strong>{entry.actor}</strong><span>{entry.action}</span><p>{entry.comment}</p></article>)}</div></section>;
}

function CommunicationInsights() {
  return <section className="order-workflow-section"><div className="order-section-heading"><div><h3>Communication Insights</h3><p>Content summaries and recommended actions.</p></div></div><div className="communication-insights">{COMMUNICATION_INSIGHTS.map(([type, summary, impact, nextAction]) => <article key={type}><strong>{type}</strong><span>Content Summary: {summary}</span><span>Business Impact: {impact}</span><span>Recommended Next Action: {nextAction}</span></article>)}</div></section>;
}

function Lifecycle() {
  const steps = ['Email/Chat/Voice/Document', 'Work Item Created', 'Order Mapping', 'PO Validation', 'Invoice Creation', 'Invoice History'];
  return <section className="order-workflow-section"><div className="order-section-heading"><div><h3>Work Item Lifecycle</h3><p>Current stage: Order Mapping</p></div></div><div className="workflow-progress">{steps.map((step, index) => <div className={`workflow-step ${index < 2 ? 'complete' : index === 2 ? 'current' : 'pending'}`} key={step}><span>{index < 2 ? '✓' : index === 2 ? '●' : '○'}</span><strong>{step}</strong></div>)}</div></section>;
}

export default function OrderView({ accessToken }: { accessToken: string }) {
  const [scenario, setScenario] = useState<InvoiceScenario>('existing-po');
  const [showTasks, setShowTasks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<InvoiceResult | null>(null);
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceHistory | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? (window.location.port === '5173' ? 'http://localhost:8000' : window.location.origin);
  const invoiceCreated = invoiceResult?.status === 'Invoice Created';
  const scenarioDetails = SCENARIOS[scenario];
  const orderId = scenarioDetails.orderId;
  const order = {
    'ORD-78419': { status: 'Ready for invoicing', poNumber: 'PO-1001', poStatus: 'Valid', description: 'Existing PO invoice flow' },
    'ORD-78420': { status: 'New order identified', poNumber: null, poStatus: 'Not created', description: 'New order creates a PO before invoicing' },
    'ORD-VALIDATION-FAILED': { status: 'Validation required', poNumber: null, poStatus: 'Not created', description: 'Missing invoice details validation flow' },
  }[orderId] ?? { status: 'Ready for invoicing', poNumber: null, poStatus: 'Unknown', description: '' };

  const createInvoice = async () => {
    setIsCreatingInvoice(true);
    setInvoiceResult(null);
    try {
      const response = await fetch(`${apiBase}/api/invoices`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      const payload = await response.json() as InvoiceResult | { detail?: string };
      if (!response.ok) {
        setInvoiceResult({ status: 'FAILED', errors: ['detail' in payload && payload.detail ? payload.detail : 'Invoice creation could not be completed'] });
        return;
      }
      setInvoiceResult(payload as InvoiceResult);
    } catch {
      setInvoiceResult({ status: 'FAILED', errors: ['Unable to reach the invoice service'] });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const viewInvoiceHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${apiBase}/api/invoices?order_id=${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) throw new Error();
      setInvoiceHistory(await response.json() as InvoiceHistory);
    } catch {
      setInvoiceHistory({ orderId, invoices: [] });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="order-view">
      <section className="order-summary">
        <div><p className="eyebrow">Order View</p><h3>Order {orderId}</h3><p>{scenarioDetails.description}</p><label className="order-scenario-label">Invoice scenario<select value={scenario} onChange={(event) => { setScenario(event.target.value as InvoiceScenario); setInvoiceResult(null); }}><option value="existing-po">Existing PO</option><option value="no-po">No PO</option><option value="validation-required">Validation Required</option></select></label></div>
        <div className="order-summary-actions">
          <button type="button" className="text-button" onClick={() => setShowTasks(true)}>My Pending Tasks</button>
          <button type="button" className="text-button" disabled={isLoadingHistory} onClick={viewInvoiceHistory}>{isLoadingHistory ? 'Loading history...' : 'Invoice history'}</button>
          <button type="button" className="secondary-btn" disabled={isCreatingInvoice || invoiceCreated} onClick={createInvoice}>{isCreatingInvoice ? 'Creating Invoice...' : invoiceCreated ? 'Invoice Created' : 'Create invoice'}</button>
        </div>
      </section>
      <label className="universal-search"><span>Universal Search</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search Order, PO, Invoice, Work Item, Email, Document, or Customer" />{searchQuery && <small>Searching linked mock records for “{searchQuery}”</small>}</label>
      {invoiceCreated && <div className="order-invoice-status" role="status"><strong>Invoice Created Successfully</strong><span>Order ID: {invoiceResult.orderId}</span><span>PO Number: {invoiceResult.poNumber}</span><span>Invoice Number: {invoiceResult.invoiceNumber}</span><span>Status: {invoiceResult.status}</span></div>}
      <dl className="order-summary-grid">
        <div><dt>Order ID</dt><dd>{orderId}</dd></div>
        <div><dt>Customer name</dt><dd>Northstar Health</dd></div>
        <div><dt>Order status</dt><dd><span className="order-status">{invoiceCreated ? 'Invoice created' : order.status}</span></dd></div>
        <div><dt>Priority</dt><dd><span className="order-priority">High</span></dd></div>
        <div><dt>Order created</dt><dd>08 Oct 2026, 08:42</dd></div>
      </dl>
      <EmailContext />
      <WorkItemWorkflow orderId={orderId} />
      <section className="order-connected-section"><div className="order-section-heading"><div><h3>Purchase Order</h3><p>PO validation before invoice generation</p></div></div><div className="order-po-detail"><strong>{invoiceCreated ? invoiceResult.poNumber : order.poNumber ?? 'No PO available'}</strong><span>Status: {invoiceCreated ? 'Valid' : order.poStatus}</span><p>{order.poNumber ? 'A valid purchase order is linked to this order.' : orderId === 'ORD-VALIDATION-FAILED' ? 'Invoice generation stops until all required invoice details are collected.' : 'A purchase order will be created before final invoice creation.'}</p><p>{scenarioDetails.fields}</p></div></section>
      <ConnectedSection title="Connected Emails" records={EMAILS} />
      <ConnectedSection title="Connected Chats" records={CHATS} />
      <ConnectedSection title="Connected Voice" records={VOICE} />
      <ConnectedSection title="Connected Documents" records={DOCUMENTS} />
      <CommunicationInsights />
      <Lifecycle />
      <AuditTrail />
      {invoiceResult && !invoiceCreated && <div className="invoice-error-backdrop" role="presentation">
        <section className="invoice-error-dialog" role="dialog" aria-modal="true" aria-labelledby="invoice-error-title">
          <h2 id="invoice-error-title">Invoice Creation Failed</h2>
          <p>Missing or invalid information prevents invoice creation.</p>
          <ul>{invoiceResult.errors?.map((error) => <li key={error}>{error}</li>)}</ul>
          <button type="button" className="secondary-btn" onClick={() => setInvoiceResult(null)}>Close</button>
        </section>
      </div>}
      {invoiceHistory && <div className="invoice-error-backdrop" role="presentation">
        <section className="invoice-error-dialog invoice-history-dialog" role="dialog" aria-modal="true" aria-labelledby="invoice-history-title">
          <h2 id="invoice-history-title">Invoice History</h2>
          <p>Order {invoiceHistory.orderId}</p>
          {invoiceHistory.invoices.length ? <div className="invoice-history-list">{invoiceHistory.invoices.map((invoice) => <article key={invoice.invoiceNumber}><strong>{invoice.invoiceNumber}</strong><span>Invoice Date: {new Date(invoice.createdAt).toLocaleDateString()}</span><span>Invoice Amount: $5,000</span><span>Invoice Status: Approved</span><span>Created By: Finance Manager</span><span>PO Number: {invoice.poNumber}</span></article>)}</div> : <p>No invoices have been created for this order.</p>}
          <button type="button" className="secondary-btn" onClick={() => setInvoiceHistory(null)}>Close</button>
        </section>
      </div>}
      {showTasks && <div className="invoice-error-backdrop" role="presentation"><section className="invoice-error-dialog invoice-history-dialog" role="dialog" aria-modal="true" aria-labelledby="task-queue-title"><h2 id="task-queue-title">My Pending Tasks</h2><div className="task-queue">{PENDING_TASKS.map((task) => <article key={task.order}><strong>{task.order}</strong><span>Action: {task.action}</span><span>Priority: {task.priority}</span><span>Due: {task.due}</span><span>Status: {task.status}</span></article>)}</div><button type="button" className="secondary-btn" onClick={() => setShowTasks(false)}>Close</button></section></div>}
    </div>
  );
}