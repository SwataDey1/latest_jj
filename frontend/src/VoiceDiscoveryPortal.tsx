import React, { useMemo, useState } from 'react';

type Sensitivity = 'High' | 'Medium' | 'Low';

type VoiceCall = {
  id: number;
  code: string;
  scenario: string;
  subject: string;
  from: string;
  queue: string;
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

type VoiceDiscoveryWorkItem = {
  work_item_id: string;
  label: string;
  work_item: string;
  customer_request_id: string;
};
const QUEUES = ['Support Queue', 'Sales Queue', 'Billing Queue', 'Escalation Queue'];
const FEEDS = ['RingCentral', 'Avaya', 'Genesys', 'Teams Calling'];
const SCENARIO_CALLS: VoiceCall[] = [
  {
    id: 101, code: 'VC001', scenario: 'Address Change', subject: "Caller requests delivery address update",
    from: '+91 98201 44567', queue: 'Support Queue', source: 'RingCentral', sensitivity: 'Medium', date: '2026-10-01', attachment: 'call_addr_change.mp3',
    content: "Caller asked to update the delivery address for SO-78330 to Unit 3, Sector 62, Noida. Agent verified the account and confirmed the change before dispatch.",
  },
  {
    id: 102, code: 'VC002', scenario: 'SPOC Change', subject: "Caller informs change of SPOC",
    from: '+91 99860 22314', queue: 'Sales Queue', source: 'Avaya', sensitivity: 'Low', date: '2026-10-02', attachment: 'call_spoc_change.mp3',
    content: "Caller from Northwind Traders informed that Vikram Rao is the new SPOC for purchasing. Agent captured his email (vikram.rao@northwind.com) and phone number and updated the account contacts.",
  },
  {
    id: 103, code: 'VC003', scenario: 'Delivery Date Change', subject: "Caller asks to reschedule delivery",
    from: '+1 415 555 0182', queue: 'Support Queue', source: 'Genesys', sensitivity: 'Medium', date: '2026-10-03', attachment: 'call_delivery_date.mp3',
    content: "Caller requested moving delivery of SO-78345 from 24 October to 31 October due to a site audit. Agent checked carrier availability and confirmed the new date.",
  },
  {
    id: 104, code: 'VC004', scenario: 'Cancel Order', subject: "Caller requests order cancellation",
    from: '+1 312 555 0147', queue: 'Escalation Queue', source: 'RingCentral', sensitivity: 'High', date: '2026-10-04', attachment: 'call_cancel_order.mp3',
    content: "Caller asked to cancel SO-78360 for 8 network switches because the project was cancelled. Agent confirmed the order had not shipped, raised the cancellation, and advised that written confirmation will follow.",
  },
  {
    id: 105, code: 'VC005', scenario: 'New Order Creation', subject: "Caller places a new order",
    from: '+91 80 4123 9900', queue: 'Sales Queue', source: 'Teams Calling', sensitivity: 'Medium', date: '2026-10-05', attachment: 'call_new_order.mp3',
    content: "Caller placed a new order for 30 HP LaserJet toner cartridges for the Hyderabad office with requested delivery by 12 November. Agent created the order and shared the reference number.",
  },
  {
    id: 106, code: 'VC006', scenario: 'Invoice Request', subject: "Caller requests invoice copy",
    from: '+91 22 6650 1200', queue: 'Billing Queue', source: 'Avaya', sensitivity: 'Medium', date: '2026-10-06', attachment: 'call_invoice_request.mp3',
    content: "Caller from accounts asked for a copy of the invoice for SO-77920 to process payment. Agent verified the billing contact and emailed the invoice PDF.",
  },
  {
    id: 107, code: 'VC007', scenario: 'Status Request', subject: "Caller asks for order status",
    from: '+1 646 555 0110', queue: 'Support Queue', source: 'Genesys', sensitivity: 'Low', date: '2026-10-07', attachment: '',
    content: "Caller asked for the status of SO-78101. Agent confirmed the order shipped yesterday and is expected to arrive on 14 October, and shared the tracking number.",
  },
  {
    id: 108, code: 'VC008', scenario: 'Delivery Issue', subject: "Caller reports late and partial delivery",
    from: '+1 213 555 0175', queue: 'Escalation Queue', source: 'RingCentral', sensitivity: 'High', date: '2026-10-08', attachment: 'call_delivery_issue.mp3',
    content: "Caller reported that SO-78077 arrived three days late and only 6 of 10 laptops were delivered. Agent apologised, opened a carrier investigation, and committed to ship the remaining 4 units.",
  },
  {
    id: 109, code: 'VC009', scenario: 'Quantity Change', subject: "Caller requests quantity increase",
    from: '+91 44 2811 3344', queue: 'Sales Queue', source: 'Teams Calling', sensitivity: 'Medium', date: '2026-10-09', attachment: 'call_qty_change.mp3',
    content: "Caller asked to increase PO-46055 from 20 to 35 office chairs. Agent checked stock, confirmed availability, and updated the order quantity.",
  },
  {
    id: 110, code: 'VC010', scenario: 'Invoice Correction', subject: "Caller disputes invoice amount",
    from: '+1 305 555 0193', queue: 'Billing Queue', source: 'Avaya', sensitivity: 'High', date: '2026-10-10', attachment: 'call_invoice_correction.mp3',
    content: "Caller said invoice INV-2026-0977 was billed for 12 units instead of the 10 delivered. Agent confirmed the delivery note and raised an invoice correction with a credit note for 2 units.",
  },
];
const EMPTY_ADV: AdvFilters = { subject: '', sender: '', attachment: '', sensitivity: '', from: '', to: '', hasAttachment: false };
const BADGE: Record<Sensitivity, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
const has = (v: string, q: string) => !q || v.toLowerCase().includes(q.toLowerCase());
const toggle = (list: string[], x: string) => (list.includes(x) ? list.filter((i) => i !== x) : [...list, x]);

const CSS = `
*{box-sizing:border-box}
.vdp{min-height:100vh;background:#f1f5f9;font-family:"Segoe UI",system-ui,sans-serif;color:#0f172a}
.vdp .hdr{background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:14px 24px;gap:16px;flex-wrap:wrap}
.vdp .hdr h2{margin:0;font-size:20px}
.vdp .row{display:flex;gap:8px;align-items:center}
.vdp .inp{padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;width:100%}
.vdp .hdr .inp{width:300px;border:none}
.vdp .btn{padding:9px 14px;border:none;border-radius:8px;cursor:pointer;font:inherit;font-weight:600;background:#e2e8f0;color:#0f172a;transition:.15s}
.vdp .btn:hover{filter:brightness(.92)}.vdp .btn:disabled{opacity:.5;cursor:not-allowed}
.vdp .pri{background:#2563eb;color:#fff}.vdp .dot{background:#f59e0b;border-radius:50%;width:8px;height:8px;display:inline-block;margin-left:6px}
.vdp{container-type:inline-size}
.vdp .main{display:grid;grid-template-columns:220px minmax(0,1fr) 340px;align-items:start;gap:16px;padding:16px}
.vdp .main>section{position:sticky;top:16px}
.vdp td:nth-child(1),.vdp td:nth-child(5),.vdp td:nth-child(6),.vdp .badge{white-space:nowrap}
.vdp td:nth-child(1){font-weight:600}
@container (max-width:1200px){
.vdp .main{grid-template-columns:minmax(0,1fr) 320px}
.vdp .main>aside{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr auto;gap:8px 24px;align-items:start}
.vdp .main>aside hr{display:none}
.vdp .main>aside>.btn{margin-top:0!important;width:auto!important;align-self:center}
.vdp .grp{display:flex;flex-wrap:wrap;gap:0 12px}.vdp .grp>.row{flex-basis:100%}.vdp .grp h3{margin-bottom:4px}
}
@container (max-width:760px){
.vdp .main{grid-template-columns:minmax(0,1fr)}
.vdp .main>aside{grid-template-columns:1fr}
.vdp .main>section{position:static}
.vdp .main>main{display:contents}
.vdp .main>main>.stats{order:1;margin-bottom:0}.vdp .main>section{order:2}.vdp .main>main>.card{order:3}
}
.vdp .card{background:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.vdp .card h3{margin:0 0 12px;font-size:16px}
.vdp .chk{display:flex;align-items:center;gap:8px;padding:6px 4px;border-radius:6px;cursor:pointer}
.vdp .chk:hover{background:#f1f5f9}.vdp .chk span{flex:1}
.vdp .x{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px}.vdp .x:hover{color:#ef4444}
.vdp .link{background:none;border:none;color:#2563eb;cursor:pointer;font-size:12px;padding:0}
.vdp .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.vdp .stat{color:#fff;padding:14px 16px;border-radius:12px}.vdp .stat p{margin:0;opacity:.85;font-size:13px}.vdp .stat b{font-size:28px}
.vdp table{width:100%;border-collapse:collapse}.vdp th{text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;padding:8px}
.vdp td{padding:10px 8px;border-top:1px solid #f1f5f9}.vdp tbody tr{cursor:pointer}.vdp tbody tr:hover{background:#f8fafc}
.vdp tr.sel{background:#eff6ff!important}
.vdp .badge{color:#fff;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
.vdp .muted{color:#64748b;font-size:14px}.vdp .meta p{margin:6px 0;font-size:14px}
.vdp .ov{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;justify-content:center;align-items:center}
.vdp .modal{width:440px;background:#fff;border-radius:12px;padding:22px;display:grid;gap:10px}
.vdp .modal h3{margin:0}.vdp .lbl{font-size:12px;color:#64748b}
.vdp .err{color:#ef4444;font-size:13px}
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

export default function VoiceDiscoveryPortal({ workItem }: { workItem: VoiceDiscoveryWorkItem }) {
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [adv, setAdv] = useState<AdvFilters>(EMPTY_ADV);
  const [draft, setDraft] = useState<AdvFilters>(EMPTY_ADV);
  const [feeds, setFeeds] = useState<string[]>(FEEDS);
  const [selQueues, setSelQueues] = useState<string[]>(QUEUES);
  const [selSources, setSelSources] = useState<string[]>(FEEDS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modal, setModal] = useState<'adv' | 'feed' | null>(null);
  const [newFeed, setNewFeed] = useState('');
  const callsForWork = useMemo<VoiceCall[]>(() => [{
    id: 1,
    code: workItem.customer_request_id,
    scenario: 'Current Work Item',
    subject: workItem.work_item,
    from: 'customer@local.dev',
    queue: 'Support Queue',
    source: 'RingCentral',
    sensitivity: 'Medium',
    date: '2026-10-08',
    attachment: 'call-recording.mp3',
    content: `Voice call transcript about ${workItem.work_item}. Request ${workItem.customer_request_id}: customer described the issue and asked for confirmation of next steps.`,
  }, ...SCENARIO_CALLS], [workItem]);

  const calls = useMemo(
    () =>
      callsForWork.filter(
        (m) =>
          selQueues.includes(m.queue) &&
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
    [callsForWork, selQueues, selSources, query, adv]
  );
  const selected = calls.find((m) => m.id === selectedId);
  const advActive = JSON.stringify(adv) !== JSON.stringify(EMPTY_ADV);

  const search = () => {
    setQuery(searchText.trim());
    setSelectedId(null);
  };
  const reset = () => {
    setSearchText(''); setQuery(''); setAdv(EMPTY_ADV); setDraft(EMPTY_ADV);
    setSelQueues(QUEUES); setSelSources(feeds); setSelectedId(null);
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
    <div className="vdp">
      <style>{CSS}</style>

      <header className="hdr">
        <h2>Voice Discovery Portal</h2>
        <div className="row">
          <input className="inp" placeholder="Search subject, content, caller..." value={searchText}
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
          <div className="grp"><CheckList title="☎️ Queues" items={QUEUES} sel={selQueues} setSel={setSelQueues} /></div>
          <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
          <div className="grp"><CheckList title="🔗 Sources" items={feeds} sel={selSources} setSel={setSelSources} onRemove={removeFeed} /></div>
          <button className="btn pri" style={{ width: '100%', marginTop: 16 }} onClick={() => setModal('feed')}>+ Add Feed</button>
        </aside>

        <main>
          <div className="stats">
            <div className="stat" style={{ background: '#2563eb' }}><p>Total Calls</p><b>{calls.length}</b></div>
            <div className="stat" style={{ background: '#ef4444' }}><p>High Sensitivity</p><b>{calls.filter((m) => m.sensitivity === 'High').length}</b></div>
            <div className="stat" style={{ background: '#10b981' }}><p>Active Sources</p><b>{selSources.length}</b></div>
          </div>
          <div className="card">
            <h3>📋 Search Results</h3>
            {calls.length ? (
              <table>
                <thead><tr><th>ID</th><th>Scenario</th><th>Subject</th><th>Queue</th><th>Date</th><th>Sensitivity</th></tr></thead>
                <tbody>
                  {calls.map((m) => (
                    <tr key={m.id} className={m.id === selectedId ? 'sel' : ''} onClick={() => setSelectedId(m.id)}>
                      <td>{m.code}</td><td>{m.scenario}</td><td>{m.subject}</td><td>{m.queue}</td><td>{m.date}</td>
                      <td><span className="badge" style={{ background: BADGE[m.sensitivity] }}>{m.sensitivity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">No calls match your filters. <button className="link" onClick={reset}>Clear all filters</button></p>
            )}
          </div>
        </main>

        <section className="card">
          <h3>☎️ Call Preview</h3>
          {selected ? (
            <div className="meta">
              <h2 style={{ margin: '0 0 10px' }}>{selected.subject}</h2>
              <p><b>ID:</b> {selected.code}</p>
              <p><b>Scenario:</b> {selected.scenario}</p>
              <p><b>Caller:</b> {selected.from}</p>
              <p><b>Queue:</b> {selected.queue}</p>
              <p><b>Source:</b> {selected.source}</p>
              <p><b>Date:</b> {selected.date}</p>
              <p><b>Sensitivity:</b> <span className="badge" style={{ background: BADGE[selected.sensitivity] }}>{selected.sensitivity}</span></p>
              <hr /><p>{selected.content}</p><hr />
              {selected.attachment && <p>🎧 {selected.attachment}</p>}
            </div>
          ) : (
            <p className="muted">Select a call from search results.</p>
          )}
        </section>
      </div>

      {modal === 'adv' && (
        <div className="ov" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Advanced Search</h3>
            <input className="inp" placeholder="Subject" value={draft.subject} onChange={setD('subject')} />
            <input className="inp" placeholder="Caller" value={draft.sender} onChange={setD('sender')} />
            <input className="inp" placeholder="Recording name" value={draft.attachment} onChange={setD('attachment')} />
            <select className="inp" value={draft.sensitivity} onChange={setD('sensitivity')}>
              <option value="">All sensitivities</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
            <div className="row">
              <div style={{ flex: 1 }}><span className="lbl">From</span><input className="inp" type="date" value={draft.from} max={draft.to || undefined} onChange={setD('from')} /></div>
              <div style={{ flex: 1 }}><span className="lbl">To</span><input className="inp" type="date" value={draft.to} min={draft.from || undefined} onChange={setD('to')} /></div>
            </div>
            <label className="chk"><input type="checkbox" checked={draft.hasAttachment} onChange={setD('hasAttachment')} /> Has recording</label>
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
