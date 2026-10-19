import React, { useEffect, useMemo, useState } from 'react';

type Shipment = Record<string, string>;
type Pkg = { pkg: string; type: string; pieces: string; weight: string; l: string; w: string; h: string; dim: string };
type Good = { description: string; qty: string; hs: string; origin: string; unit: string; total: string };
type Consignment = {
  shipmentType: string; service: string; shipDate: string; account: string; tracking: string; pickup: string;
  shipperName: string; shipperAddress1: string; shipperAddress2: string; shipperContact: string;
  recipientName: string; recipientAddress1: string; recipientAddress2: string; recipientContact: string;
  packages: Pkg[]; goods: Good[];
  purpose: string; purposeOther: string; customsValue: string;
  invoiceNo: string; invoiceDate: string; incoterm: string; taxId: string; reason: string;
  dutiesBillTo: string; thirdPartyAccount: string;
  documentRef: string; documentRef2: string; declaredValue: string; gstin: string; ewayBill: string;
  contentsCategory: string; contentsOther: string;
  handling: string[]; dangerous: string; instructions: string; attachments: string[]; attachmentsOther: string;
  authorizedName: string; signature: string; signDate: string;
};
type TextKey = { [K in keyof Consignment]: Consignment[K] extends string ? K : never }[keyof Consignment];

const MIN_ROWS = 3;
const PURPOSES = ['Sale', 'Sample', 'Gift', 'Return/Repair', 'Documents', 'Other'];
const CONTENTS = ['Documents', 'Samples', 'Commercial Goods', 'Return/Repair', 'Other'];
const HANDLING = ['Fragile', 'Temperature Sensitive', 'High Value', 'Lithium Battery / Battery Equipment', 'Other'];
const ATTACHMENTS = ['Invoice', 'Packing List', 'Permit/License', 'SDS', 'Other'];
const EMPTY_PKG: Pkg = { pkg: '', type: '', pieces: '', weight: '', l: '', w: '', h: '', dim: '' };
const EMPTY_GOOD: Good = { description: '', qty: '', hs: '', origin: '', unit: '', total: '' };

const num = (v: string) => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };
const fmt = (n: number) => String(+n.toFixed(2));
const money = (v: string) => (v === '' ? '' : num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const ddmmyyyy = (iso: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };
const yes = (v?: string) => /^(y|yes|true|1)$/i.test(v ?? '');
const pad = <T,>(rows: T[], empty: T) => [...rows, ...Array.from({ length: Math.max(0, MIN_ROWS - rows.length) }, () => ({ ...empty }))];
const splitAddress = (address = '') => { const i = address.indexOf(','); return i < 0 ? [address, ''] : [address.slice(0, i).trim(), address.slice(i + 1).trim()]; };
const joinContact = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' / ');

const purposeFor = (v = '') => {
  const t = v.toLowerCase();
  if (!t) return '';
  if (t.includes('sale')) return 'Sale';
  if (t.includes('sample')) return 'Sample';
  if (t.includes('gift')) return 'Gift';
  if (t.includes('return') || t.includes('repair')) return 'Return/Repair';
  if (t.includes('document')) return 'Documents';
  return 'Other';
};
const contentsFor = (category = '', purpose = '') => {
  const t = category.toLowerCase();
  if (!t) return '';
  if (t.includes('document')) return 'Documents';
  if (t.includes('sample')) return 'Samples';
  if (t.includes('return') || t.includes('repair')) return 'Return/Repair';
  if (purposeFor(purpose) === 'Sale') return 'Commercial Goods';
  return 'Other';
};
const dutiesFor = (v = '') => {
  const t = v.toLowerCase();
  if (t.includes('third')) return 'Third Party';
  if (t.includes('recipient') || t.includes('receiver') || t.includes('consignee')) return 'Recipient';
  return t ? 'Sender' : '';
};

const buildConsignment = (rows: Shipment[]): Consignment => {
  const s = rows[0] ?? {};
  const currency = s.currency || 'USD';
  const customsTotal = rows.reduce((sum, r) => sum + num(r.total_value_usd), 0);
  const [shipperStreet, shipperRest] = splitAddress(s.shipper_address);
  const recipientLocality = [s.recipient_city, [s.recipient_state, s.recipient_zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return {
    shipmentType: !rows.length ? '' : /domestic/i.test(s.reason_for_export ?? '') ? 'Domestic' : 'International',
    service: s.fedex_service_product ?? '',
    shipDate: ddmmyyyy(s.ship_date ?? ''),
    account: s.account_billing_ref ?? '',
    tracking: s.tracking_awb_no ?? '',
    pickup: s.pickup_booking_ref ?? '',
    shipperName: s.shipper_name ?? '',
    shipperAddress1: shipperStreet,
    shipperAddress2: shipperRest,
    shipperContact: joinContact(s.shipper_phone, s.shipper_email),
    recipientName: joinContact(s.customer_name, s.recipient_name),
    recipientAddress1: s.recipient_address ?? '',
    recipientAddress2: recipientLocality,
    recipientContact: joinContact(s.recipient_phone, s.recipient_email),
    packages: pad(rows.map((r) => ({
      pkg: r.package_no ?? '', type: r.package_type ?? '', pieces: r.pieces ?? '', weight: r.actual_weight_kg ?? '',
      l: r.length_cm ?? '', w: r.width_cm ?? '', h: r.height_cm ?? '', dim: r.dim_weight_kg ?? '',
    })), EMPTY_PKG),
    goods: pad(rows.map((r) => ({
      description: r.goods_description ?? '', qty: r.quantity ?? '', hs: r.hs_code ?? '', origin: r.country_of_origin ?? '',
      unit: money(r.unit_value_usd ?? ''), total: money(r.total_value_usd ?? ''),
    })), EMPTY_GOOD),
    purpose: purposeFor(s.shipment_purpose),
    purposeOther: purposeFor(s.shipment_purpose) === 'Other' ? s.shipment_purpose : '',
    customsValue: rows.length ? `${currency} ${money(String(customsTotal))}` : '',
    invoiceNo: s.commercial_invoice_no_2 || s.commercial_invoice_no || '',
    invoiceDate: rows.length ? ddmmyyyy(s.ship_date ?? '') : '',
    incoterm: s.incoterm ?? '',
    taxId: s.tax_id ?? '',
    reason: s.reason_for_export ?? '',
    dutiesBillTo: dutiesFor(s.duties_taxes_bill_to),
    thirdPartyAccount: '',
    documentRef: s.commercial_invoice_no ?? '',
    documentRef2: s.document_ref ?? '',
    declaredValue: currency.toUpperCase() === 'INR' && rows.length ? money(String(customsTotal)) : '',
    gstin: s.tax_id ?? '',
    ewayBill: '',
    contentsCategory: contentsFor(s.contents_category, s.shipment_purpose),
    contentsOther: contentsFor(s.contents_category, s.shipment_purpose) === 'Other' ? s.contents_category : '',
    handling: [
      yes(s.fragile) && 'Fragile', yes(s.temperature_sensitive) && 'Temperature Sensitive',
      yes(s.high_value) && 'High Value', yes(s.lithium_battery) && 'Lithium Battery / Battery Equipment',
    ].filter(Boolean) as string[],
    dangerous: s.dangerous_goods ? (yes(s.dangerous_goods) ? 'Yes' : 'No') : '',
    instructions: '',
    attachments: [],
    attachmentsOther: '',
    authorizedName: '',
    signature: '',
    signDate: '',
  };
};

const CSS = `
.fx-modal{width:min(1000px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#eef0f4;border-radius:12px;padding:16px;display:grid;gap:12px}
.fx-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;background:#fff;border-radius:10px;padding:10px 14px}
.fx-bar h3{margin:0;font-size:16px;margin-right:auto}
.fx-bar label{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#475569}
.fx-bar select{padding:7px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-weight:600}
.fx-meta{font-size:12px;color:#475569}.fx-meta b{color:#0f172a}
.fx-scroll{overflow-x:auto}
.fx-doc{min-width:760px;background:#fff;padding:28px 34px 18px;box-shadow:0 1px 4px rgba(0,0,0,.15);font-family:Arial,Helvetica,sans-serif;color:#000}
.fx-head{display:grid;grid-template-columns:1fr 1fr;align-items:start;margin-bottom:10px}
.fx-logo{font-size:33px;font-weight:700;line-height:1;margin-top:12px;color:#4D148C;letter-spacing:-.5px}.fx-logo span{color:#FF6600}
.fx-sub{color:#4D148C;font-weight:700;font-size:11px;margin-top:18px}
.fx-right{text-align:right}.fx-right small{display:block;color:#a6a6a6;font-size:9px}
.fx-right strong{display:block;color:#4D148C;font-size:20px;margin-top:2px}
.fx-right em{display:block;font-size:10px;margin-top:14px}
.edp .fx-doc table.fx-t{width:100%;border-collapse:collapse;table-layout:fixed}
.edp .fx-doc .fx-t td{border:1px solid #7f7f7f;padding:4px 6px;vertical-align:top;font-size:10px;font-weight:400;white-space:normal;cursor:default}
.edp .fx-doc .fx-t tbody tr:hover{background:transparent}
.edp .fx-doc .fx-t td.fx-h{background:#4D148C;color:#fff;font-weight:700;font-size:13px;padding:6px 7px;border-color:#4D148C}
.edp .fx-doc .fx-t td.fx-ch{background:#4D148C;color:#fff;font-weight:700;font-size:12.5px;padding:6px 8px 10px;border-color:#4D148C;border-left-color:#fff}
.edp .fx-doc .fx-t td.fx-ch:first-child{border-left-color:#4D148C}
.edp .fx-doc .fx-t td.fx-g{padding:0 4px;height:15px}
.edp .fx-doc .fx-t tr.fx-total td{border:none;padding:2px 0 6px;font-weight:700;font-size:10.5px}
.edp .fx-doc .fx-t td.fx-plain{font-size:10px}
.fx-l{display:block;font-weight:700;font-size:10px;margin-bottom:3px}
.fx-in{display:block;width:72%;border:none;border-bottom:1px solid #d0d0d0;background:transparent;font:inherit;font-size:10.5px;color:#1f2937;padding:1px 0;margin:3px 0 1px;outline:none}
.fx-in:focus{border-bottom-color:#4D148C;background:#faf7ff}
.fx-in.wide{width:100%}
.fx-cell{display:block;width:100%;border:none;background:transparent;font:inherit;font-size:10px;color:#1f2937;padding:0;outline:none;height:15px}
.fx-cell:focus{background:#faf7ff}
.fx-u{display:inline-flex;align-items:baseline;gap:2px}.fx-u input{width:70px;border:none;border-bottom:1px solid #000;font:inherit;font-weight:700;text-align:center;background:transparent;padding:0;outline:none}
.fx-unit{display:flex;gap:2px;align-items:center}.fx-unit .fx-cell{width:auto;flex:0 1 auto;min-width:0;text-align:left}
.fx-cbs{font-weight:700;font-size:10px;line-height:1.5}
.fx-cb{border:none;background:none;padding:0;margin:0 4px 0 0;font:inherit;font-weight:700;cursor:pointer;color:inherit;white-space:nowrap}
.fx-cb .fx-box{font-size:11px;margin-right:2px}.fx-cb[aria-checked="true"] .fx-box{color:#4D148C}
.fx-inline{display:inline-block;width:110px;border:none;border-bottom:1px solid #d0d0d0;background:transparent;font:inherit;font-size:10px;outline:none}
.fx-foot{text-align:center;font-size:9px;margin-top:10px}
.fx-note{color:#5a5a5a;font-size:8.5px;margin:6px 0 0}
.fx-empty{background:#fff;border-radius:10px;padding:20px;color:#64748b;font-size:14px}
.fx-actions{display:flex;justify-content:flex-end;gap:8px}
.fx-status{color:#166534;background:#dcfce7;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700}
`;

export type FedExMailDetails = { orderId: string; tracking: string; service: string; shipDate: string; status: string; recipient: string };
type Props = { apiBase: string; orderId: string; saved: boolean; onSave: () => void; onCancel: () => void; onDraftMail: (details: FedExMailDetails) => void };

export default function FedExConsignmentForm({ apiBase, orderId, saved, onSave, onCancel, onDraftMail }: Props) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(orderId);
  const [form, setForm] = useState<Consignment>(() => buildConsignment([]));

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/fedex-shipments`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`FedEx shipment API returned ${response.status}`);
        setShipments((await response.json()) as Shipment[]);
        setError('');
      })
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load FedEx shipments.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apiBase]);

  const orderIds = useMemo(() => {
    const ids = Array.from(new Set(shipments.map((s) => s.order_id).filter(Boolean)));
    return orderId && !ids.includes(orderId) ? [orderId, ...ids] : ids;
  }, [shipments, orderId]);
  const rows = useMemo(() => shipments.filter((s) => s.order_id === filter), [shipments, filter]);

  useEffect(() => { setForm(buildConsignment(rows)); }, [rows]);

  const set = (key: TextKey) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  const choose = (key: 'shipmentType' | 'purpose' | 'dutiesBillTo' | 'contentsCategory' | 'dangerous', value: string) =>
    setForm({ ...form, [key]: form[key] === value ? '' : value });
  const toggleIn = (key: 'handling' | 'attachments', value: string) =>
    setForm({ ...form, [key]: form[key].includes(value) ? form[key].filter((v) => v !== value) : [...form[key], value] });
  const setPkg = (i: number, key: keyof Pkg) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, packages: form.packages.map((p, j) => (j === i ? { ...p, [key]: e.target.value } : p)) });
  const setGood = (i: number, key: keyof Good) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, goods: form.goods.map((g, j) => (j === i ? { ...g, [key]: e.target.value } : g)) });

  const filled = form.packages.filter((p) => p.pieces || p.weight || p.dim);
  const totalPieces = filled.length ? fmt(filled.reduce((s, p) => s + num(p.pieces), 0)) : '';
  const totalWeight = filled.length ? fmt(filled.reduce((s, p) => s + num(p.weight), 0)) : '';
  const totalChargeable = filled.length ? fmt(filled.reduce((s, p) => s + Math.max(num(p.weight), num(p.dim)), 0)) : '';

  const box = ({ key, checked, label, onClick }: { key?: string; checked: boolean; label: string; onClick: () => void }) => (
    <button key={key} type="button" role="checkbox" aria-checked={checked} className="fx-cb" onClick={onClick}>
      <span className="fx-box">{checked ? '☒' : '☐'}</span>{label}
    </button>
  );
  const field = ({ label, k, k2, wide }: { label: string; k: TextKey; k2?: TextKey; wide?: boolean }) => (
    <>
      <span className="fx-l">{label}</span>
      <input className={`fx-in${wide ? ' wide' : ''}`} aria-label={label} value={form[k]} onChange={set(k)} />
      {k2 && <input className={`fx-in${wide ? ' wide' : ''}`} aria-label={`${label} (line 2)`} value={form[k2]} onChange={set(k2)} />}
    </>
  );
  const head = (title: string) => <tr><td className="fx-h" colSpan={24}>{title}</td></tr>;

  const first = rows[0];

  return (
    <div className="fx-modal" role="dialog" aria-label="FedEx Consignment Form" onClick={(e) => e.stopPropagation()}>
      <style>{CSS}</style>
      <div className="fx-bar">
        <h3>FedEx Consignment Form</h3>
        <label>Order_ID
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by Order_ID">
            {orderIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        {first && <span className="fx-meta">Customer: <b>{first.customer_name || '—'}</b> · Status: <b>{first.shipment_status || '—'}</b></span>}
        <span className="fx-status">{saved ? 'Saved' : 'Draft'}</span>
        <button className="x" type="button" aria-label="Close form" onClick={onCancel}>×</button>
      </div>

      {loading ? <div className="fx-empty">Loading FedEx shipments from Excel...</div>
        : error ? <div className="fx-empty err">{error}</div>
        : (
          <>
            {!rows.length && <div className="fx-empty">No FedEx shipment found in the FedEx_Shipments worksheet for Order_ID <b>{filter || '—'}</b>. Select another Order_ID above or complete the form manually.</div>}
            <div className="fx-scroll">
              <div className="fx-doc">
                <div className="fx-head">
                  <div>
                    <div className="fx-logo">Fed<span>Ex</span></div>
                    <div className="fx-sub">COURIER CONSIGNMENT TEMPLATE</div>
                  </div>
                  <div className="fx-right">
                    <small>Courier Consignment Template</small>
                    <strong>INTERNATIONAL / DOMESTIC</strong>
                    <em>Shipment preparation worksheet - complete before booking / handover</em>
                  </div>
                </div>

                <table className="fx-t">
                  <colgroup>{Array.from({ length: 24 }, (_, i) => <col key={i} />)}</colgroup>
                  <tbody>
                    {head("1. SHIPMENT INFORMATION")}
                    <tr>
                      <td colSpan={6}><span className="fx-cbs">Shipment Type:&nbsp; {box({ checked: form.shipmentType === 'Domestic', label: "Domestic", onClick: () => choose('shipmentType', 'Domestic') })} {box({ checked: form.shipmentType === 'International', label: "International", onClick: () => choose('shipmentType', 'International') })}</span></td>
                      <td colSpan={6}>{field({ label: "FedEx Service / Product", k: "service" })}</td>
                      <td colSpan={6}>{field({ label: "Ship Date (DD/MM/YYYY)", k: "shipDate" })}</td>
                      <td colSpan={6}>{field({ label: "FedEx Account No. / Billing Ref.", k: "account" })}</td>
                    </tr>
                    <tr>
                      <td colSpan={12}>{field({ label: "Tracking / AWB No. (if assigned)", k: "tracking" })}</td>
                      <td colSpan={12}>{field({ label: "Pickup / Booking Ref.", k: "pickup" })}</td>
                    </tr>

                    {head("2. SHIPPER AND RECIPIENT DETAILS")}
                    <tr><td className="fx-h" colSpan={12}>SHIPPER / FROM</td><td className="fx-h" colSpan={12}>RECIPIENT / TO</td></tr>
                    <tr>
                      <td colSpan={12}>{field({ label: "Company / Contact Name", k: "shipperName", wide: true })}</td>
                      <td colSpan={12}>{field({ label: "Company / Contact Name", k: "recipientName", wide: true })}</td>
                    </tr>
                    <tr>
                      <td colSpan={12}>{field({ label: "Address (Street, City, State/Province, Postal Code, Country)", k: "shipperAddress1", k2: "shipperAddress2", wide: true })}</td>
                      <td colSpan={12}>{field({ label: "Address (Street, City, State/Province, Postal Code, Country)", k: "recipientAddress1", k2: "recipientAddress2", wide: true })}</td>
                    </tr>
                    <tr>
                      <td colSpan={12}>{field({ label: "Phone / Email", k: "shipperContact", wide: true })}</td>
                      <td colSpan={12}>{field({ label: "Phone / Email", k: "recipientContact", wide: true })}</td>
                    </tr>

                    {head("3. PACKAGE / CONSIGNMENT DETAILS")}
                    <tr>{['Pkg #', 'Package Type', 'Pieces', 'Actual Wt.', 'L', 'W', 'H', 'Dim. Wt.'].map((h) => <td key={h} className="fx-ch" colSpan={3}>{h}</td>)}</tr>
                    {form.packages.map((p, i) => (
                      <tr key={`pkg-${i}`}>
                        <td className="fx-g" colSpan={3}><input className="fx-cell" aria-label={`Package ${i + 1} number`} placeholder={String(i + 1)} value={p.pkg} onChange={setPkg(i, 'pkg')} /></td>
                        <td className="fx-g" colSpan={3}><input className="fx-cell" aria-label={`Package ${i + 1} type`} value={p.type} onChange={setPkg(i, 'type')} /></td>
                        <td className="fx-g" colSpan={3}><input className="fx-cell" aria-label={`Package ${i + 1} pieces`} value={p.pieces} onChange={setPkg(i, 'pieces')} /></td>
                        {([['weight', 'kg'], ['l', 'cm'], ['w', 'cm'], ['h', 'cm'], ['dim', 'kg']] as [keyof Pkg, string][]).map(([key, unit]) => (
                          <td key={key} className="fx-g" colSpan={3}><span className="fx-unit"><input className="fx-cell" size={Math.max(1, p[key].length)} aria-label={`Package ${i + 1} ${key}`} value={p[key]} onChange={setPkg(i, key)} />{unit}</span></td>
                        ))}
                      </tr>
                    ))}
                    <tr className="fx-total"><td colSpan={24}>
                      Total pieces: <span className="fx-u"><input readOnly aria-label="Total pieces" value={totalPieces} /></span>&nbsp;&nbsp;&nbsp;&nbsp;
                      Total actual weight: <span className="fx-u"><input readOnly aria-label="Total actual weight" value={totalWeight} /></span> kg&nbsp;&nbsp;&nbsp;&nbsp;
                      Total chargeable weight: <span className="fx-u"><input readOnly aria-label="Total chargeable weight" value={totalChargeable} /></span> kg
                    </td></tr>

                    {head("4. CONTENT DESCRIPTION AND CUSTOMS INFORMATION (INTERNATIONAL: COMPLETE FULLY)")}
                    <tr>{['Detailed Description of Goods', 'Qty', 'HS Code', 'Country of Origin', 'Unit Value', 'Total Value'].map((h) => <td key={h} className="fx-ch" colSpan={4}>{h}</td>)}</tr>
                    {form.goods.map((g, i) => (
                      <tr key={`good-${i}`}>
                        {(['description', 'qty', 'hs', 'origin', 'unit', 'total'] as (keyof Good)[]).map((key) => (
                          <td key={key} className="fx-g" colSpan={4}><input className="fx-cell" aria-label={`Goods ${i + 1} ${key}`} value={g[key]} onChange={setGood(i, key)} /></td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={12}><span className="fx-cbs">Shipment Purpose: {PURPOSES.map((p) => box({ key: p, checked: form.purpose === p, label: p === 'Other' ? 'Other:' : p, onClick: () => choose('purpose', p) }))}{form.purpose === 'Other' && <input className="fx-inline" aria-label="Other shipment purpose" value={form.purposeOther} onChange={set('purposeOther')} />}</span></td>
                      <td colSpan={12}>{field({ label: "Currency / Total Customs Value", k: "customsValue" })}</td>
                    </tr>

                    {head("5. INTERNATIONAL COMMERCIAL / CLEARANCE DETAILS")}
                    <tr>
                      <td colSpan={6}>{field({ label: "Commercial / Proforma Invoice No. & Date", k: "invoiceNo", k2: "invoiceDate" })}</td>
                      <td colSpan={6}>{field({ label: "Incoterm (e.g., DAP/DDP/FCA)", k: "incoterm" })}</td>
                      <td colSpan={6}>{field({ label: "IEC / EORI / Tax ID (as applicable)", k: "taxId" })}</td>
                      <td colSpan={6}>{field({ label: "Reason for Export / Import", k: "reason", wide: true })}</td>
                    </tr>
                    <tr>
                      <td colSpan={12}><span className="fx-cbs">Duties &amp; Taxes Bill To: {['Sender', 'Recipient', 'Third Party'].map((v) => box({ key: v, checked: form.dutiesBillTo === v, label: v, onClick: () => choose('dutiesBillTo', v) }))}</span></td>
                      <td colSpan={12}>{field({ label: "Third-Party Account No. (if applicable)", k: "thirdPartyAccount" })}</td>
                    </tr>

                    {head("6. DOMESTIC DETAILS (USE AS APPLICABLE)")}
                    <tr>
                      <td colSpan={6}>{field({ label: "Invoice / Document Ref.", k: "documentRef", k2: "documentRef2" })}</td>
                      <td colSpan={6}>{field({ label: "Declared Value (INR)", k: "declaredValue" })}</td>
                      <td colSpan={6}>{field({ label: "GSTIN / Tax Ref.", k: "gstin" })}</td>
                      <td colSpan={6}>{field({ label: "E-Way Bill No. / Validity", k: "ewayBill" })}</td>
                    </tr>
                    <tr>
                      <td colSpan={24}><span className="fx-cbs">Contents Category: {CONTENTS.map((c) => box({ key: c, checked: form.contentsCategory === c, label: c, onClick: () => choose('contentsCategory', c) }))}{form.contentsCategory === 'Other' && <input className="fx-inline" aria-label="Other contents category" value={form.contentsOther} onChange={set('contentsOther')} />}</span></td>
                    </tr>

                    {head("7. SPECIAL HANDLING / COMPLIANCE")}
                    <tr>
                      <td colSpan={12}><span className="fx-cbs">{HANDLING.map((h) => box({ key: h, checked: form.handling.includes(h), label: h, onClick: () => toggleIn('handling', h) }))}</span></td>
                      <td colSpan={12}><span className="fx-cbs">Dangerous / Restricted Goods: {box({ checked: form.dangerous === 'No', label: "No", onClick: () => choose('dangerous', 'No') })} {box({ checked: form.dangerous === 'Yes', label: "Yes (provide required declaration/documentation)", onClick: () => choose('dangerous', 'Yes') })}</span></td>
                    </tr>
                    <tr>
                      <td colSpan={12}>{field({ label: "Special Instructions", k: "instructions" })}</td>
                      <td colSpan={12}><span className="fx-cbs">Attachments: {ATTACHMENTS.map((a) => box({ key: a, checked: form.attachments.includes(a), label: a, onClick: () => toggleIn('attachments', a) }))}</span><input className="fx-in" aria-label="Attachments details" value={form.attachmentsOther} onChange={set('attachmentsOther')} /></td>
                    </tr>

                    {head("8. SHIPPER DECLARATION / AUTHORIZATION")}
                    <tr><td className="fx-plain" colSpan={24}>I confirm that the shipment information provided above is complete and accurate to the best of my knowledge. The shipper remains responsible for the formal carrier documentation, customs declarations, permits and regulatory requirements applicable to the shipment.</td></tr>
                    <tr>
                      <td colSpan={8}>{field({ label: "Authorized Name / Designation", k: "authorizedName" })}</td>
                      <td colSpan={8}>{field({ label: "Signature", k: "signature" })}</td>
                      <td colSpan={8}>{field({ label: "Date / Company Stamp", k: "signDate" })}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="fx-note">Template note: This is a shipment-preparation worksheet, not an official FedEx Air Waybill, shipping label or customs form. Use FedEx-approved shipping documents and current carrier/customs requirements for the actual shipment.</p>
                <div className="fx-foot">Prepared for operational use | International / Domestic</div>
              </div>
            </div>
          </>
        )}

      <div className="fx-actions">
        <button className="btn" type="button" onClick={onCancel}>Cancel</button>
        <button className="btn" type="button" disabled={loading || !!error || !form.tracking.trim()}
          title={form.tracking.trim() ? 'Draft a mail with the FedEx tracking number' : 'No FedEx tracking number for this order'}
          onClick={() => onDraftMail({
            orderId: filter, tracking: form.tracking.trim(), service: form.service, shipDate: form.shipDate,
            status: first?.shipment_status ?? '', recipient: first?.recipient_name || first?.customer_name || '',
          })}>Draft Mail</button>
        <button className="btn pri" type="button" disabled={loading || !!error} onClick={onSave}>Save and Complete Workflow</button>
      </div>
    </div>
  );
}
