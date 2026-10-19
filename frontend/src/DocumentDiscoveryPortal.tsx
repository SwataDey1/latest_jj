import React, { useMemo, useState } from 'react';

type Sensitivity = 'High' | 'Medium' | 'Low';

type DocumentRecord = {
  id: number;
  code: string;
  scenario: string;
  subject: string;
  from: string;
  repository: string;
  source: string;
  sensitivity: Sensitivity;
  date: string;
  attachment: string;
  content: string;
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

type DocumentDiscoveryWorkItem = {
  work_item_id: string;
  label: string;
  work_item: string;
  customer_request_id: string;
};
const REPOSITORIES = ['Order Documents', 'Compliance Documents', 'Finance Documents', 'Legal Documents'];
const FEEDS = ['SharePoint', 'Scanner Upload', 'Email Attachment', 'Fax Gateway'];
const SCENARIO_DOCUMENTS: DocumentRecord[] = [
  {
    id: 101, code: 'DC001', scenario: 'Address Change', subject: "Address change request form - SO-78410",
    from: 'priya.nair@acmeretail.com', repository: 'Order Documents', source: 'Email Attachment', sensitivity: 'Medium', date: '2026-10-01', attachment: 'Address_Change_Form_SO-78410.pdf',
    content: "Signed address change form for SO-78410. Old address: Hinjewadi Phase 1, Pune. New address: Plot 14, Industrial Area Phase 2, Pune 411019. Effective from 15 October 2026.",
  },
  {
    id: 102, code: 'DC002', scenario: 'SPOC Change', subject: "SPOC authorisation letter - Northwind Traders",
    from: 'legal@northwind.com', repository: 'Legal Documents', source: 'SharePoint', sensitivity: 'Low', date: '2026-10-02', attachment: 'SPOC_Authorisation_Northwind.pdf',
    content: "Letter on company letterhead authorising Anita Desai as the single point of contact for orders, invoices, and escalations, replacing Rahul Mehta. Signed by the Head of Procurement.",
  },
  {
    id: 103, code: 'DC003', scenario: 'Delivery Date Change', subject: "Revised delivery schedule - SO-78422",
    from: 'kevin.lee@brightlabs.io', repository: 'Order Documents', source: 'Scanner Upload', sensitivity: 'Medium', date: '2026-10-03', attachment: 'Revised_Delivery_Schedule_SO-78422.pdf',
    content: "Revised delivery schedule for SO-78422. Original date: 21 October 2026. Requested date: 28 October 2026. Reason: site maintenance shutdown.",
  },
  {
    id: 104, code: 'DC004', scenario: 'Cancel Order', subject: "Order cancellation notice - SO-78435",
    from: 'maria.gomez@globex.com', repository: 'Legal Documents', source: 'Email Attachment', sensitivity: 'High', date: '2026-10-04', attachment: 'Cancellation_Notice_SO-78435.pdf',
    content: "Formal cancellation notice for SO-78435 (12 thermal printers, value 3,60,000). Customer requests a stop on shipment and a waiver of cancellation charges under clause 8.2 of the supply agreement.",
  },
  {
    id: 105, code: 'DC005', scenario: 'New Order Creation', subject: "Purchase order PO-46150",
    from: 'procurement@initech.com', repository: 'Order Documents', source: 'Fax Gateway', sensitivity: 'Medium', date: '2026-10-05', attachment: 'PO-46150.pdf',
    content: "Purchase order PO-46150 for 25 USB-C docking stations (HP G5) at 9,800 per unit. Ship to: Initech Bengaluru office. Requested delivery: 15 November 2026. Payment terms: Net 30.",
  },
  {
    id: 106, code: 'DC006', scenario: 'Invoice Request', subject: "Invoice request letter - SO-77999",
    from: 'accounts@umbrella-corp.com', repository: 'Finance Documents', source: 'Email Attachment', sensitivity: 'Medium', date: '2026-10-06', attachment: 'Invoice_Request_SO-77999.pdf',
    content: "Letter requesting a tax invoice for delivered order SO-77999 so the payment can be processed in the October payment cycle. Includes the PO reference and billing GSTIN.",
  },
  {
    id: 107, code: 'DC007', scenario: 'Status Request', subject: "Order status enquiry form - SO-78150",
    from: 'li.wei@starkindustries.com', repository: 'Order Documents', source: 'SharePoint', sensitivity: 'Low', date: '2026-10-07', attachment: 'Status_Enquiry_SO-78150.pdf',
    content: "Customer enquiry form asking for the current status and ETA of SO-78150, noting that tracking has not updated since 7 October 2026.",
  },
  {
    id: 108, code: 'DC008', scenario: 'Delivery Issue', subject: "Proof of delivery with damage remarks - SO-78090",
    from: 'ops@wayneenterprises.com', repository: 'Compliance Documents', source: 'Scanner Upload', sensitivity: 'High', date: '2026-10-08', attachment: 'POD_SO-78090_Damage.pdf',
    content: "Signed proof of delivery for SO-78090 with receiver remarks: 2 cartons damaged, 1 carton missing. Includes photos of damaged packaging and the carrier seal number.",
  },
  {
    id: 109, code: 'DC009', scenario: 'Quantity Change', subject: "Revised purchase order PO-46077 Rev 1",
    from: 'sanjay.patel@cyberdyne.com', repository: 'Order Documents', source: 'Email Attachment', sensitivity: 'Medium', date: '2026-10-09', attachment: 'PO-46077_Rev1.pdf',
    content: "Revision 1 of PO-46077 increasing quantity of wireless keyboards from 40 to 60 units. All other terms unchanged. Revised total value: 1,80,000.",
  },
  {
    id: 110, code: 'DC010', scenario: 'Invoice Correction', subject: "Corrected invoice request - INV-2026-0988",
    from: 'finance@oceanic-airlines.com', repository: 'Finance Documents', source: 'SharePoint', sensitivity: 'High', date: '2026-10-10', attachment: 'INV-2026-0988_Correction.pdf',
    content: "Marked-up copy of INV-2026-0988 showing an incorrect GSTIN and billing entity. Correct details: Oceanic Airlines India Pvt Ltd, GSTIN 27AABCO1234F1Z5. Customer requests a credit note and a corrected invoice.",
  },
];
const EMPTY_ADV: AdvFilters = { subject: '', sender: '', attachment: '', sensitivity: '', from: '', to: '', hasAttachment: false };
const BADGE: Record<Sensitivity, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
const has = (v: string, q: string) => !q || v.toLowerCase().includes(q.toLowerCase());
const toggle = (list: string[], x: string) => (list.includes(x) ? list.filter((i) => i !== x) : [...list, x]);

const CSS = `
*{box-sizing:border-box}
.ddp{min-height:100vh;background:#f1f5f9;font-family:"Segoe UI",system-ui,sans-serif;color:#0f172a}
.ddp .hdr{background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:14px 24px;gap:16px;flex-wrap:wrap}
.ddp .hdr h2{margin:0;font-size:20px}
.ddp .row{display:flex;gap:8px;align-items:center}
.ddp .inp{padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;width:100%}
.ddp .hdr .inp{width:300px;border:none}
.ddp .btn{padding:9px 14px;border:none;border-radius:8px;cursor:pointer;font:inherit;font-weight:600;background:#e2e8f0;color:#0f172a;transition:.15s}
.ddp .btn:hover{filter:brightness(.92)}.ddp .btn:disabled{opacity:.5;cursor:not-allowed}
.ddp .pri{background:#2563eb;color:#fff}.ddp .dot{background:#f59e0b;border-radius:50%;width:8px;height:8px;display:inline-block;margin-left:6px}
.ddp{container-type:inline-size}
.ddp .main{display:grid;grid-template-columns:220px minmax(0,1fr) 340px;align-items:start;gap:16px;padding:16px}
.ddp .main>section{position:sticky;top:16px}
.ddp td:nth-child(1),.ddp td:nth-child(5),.ddp td:nth-child(6),.ddp .badge{white-space:nowrap}
.ddp td:nth-child(1){font-weight:600}
@container (max-width:1200px){
.ddp .main{grid-template-columns:minmax(0,1fr) 320px}
.ddp .main>aside{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr auto;gap:8px 24px;align-items:start}
.ddp .main>aside hr{display:none}
.ddp .main>aside>.btn{margin-top:0!important;width:auto!important;align-self:center}
.ddp .grp{display:flex;flex-wrap:wrap;gap:0 12px}.ddp .grp>.row{flex-basis:100%}.ddp .grp h3{margin-bottom:4px}
}
@container (max-width:760px){
.ddp .main{grid-template-columns:minmax(0,1fr)}
.ddp .main>aside{grid-template-columns:1fr}
.ddp .main>section{position:static}
.ddp .main>main{display:contents}
.ddp .main>main>.stats{order:1;margin-bottom:0}.ddp .main>section{order:2}.ddp .main>main>.card{order:3}
}
.ddp .card{background:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.ddp .card h3{margin:0 0 12px;font-size:16px}
.ddp .chk{display:flex;align-items:center;gap:8px;padding:6px 4px;border-radius:6px;cursor:pointer}
.ddp .chk:hover{background:#f1f5f9}.ddp .chk span{flex:1}
.ddp .x{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px}.ddp .x:hover{color:#ef4444}
.ddp .link{background:none;border:none;color:#2563eb;cursor:pointer;font-size:12px;padding:0}
.ddp .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.ddp .stat{color:#fff;padding:14px 16px;border-radius:12px}.ddp .stat p{margin:0;opacity:.85;font-size:13px}.ddp .stat b{font-size:28px}
.ddp table{width:100%;border-collapse:collapse}.ddp th{text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;padding:8px}
.ddp td{padding:10px 8px;border-top:1px solid #f1f5f9}.ddp tbody tr{cursor:pointer}.ddp tbody tr:hover{background:#f8fafc}
.ddp tr.sel{background:#eff6ff!important}
.ddp .badge{color:#fff;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
.ddp .muted{color:#64748b;font-size:14px}.ddp .meta p{margin:6px 0;font-size:14px}
.ddp .ov{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;justify-content:center;align-items:center}
.ddp .modal{width:440px;background:#fff;border-radius:12px;padding:22px;display:grid;gap:10px}
.ddp .modal h3{margin:0}.ddp .lbl{font-size:12px;color:#64748b}
.ddp .err{color:#ef4444;font-size:13px}
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

export default function DocumentDiscoveryPortal({ workItem }: { workItem: DocumentDiscoveryWorkItem }) {
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [adv, setAdv] = useState<AdvFilters>(EMPTY_ADV);
  const [draft, setDraft] = useState<AdvFilters>(EMPTY_ADV);
  const [feeds, setFeeds] = useState<string[]>(FEEDS);
  const [selRepositories, setSelRepositories] = useState<string[]>(REPOSITORIES);
  const [selSources, setSelSources] = useState<string[]>(FEEDS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modal, setModal] = useState<'adv' | 'feed' | null>(null);
  const [newFeed, setNewFeed] = useState('');
  const documentsForWork = useMemo<DocumentRecord[]>(() => [{
    id: 1,
    code: workItem.customer_request_id,
    scenario: 'Current Work Item',
    subject: workItem.work_item,
    from: 'customer@local.dev',
    repository: 'Order Documents',
    source: 'Scanner Upload',
    sensitivity: 'Medium',
    date: '2026-10-08',
    attachment: `${workItem.work_item_id}.pdf`,
    content: `Scanned document supporting ${workItem.work_item}. Request ${workItem.customer_request_id}: fields were extracted and are ready for review.`,
  }, ...SCENARIO_DOCUMENTS], [workItem]);

  const documents = useMemo(
    () =>
      documentsForWork.filter(
        (m) =>
          selRepositories.includes(m.repository) &&
          selSources.includes(m.source) &&
          (has(m.subject, query) || has(m.content, query) || has(m.from, query) || has(m.code, query) || has(m.scenario, query)) &&
          has(m.subject, adv.subject) &&
          has(m.from, adv.sender) &&
          has(m.attachment || '', adv.attachment) &&
          (!adv.sensitivity || m.sensitivity === adv.sensitivity) &&
          (!adv.hasAttachment || !!m.attachment) &&
          (!adv.from || m.date >= adv.from) &&
          (!adv.to || m.date <= adv.to)
      ),
    [documentsForWork, selRepositories, selSources, query, adv]
  );
  const selected = documents.find((m) => m.id === selectedId);
  const advActive = JSON.stringify(adv) !== JSON.stringify(EMPTY_ADV);

  const search = () => {
    setQuery(searchText.trim());
    setSelectedId(null);
  };
  const reset = () => {
    setSearchText(''); setQuery(''); setAdv(EMPTY_ADV); setDraft(EMPTY_ADV);
    setSelRepositories(REPOSITORIES); setSelSources(feeds); setSelectedId(null);
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
    <div className="ddp">
      <style>{CSS}</style>

      <header className="hdr">
        <h2>Document Discovery Portal</h2>
        <div className="row">
          <input className="inp" placeholder="Search subject, content, uploader..." value={searchText}
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
          <div className="grp"><CheckList title="🗂️ Repositories" items={REPOSITORIES} sel={selRepositories} setSel={setSelRepositories} /></div>
          <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
          <div className="grp"><CheckList title="🔗 Sources" items={feeds} sel={selSources} setSel={setSelSources} onRemove={removeFeed} /></div>
          <button className="btn pri" style={{ width: '100%', marginTop: 16 }} onClick={() => setModal('feed')}>+ Add Feed</button>
        </aside>

        <main>
          <div className="stats">
            <div className="stat" style={{ background: '#2563eb' }}><p>Total Documents</p><b>{documents.length}</b></div>
            <div className="stat" style={{ background: '#ef4444' }}><p>High Sensitivity</p><b>{documents.filter((m) => m.sensitivity === 'High').length}</b></div>
            <div className="stat" style={{ background: '#10b981' }}><p>Active Sources</p><b>{selSources.length}</b></div>
          </div>
          <div className="card">
            <h3>📋 Search Results</h3>
            {documents.length ? (
              <table>
                <thead><tr><th>ID</th><th>Scenario</th><th>Subject</th><th>Repository</th><th>Date</th><th>Sensitivity</th></tr></thead>
                <tbody>
                  {documents.map((m) => (
                    <tr key={m.id} className={m.id === selectedId ? 'sel' : ''} onClick={() => setSelectedId(m.id)}>
                      <td>{m.code}</td><td>{m.scenario}</td><td>{m.subject}</td><td>{m.repository}</td><td>{m.date}</td>
                      <td><span className="badge" style={{ background: BADGE[m.sensitivity] }}>{m.sensitivity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">No documents match your filters. <button className="link" onClick={reset}>Clear all filters</button></p>
            )}
          </div>
        </main>

        <section className="card">
          <h3>🗂️ Document Preview</h3>
          {selected ? (
            <div className="meta">
              <h2 style={{ margin: '0 0 10px' }}>{selected.subject}</h2>
              <p><b>ID:</b> {selected.code}</p>
              <p><b>Scenario:</b> {selected.scenario}</p>
              <p><b>Uploaded by:</b> {selected.from}</p>
              <p><b>Repository:</b> {selected.repository}</p>
              <p><b>Source:</b> {selected.source}</p>
              <p><b>Date:</b> {selected.date}</p>
              <p><b>Sensitivity:</b> <span className="badge" style={{ background: BADGE[selected.sensitivity] }}>{selected.sensitivity}</span></p>
              <hr /><p>{selected.content}</p><hr />
              {selected.attachment && <p>📎 {selected.attachment}</p>}
            </div>
          ) : (
            <p className="muted">Select a document from search results.</p>
          )}
        </section>
      </div>

      {modal === 'adv' && (
        <div className="ov" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Advanced Search</h3>
            <input className="inp" placeholder="Subject" value={draft.subject} onChange={setD('subject')} />
            <input className="inp" placeholder="Uploaded by" value={draft.sender} onChange={setD('sender')} />
            <input className="inp" placeholder="File name" value={draft.attachment} onChange={setD('attachment')} />
            <select className="inp" value={draft.sensitivity} onChange={setD('sensitivity')}>
              <option value="">All sensitivities</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
            <div className="row">
              <div style={{ flex: 1 }}><span className="lbl">From</span><input className="inp" type="date" value={draft.from} max={draft.to || undefined} onChange={setD('from')} /></div>
              <div style={{ flex: 1 }}><span className="lbl">To</span><input className="inp" type="date" value={draft.to} min={draft.from || undefined} onChange={setD('to')} /></div>
            </div>
            <label className="chk"><input type="checkbox" checked={draft.hasAttachment} onChange={setD('hasAttachment')} /> Has file</label>
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
