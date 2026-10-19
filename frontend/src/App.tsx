import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, PERSONAS } from './config/loginOptions';
import EmailDiscoveryPortal, { type OrderMapping } from './EmailDiscoveryPortal';
import ChatDiscoveryPortal from './ChatDiscoveryPortal';
import VoiceDiscoveryPortal from './VoiceDiscoveryPortal';
import DocumentDiscoveryPortal from './DocumentDiscoveryPortal';
import OrderView from './OrderView';
import InvoiceModule, { INVOICE_ROUTE_PATTERN } from './invoices/InvoiceModule';
import InvoiceCreateDialog from './invoices/InvoiceCreateDialog';

type CustomerSession = {
  customer_id: string;
  client_id: string;
  customer_name: string;
  customer_category: string;
  username: string;
  persona: string;
  rbac_role: string;
  policy_id: string;
  crud_rights: string;
  approve_reject_rights: string;
  itsm_level: string;
  application_access: Array<{
    application_name: string;
    tenancy_id: string;
    rights: string[];
  }>;
  tenancy_information: {
    customer_category: string;
    tenancies: string[];
    policy_id: string;
  };
};

type User = {
  user_id?: number;
  email: string;
  name: string;
  role?: string;
  persona_id?: string;
  designation?: string;
  access_token: string;
  session?: CustomerSession;
};

type Kpi = {
  id: string;
  name: string;
  value: number;
  target?: number;
  unit?: string;
  status?: string;
  description?: string;
  category?: string;
  period?: string;
  source?: string;
  sample_size?: number;
  series?: { time: string; value: number }[];
};

type KpiPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

type KpiSummary = {
  kpi_id: string;
  kpi_name: string;
  name: string;
  value: number | null;
  target: number | null;
  team_average?: number | null;
  unit?: string;
  status: string;
  direction?: string | null;
  trend_series?: { time: string; value: number }[];
  description?: string;
  formula?: string;
  period: string;
  source?: string;
  sample_size: number;
  total_observation_count: number;
  data_available: boolean;
  availability_message: string | null;
};

type KpiDetail = {
  kpi_id: string;
  kpi_name: string;
  description: string | null;
  definition: string | null;
  formula: string | null;
  unit: string | null;
  current_value: number | null;
  target: number | null;
  target_source: string | null;
  team_average: number | null;
  team_average_label: string | null;
  team_average_variance: number | null;
  team_average_distance: number | null;
  trend_series: { time: string; value: number }[];
  variance_to_target: number | null;
  status: string;
  direction: string | null;
  trend: string;
  numerator: number | null;
  denominator: number | null;
  components: { label: string; value: number | null; unit?: string; component: string }[];
  period: string;
  data_available: boolean;
  availability_message: string | null;
  observation_count: number;
  total_observation_count: number;
  records: {
    observation_id: string;
    account_name: string;
    account_id: string;
    observed_at: string;
    component_a_label: string;
    component_a_value: number;
    component_b_label: string;
    component_b_value: number;
    result_label: string;
    result_value: number;
  }[];
  data_source_detail: string;
  api_endpoint: string;
  viewer_name: string;
  persona: string;
  driver: string | null;
  enterprise_linkage: string | null;
  function: string | null;
  process: string | null;
  activity: string | null;
  task: string | null;
  data_source: string;
  source: string | null;
  last_updated: string;
};

type ProcessExecution = {
  process_execution_id: string;
  customer_request_id: string;
  process_name: string;
  activity_name: string;
  task_name: string;
  process_sequence: number;
  status: string;
  started_at: string;
  duration_minutes: number | null;
  elapsed_minutes: number | null;
  sla_target_minutes: number;
  retry_count: number;
  failure_reason: string | null;
  alert_id: string | null;
};

type DashboardAlert = {
  alert_id: string;
  process_execution_id: string;
  customer_request_id: string;
  alert_type: string;
  severity: string;
  observed_minutes: number;
  threshold_minutes: number;
  resolution_status: string;
  detected_at: string;
  reason: string;
};
type DashboardException = {
  exception_id: string;
  process_id: string;
  process_name: string;
  workflow_status: string;
  exception_type: string;
  measured_value: number;
  lcl: number;
  ucl: number;
  variance: number;
  impact: number;
  urgency: string;
  priority: string;
  assignment_group: string;
  action_required: string;
  exception_date: string;
};
type ExceptionSummary = {
  critical_exceptions: number;
  ucl_breaches: number;
  lcl_breaches: number;
};

type ResponsibilityWorkItem = {
  work_item_id: string;
  responsibility_id: string;
  customer_request_id: string;
  work_item: string;
  status: string;
  updated_at: string;
  due_at: string;
  responsibility?: string;
  activity_name?: string;
  work_item_name?: string;
  priority?: string;
  owner?: string;
  due_date?: string;
};

type Responsibility = {
  responsibility_id: string;
  responsibility: string;
  metric_name: string;
  formula: string;
  target_area: string;
  status_counts: Record<string, number>;
  work_item_count: number;
  work_items: ResponsibilityWorkItem[];
  responsibility_name?: string;
  activity_name?: string;
  priority?: string;
  owner?: string;
  due_date?: string;
};

type WorkDetail = ResponsibilityWorkItem & {
  label: string;
  type: string;
  when: string;
  where: string;
  by: string;
  to: string;
  subject: string;
  content: string;
  process: string;
  expectation: string;
  transcript: { speaker: string; text: string }[];
};

type DemoOrder = {
  order_id: string;
  customer: string;
  status: string;
  po_status: string;
  total: string;
  created_at: string;
  work_items: { id: string; title: string; status: string; owner: string; due: string }[];
};

type DemoWorkflowStep = {
  process: string;
  status: string;
  persona: string;
  resource: string;
};

const DEMO_ORDERS: DemoOrder[] = [
  {
    order_id: 'ORD-78419', customer: 'Northstar Health', status: 'Ready for invoicing', po_status: 'Valid', total: '$5,000', created_at: '08 Oct 2026, 08:42',
    work_items: [
      { id: 'WI-78419-01', title: 'Map customer email to existing order', status: 'In Progress', owner: 'CC Manager', due: 'Today, 4:00 PM' },
      { id: 'WI-78419-02', title: 'Validate purchase order', status: 'Pending', owner: 'Finance Manager', due: 'Today, 5:30 PM' },
    ],
  },
  {
    order_id: 'ORD-78420', customer: 'Northstar Health', status: 'New order identified', po_status: 'Not created', total: '$3,200', created_at: '08 Oct 2026, 09:15',
    work_items: [
      { id: 'WI-78420-01', title: 'Create new order from customer email', status: 'In Progress', owner: 'CC Manager', due: 'Today, 5:00 PM' },
      { id: 'WI-78420-02', title: 'Create purchase order', status: 'Pending', owner: 'CC Manager', due: 'Today, 5:30 PM' },
    ],
  },
];

type DashboardView = 'overview' | 'responsibilities' | 'responsibility-detail' | 'work-detail' | 'order-list' | 'order-work-items' | 'order-workflow' | 'order-view' | 'alerts' | 'workflows' | 'invoices';

const KPI_PERIODS: KpiPeriod[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

function getInitialRoute(): { view: DashboardView; kpiId: string | null; responsibilityId: string | null; workItemId: string | null; orderId: string | null; orderWorkItemId: string | null; period: KpiPeriod } {
  const url = new URL(window.location.href);
  const pathMatch = url.pathname.match(/^\/kpis\/([^/]+)\/?$/);
  const workMatch = url.pathname.match(/^\/responsibilities\/([^/]+)\/work\/([^/]+)\/?$/);
  const responsibilityMatch = url.pathname.match(/^\/responsibilities\/([^/]+)\/?$/);
  const orderWorkMatch = url.pathname.match(/^\/orders\/([^/]+)\/work\/([^/]+)\/?$/);
  const orderMatch = url.pathname.match(/^\/orders\/([^/]+)\/?$/);
  const requestedPeriod = url.searchParams.get('period')?.toLowerCase();
  const period = KPI_PERIODS.find((item) => item === requestedPeriod) ?? 'weekly';
  const requestedView = url.searchParams.get('view');
  return {
    view: INVOICE_ROUTE_PATTERN.test(url.pathname)
        ? 'invoices'
      : orderWorkMatch
        ? 'order-workflow'
      : orderMatch
        ? 'order-work-items'
      : requestedView === 'order-list'
        ? 'order-list'
      : workMatch
        ? 'work-detail'
      : responsibilityMatch
        ? 'responsibility-detail'
        : requestedView === 'responsibilities'
            ? 'responsibilities'
              : requestedView === 'alerts'
                ? 'alerts'
                : requestedView === 'workflows'
                  ? 'workflows'
            : 'overview',
    kpiId: pathMatch ? decodeURIComponent(pathMatch[1]) : null,
    responsibilityId: workMatch ? decodeURIComponent(workMatch[1]) : responsibilityMatch ? decodeURIComponent(responsibilityMatch[1]) : null,
    workItemId: workMatch ? decodeURIComponent(workMatch[2]) : null,
    orderId: orderWorkMatch ? decodeURIComponent(orderWorkMatch[1]) : orderMatch ? decodeURIComponent(orderMatch[1]) : null,
    orderWorkItemId: orderWorkMatch ? decodeURIComponent(orderWorkMatch[2]) : null,
    period,
  };
}

function formatKpiValue(value: number | null, unit?: string | null): string {
  if (value === null) return 'Not available';
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function getKpiStatus(value: number | null, target: number | null): 'Above Normal' | 'Normal' | 'Below Normal' {
  if (value === null || target === null) return 'Normal';
  if (value > target) return 'Above Normal';
  if (value < target) return 'Below Normal';
  return 'Normal';
}

function getKpiSlaStatus(kpi: Pick<KpiSummary, 'value' | 'target' | 'team_average' | 'direction'>): 'Above SLA' | 'Within SLA' | 'Below SLA' {
  const reference = kpi.target ?? kpi.team_average ?? null;
  if (kpi.value === null || reference === null) return 'Within SLA';
  const direction = kpi.direction?.toLowerCase() ?? '';
  const meetsTarget = direction.includes('decrease')
    ? kpi.value <= reference
    : kpi.value >= reference;
  return meetsTarget ? 'Above SLA' : 'Below SLA';
}

function getOverviewSlaStatus(kpi: KpiSummary, index: number, useRoleOneDemoDistribution: boolean): 'Above SLA' | 'Within SLA' | 'Below SLA' {
  if (!useRoleOneDemoDistribution) return getKpiSlaStatus(kpi);
  return (['Above SLA', 'Within SLA', 'Below SLA'] as const)[index % 3];
}

function getKpiTrend(series: { time: string; value: number }[] | undefined, direction?: string | null): string {
  if (!series || series.length < 2) return 'Trend unavailable';
  const previous = series[series.length - 2].value;
  const current = series[series.length - 1].value;
  if (current === previous) return 'Stable';

  const movement = current > previous ? 'Increasing' : 'Decreasing';
  const directionIsDecrease = direction?.toLowerCase().includes('decrease') ?? false;
  const directionIsIncrease = direction?.toLowerCase().includes('increase') ?? false;
  if (!directionIsDecrease && !directionIsIncrease) return movement;

  const isPositive = directionIsDecrease ? current < previous : current > previous;
  return `${movement} · ${isPositive ? 'Positive' : 'Negative'}`;
}

const DEMO_KPI_DIRECTIONS: Record<string, string> = {
  'average-process-duration': 'Decrease',
  'on-time-completion-rate': 'Increase',
  'process-completion-rate': 'Increase',
};

function getKpiTrendData(
  kpiId: string,
  value: number | null,
  direction: string | null | undefined,
  series: { time: string; value: number }[] | undefined,
  hasObservations = true,
): { direction: string | null | undefined; illustrative: boolean; series: { time: string; value: number }[] } {
  if (series && series.length > 1) return { direction, illustrative: false, series };

  const resolvedDirection = direction ?? DEMO_KPI_DIRECTIONS[kpiId];
  if (value === null || !hasObservations || !DEMO_KPI_DIRECTIONS[kpiId]) {
    return { direction: resolvedDirection, illustrative: false, series: series ?? [] };
  }

  const delta = Math.max(Math.abs(value) * 0.02, 0.5);
  const previousValue = resolvedDirection?.toLowerCase().includes('decrease')
    ? value + delta
    : value - delta;
  return {
    direction: resolvedDirection,
    illustrative: true,
    series: [
      { time: 'Previous', value: previousValue },
      { time: 'Current', value },
    ],
  };
}


function OrderList({ onSelectOrder, onBack }: { onSelectOrder: (orderId: string) => void; onBack: () => void }) {
  return <section className="panel-card details-panel">
    <div className="work-breadcrumbs"><button className="breadcrumb-button" type="button" onClick={onBack}>Responsibilities</button><span aria-hidden="true">/</span><span>List of Orders</span></div>
    <div className="panel-heading"><div><p className="eyebrow">Order work queue</p><h3>List of Orders</h3><p>Demo orders available for workflow review.</p></div></div>
    <div className="responsibility-list">{DEMO_ORDERS.map((order) => <button className="responsibility-card" type="button" key={order.order_id} onClick={() => onSelectOrder(order.order_id)}><strong>{order.order_id}</strong><small>{order.customer} · {order.status}</small><span>PO: {order.po_status} · Total: {order.total} · {order.work_items.length} work items</span></button>)}</div>
  </section>;
}

function OrderWorkItems({ order, onSelectWorkItem, onBack }: { order: DemoOrder; onSelectWorkItem: (workItemId: string) => void; onBack: () => void }) {
  return <section className="panel-card details-panel">
    <div className="work-breadcrumbs"><button className="breadcrumb-button" type="button" onClick={onBack}>List of Orders</button><span aria-hidden="true">/</span><span>{order.order_id}</span></div>
    <div className="panel-heading"><div><p className="eyebrow">Selected order</p><h3>{order.order_id}</h3><p>{order.customer} · {order.status} · PO {order.po_status}</p></div></div>
    <h4 className="section-title">Workflow Work Items</h4>
    <div className="work-items-list">{order.work_items.map((item) => <button className="work-item-row work-item-open" type="button" key={item.id} onClick={() => onSelectWorkItem(item.id)}><span className="work-item-description"><strong>{item.title}</strong><small>{item.id} · Owner {item.owner} · Due {item.due}</small></span><em className={`work-item-status status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</em></button>)}</div>
  </section>;
}

function DemoWorkflowDetails({ order, workItemId, onBack }: { order: DemoOrder; workItemId: string; onBack: () => void }) {
  const workItem = order.work_items.find((item) => item.id === workItemId);
  if (!workItem) return <section className="panel-card details-panel"><div className="empty-state">Workflow data is not available for this work item.</div></section>;
  const workflow = {
    previous: [],
    current: { process: workItem.title, status: workItem.status, persona: workItem.owner, resource: workItem.owner },
    future: [],
  };
  const renderStep = (step: DemoWorkflowStep, className: string) => <article className={`demo-workflow-step ${className}`} key={`${step.process}-${step.status}`}><strong>{step.process}</strong><span>Status: {step.status}</span><span>Persona / Role: {step.persona}</span><span>Assigned Resource: {step.resource}</span></article>;
  return <section className="panel-card details-panel">
    <div className="work-breadcrumbs"><button className="breadcrumb-button" type="button" onClick={onBack}>Workflow Work Items</button><span aria-hidden="true">/</span><span>{workItem.id}</span></div>
    <div className="panel-heading"><div><p className="eyebrow">Workflow Work Item</p><h3>{workItem.title}</h3><p>{order.order_id} · {order.customer}</p></div><span className={`work-item-status status-${workItem.status.toLowerCase().replace(/\s+/g, '-')}`}>{workItem.status}</span></div>
    <div className="demo-workflow-timeline"><section className="demo-workflow-stage"><h4 className="demo-workflow-heading previous">Previous Process</h4>{workflow.previous.map((step) => renderStep(step, 'previous'))}</section><div className="timeline-connector" aria-hidden="true">→</div><section className="demo-workflow-stage"><h4 className="demo-workflow-heading current">Current Process</h4>{renderStep(workflow.current, 'current')}</section><div className="timeline-connector" aria-hidden="true">→</div><section className="demo-workflow-stage"><h4 className="demo-workflow-heading future">Next Process</h4>{workflow.future.map((step) => renderStep(step, 'future'))}</section></div>
    <p className="panel-description">Demo workflow data is shown for this transaction. No live process status is changed.</p>
  </section>;
}

function getResponsibilityWorkflow(workItem: WorkDetail): { previous: DemoWorkflowStep[]; current: DemoWorkflowStep; future: DemoWorkflowStep[] } {
  const process = workItem.process || 'Review Customer Request';
  const channel = workItem.type === 'Email' ? 'Email' : workItem.type;
  return {
    previous: [{ process: `${channel} Details`, status: 'Completed', persona: 'CC Agent', resource: workItem.by || 'Intake Team' }],
    current: { process, status: workItem.status, persona: 'Process Specialist', resource: workItem.to || 'Order Management' },
    future: [{ process: 'Show Customer Context', status: 'Upcoming', persona: 'Process Specialist', resource: 'Customer Operations' }, { process: 'Recommend Action', status: 'Upcoming', persona: 'Process Specialist', resource: 'Order Management' }],
  };
}

function ResponsibilityWorkflowDetails({ workItem, onBack }: { workItem: WorkDetail; onBack: () => void }) {
  const workflow = getResponsibilityWorkflow(workItem);
  const renderStep = (step: DemoWorkflowStep, className: string) => <article className={`demo-workflow-step ${className}`} key={`${step.process}-${step.status}`}><strong>{step.process}</strong><span>Status: {step.status}</span><span>Persona / Role: {step.persona}</span><span>Assigned Resource: {step.resource}</span></article>;
  return <section className="workflow-detail-view">
    <div className="work-breadcrumbs"><button className="breadcrumb-button" type="button" onClick={onBack}>Responsibility</button><span aria-hidden="true">/</span><span>{workItem.work_item_id}</span></div>
    <div className="panel-heading"><div><p className="eyebrow">Workflow Details</p><h3>{workItem.work_item}</h3></div><span className={`work-item-status status-${workItem.status.toLowerCase().replace(/\s+/g, '-')}`}>{workItem.status}</span></div>
    <dl className="workflow-detail-summary"><div><dt>Workflow Work Item ID</dt><dd>{workItem.work_item_id}</dd></div><div><dt>Work Item Name</dt><dd>{workItem.work_item}</dd></div><div><dt>Order Reference</dt><dd>{workItem.customer_request_id}</dd></div><div><dt>Status</dt><dd>{workItem.status}</dd></div></dl>
    <div className="demo-workflow-timeline"><section className="demo-workflow-stage"><h4 className="demo-workflow-heading previous">Previous Process</h4>{workflow.previous.map((step) => renderStep(step, 'previous'))}</section><div className="timeline-connector" aria-hidden="true">→</div><section className="demo-workflow-stage"><h4 className="demo-workflow-heading current">Current Process</h4>{renderStep(workflow.current, 'current')}</section><div className="timeline-connector" aria-hidden="true">→</div><section className="demo-workflow-stage"><h4 className="demo-workflow-heading future">Next Process</h4>{workflow.future.map((step) => renderStep(step, 'future'))}</section></div>
  </section>;
}
type DashboardResponse = {
  persona: string;
  viewer: { name: string; email: string; designation?: string };
  updated_at: number;
  data_source?: string;
  status_panel?: { title: string; summary: string; items: { label: string; value: string | number; status_filter?: string }[] };
  metric_panel?: { title: string; items: { label: string; value: number | string; unit?: string; status?: string }[] };
  responsibility_panel?: { title: string; items: Responsibility[] };
  action_panel?: { title: string; items: { title: string; priority: string; kpi: string }[] };
  workflow_panel?: { title: string; request_id?: string | null; items: { step: string; status: string }[] };
  kpis?: Kpi[];
  process_executions?: ProcessExecution[];
  alerts?: DashboardAlert[];
  exceptions?: DashboardException[];
  exception_summary?: ExceptionSummary;
  personas?: string[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? (window.location.port === '5173' ? 'http://localhost:8000' : window.location.origin);
const STORAGE_KEY = 'jj-dashboard-user';

function authHeaders(user: User): HeadersInit {
  return { Authorization: `Bearer ${user.access_token}` };
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    let detail = message;
    try {
      detail = JSON.parse(message).detail || message;
    } catch { /* Non-JSON error responses use their text body. */ }
    throw new Error(detail || 'Request failed');
  }

  return response.json() as Promise<T>;
}

function TrendChart({ series, unit }: { series: { time: string; value: number }[]; unit?: string | null }) {
  const values = series;
  if (!values.length) return <div className="trend-empty">Trend data not available for this period</div>;
  const minimum = Math.min(...values.map((point) => point.value));
  const maximum = Math.max(...values.map((point) => point.value));
  const range = maximum - minimum || 1;
  const points = values.map((point, index) => ({
    x: values.length === 1 ? 50 : (index / (values.length - 1)) * 100,
    y: 84 - ((point.value - minimum) / range) * 66,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `0,100 ${line} 100,100`;

  return (
    <div className="trend-chart-wrap">
      <svg className="trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`KPI trend in ${unit ?? 'selected units'}`}>
        <polygon className="trend-area" points={area} />
        <polyline className="trend-line" points={line} />
        <circle className="trend-point" cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.4" />
      </svg>
      <div className="trend-range"><span>{values[0].time}</span><span>{values[values.length - 1].time}</span></div>
    </div>
  );
}

function getDriverImpact(driver: string | null, linkedKpi: string | null, direction: string | null): { direction: string; explanation: string; illustrative: boolean } {
  const driverText = driver?.toLowerCase() ?? '';
  const linkedText = linkedKpi?.toLowerCase() ?? '';
  if (!driver || !linkedKpi) return { direction: 'No clear impact', explanation: 'The workbook does not define an impact relationship for this target driver and KPI.', illustrative: true };
  if ((linkedText.includes('aht') || linkedText.includes('asa')) && /efficiency|productivity|discipline|timeliness/.test(driverText)) {
    return { direction: 'Decreasing', explanation: `Improving ${driver} is expected to reduce ${linkedKpi}; this is an illustrative relationship aligned to the KPI direction (${direction ?? 'not configured'}).`, illustrative: true };
  }
  if (/fcr|csat|accuracy|quality|resolution|completion|satisfaction/.test(linkedText) && /effectiveness|experience|accuracy|quality|compliance|resolution|customer/.test(driverText)) {
    return { direction: 'Increasing', explanation: `Improving ${driver} is expected to increase ${linkedKpi}; this is illustrative because the workbook provides the linkage but not a numeric impact model.`, illustrative: true };
  }
  return { direction: 'No clear impact', explanation: `${driver} is linked to ${linkedKpi} in the workbook, but the direction of impact is not specified.`, illustrative: true };
}

function TargetDriverImpactSection({ detail }: { detail: KpiDetail }) {
  const impact = getDriverImpact(detail.driver, detail.enterprise_linkage, detail.direction);
  return <section className="target-driver-impact">
    <div className="panel-heading"><div><p className="eyebrow">{detail.persona || 'Selected role'} · workbook mapping</p><h3>Target Driver &amp; Linked KPI Impact</h3><p>Role-specific relationship from the Medical Device Business Services workbook. Impact wording is illustrative where the workbook does not define the relationship.</p></div></div>
    <div className="target-driver-table-wrap"><table className="target-driver-table"><thead><tr><th>Selected KPI</th><th>Target Driver</th><th>Linked KPI</th><th>Impact Direction</th><th>Impact Explanation</th></tr></thead><tbody><tr><td>{detail.kpi_name}</td><td>{detail.driver ?? 'Not specified in workbook'}</td><td>{detail.enterprise_linkage ?? 'Not specified in workbook'}</td><td><span className={`impact-direction ${impact.direction === 'Increasing' ? 'positive' : impact.direction === 'Decreasing' ? 'negative' : 'neutral'}`}>{impact.direction}</span><small>Configured KPI direction: {detail.direction ?? 'Not configured'}</small></td><td>{impact.explanation}</td></tr></tbody></table></div>
  </section>;
}

export default function App() {
  const initialRoute = getInitialRoute();
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(initialRoute.workItemId);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialRoute.orderId);
  const [selectedOrderWorkItemId, setSelectedOrderWorkItemId] = useState<string | null>(initialRoute.orderWorkItemId);
  const [workDiscovery, setWorkDiscovery] = useState<'chat' | 'email' | 'chat-list' | 'voice' | 'document' | null>(null);
  const [triageTarget, setTriageTarget] = useState<'Order Management' | 'Case Management' | null>(null);
  const [triageNotes, setTriageNotes] = useState('');
  const [triageSaved, setTriageSaved] = useState(false);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) as User : null;
      if (parsed?.access_token) return parsed;
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  });
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(() => user?.session ?? null);
  const [customerSessionLoading, setCustomerSessionLoading] = useState(() => Boolean(user));
  const [customerSessionError, setCustomerSessionError] = useState('');
  const [category, setCategory] = useState('');
  const [persona, setPersona] = useState('');
  const [loginOptions, setLoginOptions] = useState<{ categories: string[]; personas: string[] }>({
    categories: [...CATEGORIES],
    personas: PERSONAS.map((item) => item.value),
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
    const [exceptions, setExceptions] = useState<DashboardException[]>([]);
    const [exceptionSummary, setExceptionSummary] = useState<ExceptionSummary>({ critical_exceptions: 0, ucl_breaches: 0, lcl_breaches: 0 });
    const [exceptionFilter, setExceptionFilter] = useState<'critical' | 'ucl' | 'lcl' | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [processSearch, setProcessSearch] = useState('');
  const [executionSearch, setExecutionSearch] = useState('');
  const [processFilter, setProcessFilter] = useState('');
  const [executionDateFrom, setExecutionDateFrom] = useState('');
  const [executionDateTo, setExecutionDateTo] = useState('');
  const [executionStatus, setExecutionStatus] = useState('');
  const [processExecutions, setProcessExecutions] = useState<ProcessExecution[]>([]);
  const [processExecutionTotal, setProcessExecutionTotal] = useState(0);
  const [processExecutionsLoading, setProcessExecutionsLoading] = useState(false);
  const [processExecutionsError, setProcessExecutionsError] = useState('');
  const [workStatusFilter, setWorkStatusFilter] = useState('');
  const [selectedResponsibilityId, setSelectedResponsibilityId] = useState<string | null>(initialRoute.responsibilityId);
  const [responsibilityDetail, setResponsibilityDetail] = useState<Responsibility | null>(null);
  const [responsibilityLoading, setResponsibilityLoading] = useState(false);
  const [responsibilityError, setResponsibilityError] = useState('');
  const [activeView, setActiveView] = useState<DashboardView>(initialRoute.view);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(initialRoute.kpiId);
  const [metricsPeriod, setMetricsPeriod] = useState<KpiPeriod>(initialRoute.period);
  const [slaFilter, setSlaFilter] = useState<'Above SLA' | 'Within SLA' | 'Below SLA' | null>(null);
  const [metricKpis, setMetricKpis] = useState<KpiSummary[]>([]);
  const [kpiListLoading, setKpiListLoading] = useState(false);
  const [kpiListError, setKpiListError] = useState('');
  const [kpiDetail, setKpiDetail] = useState<KpiDetail | null>(null);
  const [kpiDetailLoading, setKpiDetailLoading] = useState(false);
  const [kpiDetailError, setKpiDetailError] = useState('');
  const [kpiRecordsLoading, setKpiRecordsLoading] = useState(false);
  const [kpiRecordsError, setKpiRecordsError] = useState('');

  useEffect(() => {
    if (!workDiscovery && !triageTarget && !selectedKpiId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setWorkDiscovery(null);
        setTriageTarget(null);
        if (selectedKpiId) {
          setSelectedKpiId(null);
          window.history.pushState({}, '', `/?period=${metricsPeriod}`);
        }
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [workDiscovery, triageTarget, selectedKpiId, metricsPeriod]);

  useEffect(() => {
    let current = true;
    void apiFetch<{ categories: string[]; personas: string[] }>('/api/auth/options')
      .then((options) => {
        if (current) setLoginOptions(options);
      })
      .catch(() => {
        if (current) setError('Login options could not be loaded. Please refresh and try again.');
      });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!user) {
      setCustomerSession(null);
      setCustomerSessionLoading(false);
      setCustomerSessionError('');
      return;
    }
    let current = true;
    setCustomerSessionLoading(true);
    setCustomerSessionError('');
    void apiFetch<{ session: CustomerSession; name?: string; email?: string }>('/api/session', {
      headers: authHeaders(user),
    }).then((response) => {
      if (!current) return;
      const refreshedUser = { ...user, ...response, session: response.session };
      setCustomerSession(response.session);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshedUser));
      setUser(refreshedUser);
    }).catch((sessionError: unknown) => {
      if (!current) return;
      setCustomerSessionError(
        sessionError instanceof Error ? sessionError.message : 'Customer session could not be loaded.',
      );
    }).finally(() => {
      if (current) setCustomerSessionLoading(false);
    });
    return () => { current = false; };
  }, [user?.access_token]);

  useEffect(() => {
    if (!user) return;
    void fetchDashboard(user, true);
  }, [user]);

  useEffect(() => {
    if (!user || activeView !== 'alerts') return;
    let current = true;
    void apiFetch<{ exceptions: DashboardException[]; exception_summary: ExceptionSummary }>(
      `/api/dashboard/exceptions?period=${metricsPeriod}`,
      { headers: authHeaders(user) },
    ).then((payload) => {
      if (!current) return;
      setExceptions(payload.exceptions ?? []);
      setExceptionSummary(payload.exception_summary ?? { critical_exceptions: 0, ucl_breaches: 0, lcl_breaches: 0 });
    }).catch((fetchError: unknown) => {
      if (current) setError(fetchError instanceof Error ? fetchError.message : 'Exceptions could not be loaded.');
    });
    return () => { current = false; };
  }, [user, activeView, metricsPeriod]);

  useEffect(() => {
    const syncRoute = () => {
      const route = getInitialRoute();
      setActiveView(route.view);
      setSelectedKpiId(route.kpiId);
      setSelectedResponsibilityId(route.responsibilityId);
      setSelectedWorkItemId(route.workItemId);
      setSelectedOrderId(route.orderId);
      setSelectedOrderWorkItemId(route.orderWorkItemId);
      setWorkDiscovery(null);
      setTriageTarget(null);
      setMetricsPeriod(route.period);
    };
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setExecutionSearch(processSearch), 250);
    return () => window.clearTimeout(timeout);
  }, [processSearch]);

  useEffect(() => {
    if (!user || !['responsibility-detail', 'work-detail'].includes(activeView) || !selectedResponsibilityId) return;
    let current = true;
    setResponsibilityDetail(null);
    setResponsibilityLoading(true);
    setResponsibilityError('');
    const query = new URLSearchParams();
    if (workStatusFilter) query.set('status', workStatusFilter);
    const queryString = query.toString();
    void apiFetch<{ responsibilities: Responsibility[] }>(
      `/api/dashboard/responsibilities/${encodeURIComponent(selectedResponsibilityId)}${queryString ? `?${queryString}` : ''}`,
      { headers: authHeaders(user) },
    ).then((payload) => {
      if (current) {
        const detail = payload.responsibilities[0] ?? null;
          setResponsibilityDetail(detail);
      }
    }).catch((fetchError: unknown) => {
      if (current) setResponsibilityError(fetchError instanceof Error ? fetchError.message : 'Responsibility details could not be loaded.');
    }).finally(() => {
      if (current) setResponsibilityLoading(false);
    });
    return () => { current = false; };
  }, [user, activeView, selectedResponsibilityId, workStatusFilter]);

  useEffect(() => {
    if (!user || activeView !== 'workflows') return;
    let current = true;
    setProcessExecutionsLoading(true);
    setProcessExecutions([]);
    setProcessExecutionTotal(0);
    setProcessExecutionsError('');
    const query = new URLSearchParams({ limit: '25', offset: '0' });
    if (executionStatus) query.set('status', executionStatus);
    if (executionSearch.trim()) query.set('search', executionSearch.trim());
    if (processFilter.trim()) query.set('process', processFilter.trim());
    if (executionDateFrom) query.set('date_from', executionDateFrom);
    if (executionDateTo) query.set('date_to', executionDateTo);
    void apiFetch<{ items: ProcessExecution[]; total: number }>(
      `/api/dashboard/process-executions?${query.toString()}`,
      { headers: authHeaders(user) },
    ).then((payload) => {
      if (current) {
        setProcessExecutions(payload.items);
        setProcessExecutionTotal(payload.total);
      }
    }).catch((fetchError: unknown) => {
      if (current) setProcessExecutionsError(fetchError instanceof Error ? fetchError.message : 'Filtered process history could not be loaded.');
    }).finally(() => {
      if (current) setProcessExecutionsLoading(false);
    });
    return () => { current = false; };
  }, [user, activeView, executionSearch, executionStatus, processFilter, executionDateFrom, executionDateTo]);

  useEffect(() => {
    if (!user || activeView !== 'overview') return;
    let current = true;
    setKpiListLoading(true);
    setKpiListError('');
    void apiFetch<{ kpis: KpiSummary[] }>(`/api/kpis?period=${metricsPeriod}`, {
      headers: { Authorization: `Bearer ${user.access_token}` },
    }).then((payload) => {
      if (current) setMetricKpis(payload.kpis);
    }).catch((fetchError: unknown) => {
      if (current) setKpiListError(fetchError instanceof Error ? fetchError.message : 'KPI metrics could not be loaded.');
    }).finally(() => {
      if (current) setKpiListLoading(false);
    });
    return () => { current = false; };
  }, [user, activeView, metricsPeriod]);

  useEffect(() => {
    if (!user || activeView !== 'overview' || !selectedKpiId) return;
    let current = true;
    setKpiDetail(null);
    setKpiDetailLoading(true);
    setKpiDetailError('');
    void apiFetch<KpiDetail>(`/api/kpis/${encodeURIComponent(selectedKpiId)}/details?period=${metricsPeriod}&limit=1&offset=0`, {
      headers: { Authorization: `Bearer ${user.access_token}` },
    }).then((detail) => {
      if (current) setKpiDetail(detail);
    }).catch((fetchError: unknown) => {
      if (current) setKpiDetailError(fetchError instanceof Error ? fetchError.message : 'KPI details could not be loaded.');
    }).finally(() => {
      if (current) setKpiDetailLoading(false);
    });
    setKpiRecordsError('');
    return () => { current = false; };
  }, [user, activeView, selectedKpiId, metricsPeriod]);

  const fetchDashboard = async (activeUser: User, showLoading = false) => {
    try {
      if (showLoading) setDashboardLoading(true);
      const payload = await apiFetch<DashboardResponse>('/api/dashboard/persona?include_process_executions=false', {
        headers: { Authorization: `Bearer ${activeUser.access_token}` },
      });
      setDashboard(payload);
      setExceptions(payload.exceptions ?? []);
      setExceptionSummary(payload.exception_summary ?? { critical_exceptions: 0, ucl_breaches: 0, lcl_breaches: 0 });
      setMetricKpis((payload.kpis ?? []).map((kpi) => ({
        kpi_id: kpi.id,
        kpi_name: kpi.name,
        name: kpi.name,
        value: kpi.value,
        target: kpi.target ?? null,
        unit: kpi.unit,
        status: kpi.status ?? 'DEMO / illustrative',
        description: kpi.description,
        period: kpi.period ?? 'Weekly',
        source: kpi.source,
        sample_size: kpi.sample_size ?? 0,
        total_observation_count: kpi.sample_size ?? 0,
        data_available: true,
        availability_message: null,
      })));
    } catch (fetchError) {
      console.error(fetchError);
      if (fetchError instanceof Error && fetchError.message.includes('Sign in')) handleLogout();
      else setError('The dashboard could not load KPI metrics.');
    } finally {
      if (showLoading) setDashboardLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!category || !persona || !username.trim() || !password) {
      setError('Complete all four fields to continue.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const authUser = await apiFetch<User>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password,
          category,
          persona_id: persona,
        }),
      });

      const selectedDesignation = PERSONAS.find((item) => item.value === persona)?.label;
      const nextUser = {
        ...authUser,
        email: authUser.email ?? username.trim(),
        designation: authUser.designation ?? selectedDesignation ?? persona,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonaChange = (selectedPersona: string) => {
    setPersona(selectedPersona);
    setError('');
  };

  const navigateView = (view: DashboardView) => {
    if (view === 'responsibility-detail') return;
    const route = view === 'overview' ? '/' : `/?view=${view}`;
    window.history.pushState({}, '', route);
    setSelectedKpiId(null);
    setSelectedResponsibilityId(null);
    setSelectedWorkItemId(null);
    setSelectedOrderId(null);
    setSelectedOrderWorkItemId(null);
    setWorkDiscovery(null);
    setWorkStatusFilter('');
    setActiveView(view);
  };

  const routerNavigate = useNavigate();

  const [invoiceCreateWorkflow, setInvoiceCreateWorkflow] = useState<OrderMapping | null>(null);

  const openInvoicePage = (path: string, state?: { workflow?: OrderMapping }) => {
    routerNavigate(path, { state });
    setSelectedKpiId(null);
    setSelectedResponsibilityId(null);
    setSelectedWorkItemId(null);
    setSelectedOrderId(null);
    setSelectedOrderWorkItemId(null);
    setWorkDiscovery(null);
    setActiveView('invoices');
  };

  const openKpiDetail = (kpiId: string) => {
    window.history.pushState({}, '', `/kpis/${encodeURIComponent(kpiId)}?period=${metricsPeriod}`);
    setSelectedKpiId(kpiId);
  };

  const openResponsibilityDetail = (responsibilityId: string) => {
    window.history.pushState({}, '', `/responsibilities/${encodeURIComponent(responsibilityId)}`);
    setSelectedResponsibilityId(responsibilityId);
    setSelectedWorkItemId(null);
    setWorkStatusFilter('');
    setActiveView('responsibility-detail');
  };

  const openWorkDetail = (responsibilityId: string, workItemId: string) => {
    window.history.pushState({}, '', `/responsibilities/${encodeURIComponent(responsibilityId)}/work/${encodeURIComponent(workItemId)}`);
    setSelectedResponsibilityId(responsibilityId);
    setSelectedWorkItemId(workItemId);
    setWorkDiscovery(null);
    setTriageNotes('');
    setActiveView('work-detail');
  };

  const openOrderList = () => {
    window.history.pushState({}, '', '/?view=order-list');
    setSelectedOrderId(null);
    setSelectedOrderWorkItemId(null);
    setActiveView('order-list');
  };

  const openOrderWorkItems = (orderId: string) => {
    window.history.pushState({}, '', `/orders/${encodeURIComponent(orderId)}`);
    setSelectedOrderId(orderId);
    setSelectedOrderWorkItemId(null);
    setActiveView('order-work-items');
  };

  const openOrderWorkflow = (orderId: string, workItemId: string) => {
    window.history.pushState({}, '', `/orders/${encodeURIComponent(orderId)}/work/${encodeURIComponent(workItemId)}`);
    setSelectedOrderId(orderId);
    setSelectedOrderWorkItemId(workItemId);
    setActiveView('order-workflow');
  };

  const changeMetricsPeriod = (period: KpiPeriod) => {
    const route = activeView === 'overview' && selectedKpiId
      ? `/kpis/${encodeURIComponent(selectedKpiId)}?period=${period}`
      : activeView === 'overview' ? `/?period=${period}` : `/?view=${activeView}&period=${period}`;
    window.history.replaceState({}, '', route);
    setMetricsPeriod(period);
  };

  const loadMoreKpiRecords = async () => {
    if (!user || !selectedKpiId || !kpiDetail || kpiRecordsLoading) return;
    setKpiRecordsLoading(true);
    setKpiRecordsError('');
    const offset = kpiDetail.records.length;
    try {
      const response = await apiFetch<KpiDetail>(
        `/api/kpis/${encodeURIComponent(selectedKpiId)}/details?period=${metricsPeriod}&limit=10&offset=${offset}`,
        { headers: { Authorization: `Bearer ${user.access_token}` } },
      );
      setKpiDetail((current) => current
        ? { ...current, records: [...current.records, ...response.records] }
        : current);
    } catch (loadError) {
      setKpiRecordsError(loadError instanceof Error ? loadError.message : 'More KPI records could not be loaded.');
    } finally {
      setKpiRecordsLoading(false);
    }
  };

  const loadMoreProcessExecutions = async () => {
    if (!user || processExecutionsLoading) return;
    setProcessExecutionsLoading(true);
    setProcessExecutionsError('');
    const query = new URLSearchParams({ limit: '25', offset: String(processExecutions.length) });
    if (executionStatus) query.set('status', executionStatus);
    if (executionSearch.trim()) query.set('search', executionSearch.trim());
    if (processFilter.trim()) query.set('process', processFilter.trim());
    if (executionDateFrom) query.set('date_from', executionDateFrom);
    if (executionDateTo) query.set('date_to', executionDateTo);
    try {
      const payload = await apiFetch<{ items: ProcessExecution[]; total: number }>(
        `/api/dashboard/process-executions?${query.toString()}`,
        { headers: authHeaders(user) },
      );
      setProcessExecutions((current) => [...current, ...payload.items]);
      setProcessExecutionTotal(payload.total);
    } catch (loadError) {
      setProcessExecutionsError(loadError instanceof Error ? loadError.message : 'More process history could not be loaded.');
    } finally {
      setProcessExecutionsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setDashboard(null);
    setCategory('');
    setPersona('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setError('');
    setKpiDetail(null);
    setSelectedKpiId(null);
    setActiveView('overview');
    setMetricsPeriod('weekly');
    window.history.replaceState({}, '', '/');
  };

  const visibleDashboard = useMemo(() => dashboard ?? null, [dashboard]);
  const viewerName = user?.designation ?? visibleDashboard?.viewer.designation ?? user?.name ?? 'Team member';

  if (!user) {
    return (
      <div className="auth-shell">
        <header className="auth-header">
          <div className="identity-mark" aria-hidden="true">J&amp;J</div>
          <div className="identity-copy">
            <strong>J&amp;J KPI Dashboard</strong>
            <span>Business Performance &amp; Insights</span>
          </div>
          <span className="environment-badge">DEMO</span>
        </header>

        <main className="auth-main">
          <section className="auth-card" aria-labelledby="login-title">
            <div className="form-kicker">Secure workspace access</div>
            <h1 id="login-title">Welcome back</h1>
            <p className="auth-description">Sign in to access your role-specific dashboard.</p>

            <form onSubmit={handleLogin} className="auth-form" noValidate>
              <label>
                Category
                <select value={category} onChange={(event) => setCategory(event.target.value)} required>
                  <option value="" disabled>Select category</option>
                  {loginOptions.categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <small className="field-note">Select the customer category assigned to the user.</small>
              </label>

              <label>
                Persona
                <select value={persona} onChange={(event) => handlePersonaChange(event.target.value)} required>
                  <option value="" disabled>Select your persona</option>
                  {loginOptions.personas.map((item) => (
                    <option key={item} value={item}>
                      {PERSONAS.find((personaOption) => personaOption.value === item)?.label ?? item}
                    </option>
                  ))}
                </select>
                <small className="field-note">Manual username and password entry is required.</small>
              </label>

              <label>
                Username
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter your username"
                  autoComplete="off"
                  required
                />
              </label>

              <label>
                Password
                <span className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="off"
                    required
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
              </label>

              {error && <div className="error-banner" role="alert">{error}</div>}
              <button className="sign-in-button" type="submit" disabled={isLoading}>
                {isLoading ? <><span className="button-spinner" aria-hidden="true" />Signing in</> : <>Sign in <span aria-hidden="true">→</span></>}
              </button>
            </form>

            <p className="selection-note">Demo sign-in accounts are available for all 17 role selections. Source KPI definitions are available for Roles 01–16.</p>
          </section>
          <footer className="auth-footer">DEMO ENVIRONMENT <span aria-hidden="true">·</span> Not configured for corporate identity sign-in</footer>
        </main>
      </div>
    );
  }

  const isRoleOneDemo = user.persona_id === 'role-01' || user.email.toLowerCase() === 'role01@local.dev';
  const isCcManager = user.persona_id === 'role-07' || user.email.toLowerCase() === 'role07@local.dev';
  const responsibilities = visibleDashboard?.responsibility_panel?.items ?? [];
  const isCommunicationResponsibility = false;
  const openCcManagerOrderView = () => {
    window.history.pushState({}, '', '/?view=order-view');
    setSelectedResponsibilityId(null);
    setSelectedWorkItemId(null);
    setWorkStatusFilter('');
    setActiveView('order-view');
  };
  const responsibilityWorkItems = responsibilityDetail?.work_items ?? [];
  const selectedApiWorkItem = responsibilityDetail?.work_items.find((item) => item.work_item_id === selectedWorkItemId);
  const selectedWorkDetail: WorkDetail | null = selectedApiWorkItem
      ? {
          ...selectedApiWorkItem,
          label: selectedApiWorkItem.work_item_name ?? selectedApiWorkItem.work_item,
          type: selectedApiWorkItem.activity_name ?? 'Activity',
          when: selectedApiWorkItem.due_date ?? selectedApiWorkItem.due_at,
          where: selectedApiWorkItem.owner ?? '',
          by: selectedApiWorkItem.owner ?? '',
          to: responsibilityDetail?.responsibility ?? '',
          subject: selectedApiWorkItem.work_item,
          content: selectedApiWorkItem.work_item,
          process: selectedApiWorkItem.activity_name ?? '',
          expectation: selectedApiWorkItem.priority ?? '',
          transcript: [],
        }
      : null;
  const workChatUrl = selectedWorkDetail ? (() => {
    const url = new URL(window.location.href);
    url.port = '8501';
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    url.searchParams.set('work_id', selectedWorkDetail.work_item_id);
    url.searchParams.set('work_item', selectedWorkDetail.work_item);
    url.searchParams.set('work_status', selectedWorkDetail.status);
    url.searchParams.set('customer_request', selectedWorkDetail.customer_request_id);
    return url.href;
  })() : '';
  const displayedExceptions = exceptionFilter === 'critical'
    ? exceptions.filter((exception) => exception.priority.toLowerCase() === 'critical')
    : exceptionFilter === 'ucl'
      ? exceptions.filter((exception) => exception.exception_type.toLowerCase().includes('ucl'))
      : exceptionFilter === 'lcl'
        ? exceptions.filter((exception) => exception.exception_type.toLowerCase().includes('lcl'))
        : exceptions;
  const overviewKpis = isRoleOneDemo ? metricKpis.filter((kpi) => kpi.kpi_id.startsWith('role-01-')) : metricKpis;
  const overviewSlaStatuses = new Map(overviewKpis.map((kpi, index) => [kpi.kpi_id, getOverviewSlaStatus(kpi, index, isRoleOneDemo)]));
  const slaSummary = [
    { status: 'Above SLA' as const, items: overviewKpis.filter((kpi) => overviewSlaStatuses.get(kpi.kpi_id) === 'Above SLA') },
    { status: 'Within SLA' as const, items: overviewKpis.filter((kpi) => overviewSlaStatuses.get(kpi.kpi_id) === 'Within SLA') },
    { status: 'Below SLA' as const, items: overviewKpis.filter((kpi) => overviewSlaStatuses.get(kpi.kpi_id) === 'Below SLA') },
  ];
  const displayedKpis = slaFilter
    ? overviewKpis.filter((kpi) => overviewSlaStatuses.get(kpi.kpi_id) === slaFilter)
    : overviewKpis;
  const selectedKpiTrend = kpiDetail
    ? getKpiTrendData(kpiDetail.kpi_id, kpiDetail.current_value, kpiDetail.direction, kpiDetail.trend_series, kpiDetail.observation_count > 0)
    : null;
  const viewTitles: Record<DashboardView, string> = {
    overview: 'overview',
    responsibilities: 'responsibilities',
    'responsibility-detail': 'responsibility details',
    'work-detail': 'work detail',
    'order-list': 'list of orders',
    'order-work-items': 'order work items',
    'order-workflow': 'workflow details',
    'order-view': 'order view',
    alerts: 'alerts',
    workflows: 'workflows',
    invoices: 'invoice management',
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-mark small">J&amp;J</div>
          <div>
            <strong>Business Services</strong>
            <span>KPI Command Center</span>
          </div>
        </div>

        <nav className="nav">
          {(['overview', 'responsibilities', 'alerts', 'workflows'] as const).map((view) => (
            <button
              key={view}
              className={`nav-item${(activeView === view || (view === 'responsibilities' && ['responsibility-detail', 'work-detail', 'order-list', 'order-work-items', 'order-workflow'].includes(activeView))) ? ' active' : ''}`}
              type="button"
              aria-current={activeView === view || (view === 'responsibilities' && ['responsibility-detail', 'work-detail', 'order-list', 'order-work-items', 'order-workflow'].includes(activeView)) ? 'page' : undefined}
              onClick={() => navigateView(view)}
            >
              {view === 'workflows' ? 'Execution history' : view[0].toUpperCase() + view.slice(1)}
            </button>
          ))}
        </nav>

        <div className="sidebar-section customer-summary-sidebar">
          <h3>Profile Summary</h3>
          {customerSessionLoading && !customerSession ? (
            <p className="session-feedback" role="status">Loading customer session…</p>
          ) : customerSessionError && !customerSession ? (
            <p className="session-feedback session-error" role="alert">{customerSessionError}</p>
          ) : customerSession ? (
            <>
              {customerSessionError && <p className="session-feedback session-error" role="alert">{customerSessionError}</p>}
              <dl className="sidebar-list">
                <div><dt>Customer ID</dt><dd>{customerSession.customer_id}</dd></div>
                <div><dt>Client ID</dt><dd>{customerSession.client_id}</dd></div>
                <div><dt>Customer Name</dt><dd>{customerSession.customer_name}</dd></div>
                <div><dt>Customer Category</dt><dd>{customerSession.customer_category}</dd></div>
                <div><dt>Persona</dt><dd>{customerSession.persona}</dd></div>
                <div><dt>RBAC</dt><dd>{customerSession.rbac_role}</dd></div>
                <div><dt>Policy ID</dt><dd>{customerSession.policy_id}</dd></div>
                <div><dt>CRUD Rights</dt><dd>{customerSession.crud_rights}</dd></div>
                <div><dt>Approve/Reject Rights</dt><dd>{customerSession.approve_reject_rights}</dd></div>
                <div><dt>ITSM Level</dt><dd>{customerSession.itsm_level}</dd></div>
              </dl>
            </>
          ) : null}
        </div>

        {!!user.session?.application_access.length && <div className="sidebar-section">
          <h3>Application Access</h3>
          <div className="sidebar-stack">
            {user.session.application_access.map((item, index) => (
                <div key={`${item.application_name ?? 'app'}-${index}`} className="inline-card">
                  <strong>{item.application_name}</strong>
                  <span>Tenancy ID: {item.tenancy_id}</span>
                  <span>Rights: {item.rights.join(', ')}</span>
                </div>
              ))}
          </div>
        </div>}

        <div className="profile-card">
          <div className="avatar">{viewerName.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{viewerName}</strong>
            <span>{visibleDashboard?.viewer.email ?? user.email}</span>
          </div>
        </div>
      </aside>

      <main className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operational dashboard</p>
            <h2>
              {activeView === 'overview' ? `Hi, ${viewerName}` : `${viewerName}'s ${viewTitles[activeView]}`}
            </h2>
            {activeView === 'overview' && <span className="viewer-designation">{visibleDashboard?.viewer.designation ?? user.designation ?? 'Team member'}</span>}
          </div>
          <div className="topbar-actions">
            <div className="live-status"><span className="live-dot" />{visibleDashboard?.data_source ?? 'DEMO / SYNTHETIC DATA'} <small>{visibleDashboard?.updated_at ? new Date(visibleDashboard.updated_at).toLocaleTimeString() : ''}</small></div>
            <button className="secondary-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </header>

        {error && <div className="error-banner inline">{error}</div>}

        {dashboardLoading && activeView !== 'invoices' ? (
          <div className="loading-panel">Loading KPI data…</div>
        ) : (
          <>
            {activeView === 'overview' && (
              <>
                <section className="panel-card details-panel priority-panel overview-kpi-section">
                  <div className="panel-heading overview-kpi-heading">
                    <div>
                      <h3>Key Performance Indicators</h3>
                      <p>Select a KPI to view its current result, normal reference, and trend.</p>
                    </div>
                    <label className="period-picker">
                      Time period
                      <select
                        value={metricsPeriod}
                        onChange={(event) => {
                          const period = KPI_PERIODS.find((item) => item === event.target.value);
                          if (period) changeMetricsPeriod(period);
                        }}
                      >
                        {KPI_PERIODS.map((period) => <option key={period} value={period}>{period[0].toUpperCase() + period.slice(1)}</option>)}
                      </select>
                    </label>
                  </div>

                <section className="kpi-status-section" aria-labelledby="kpi-status-title">
                  <div className="kpi-status-heading">
                    <h4 id="kpi-status-title">KPI Status</h4>
                    <span>Choose a status to filter the KPIs below</span>
                  </div>
                  <div className="kpi-sla-summary">
                  {slaSummary.map(({ status, items }) => (
                    <button
                      className={`kpi-sla-summary-card ${status === 'Above SLA' ? 'above' : status === 'Below SLA' ? 'below' : 'within'}${slaFilter === status ? ' selected' : ''}`}
                      key={status}
                      type="button"
                      aria-pressed={slaFilter === status}
                      onClick={() => setSlaFilter((current) => current === status ? null : status)}
                    >
                      <div><strong>{status}</strong><span>{items.length}</span></div>
                      <p>{slaFilter === status ? 'Click to show all KPIs' : 'Click to view matching KPIs'}</p>
                    </button>
                  ))}
                  </div>
                </section>
                <p className="kpi-sla-note">Uses configured targets where available; otherwise the synthetic team average is the demo reference, not an approved SLA.</p>

                <div className="kpi-list-heading">
                  <h4>{slaFilter ? `${slaFilter} KPIs` : 'KPIs'}</h4>
                  {slaFilter && <button className="text-button" type="button" onClick={() => setSlaFilter(null)}>Show all KPIs</button>}
                </div>
                {kpiListLoading && !metricKpis.length ? (
                  <div className="loading-panel">Loading KPI metrics…</div>
                ) : kpiListError ? (
                  <div className="error-banner" role="alert">{kpiListError}</div>
                ) : displayedKpis.length ? (
                  <div className="priority-kpi-list">
                    {displayedKpis.map((kpi) => {
                      const status = getKpiStatus(kpi.value, kpi.target);
                      const trend = getKpiTrendData(kpi.kpi_id, kpi.value, kpi.direction, kpi.trend_series, kpi.sample_size > 0);
                      return (
                        <button
                          className={`priority-kpi-card${selectedKpiId === kpi.kpi_id ? ' selected' : ''}`}
                          key={kpi.kpi_id}
                          type="button"
                          aria-pressed={selectedKpiId === kpi.kpi_id}
                          onClick={() => openKpiDetail(kpi.kpi_id)}
                        >
                          <span className="priority-kpi-info">
                            <strong>{kpi.kpi_name}</strong>
                            <small className={`kpi-normal-status ${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</small>
                            <small>
                              {getKpiTrend(trend.series, trend.direction)}
                              {trend.illustrative && ' · Illustrative demo'}
                            </small>
                          </span>
                          <strong className="priority-kpi-value">{formatKpiValue(kpi.value, kpi.unit)}</strong>
                          <small>Normal reference: {kpi.target === null ? 'Not supplied' : formatKpiValue(kpi.target, kpi.unit)}</small>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    {slaFilter ? `No KPIs currently compare as ${slaFilter} for this period.` : 'No KPI metrics available for this role and period.'}
                  </div>
                )}

              </section>
              </>
            )}

            {activeView === 'responsibilities' && (
              <section className="panel-card details-panel">
                <div className="panel-heading">
                  <h3>{visibleDashboard?.responsibility_panel?.title ?? 'Responsibilities'}</h3>
                </div>
                <div className="responsibility-list">
                  <button className="responsibility-card" type="button" onClick={openOrderList}>
                    <strong>List of Orders</strong>
                    <small>Review demo orders and their workflow work items.</small>
                    <span>Orders · Work items · Workflow details</span>
                  </button>
                  {isCcManager && <button className="responsibility-card" type="button" onClick={openCcManagerOrderView}>
                    <strong>Order View</strong>
                    <small>Review connected communications, purchase orders, and invoice workflow.</small>
                    <span>Order workflow · Purchase order validation · Invoice creation</span>
                  </button>}
                  {responsibilities.length ? (
                    responsibilities.map((item) => (
                      <button key={item.responsibility_id} className="responsibility-card" type="button" onClick={() => openResponsibilityDetail(item.responsibility_id)}>
                        <strong>{item.responsibility}</strong>
                        <small>{item.activity_name ?? item.metric_name} · {item.work_item_count} work items · Owner: {item.owner} · Due: {item.due_date}</small>
                        <span>Status: {item.status_counts.Pending ?? 0} pending · Priority: {item.priority}</span>
                      </button>
                    ))
                  ) : (
                    <div className="empty-state">No responsibilities configured.</div>
                  )}
                </div>
              </section>
            )}

            {activeView === 'order-list' && <OrderList onSelectOrder={openOrderWorkItems} onBack={() => navigateView('responsibilities')} />}

            {activeView === 'invoices' && <InvoiceModule accessToken={user.access_token} />}

            {activeView === 'order-work-items' && selectedOrderId && <OrderWorkItems order={DEMO_ORDERS.find((item) => item.order_id === selectedOrderId) ?? DEMO_ORDERS[0]} onSelectWorkItem={(workItemId) => openOrderWorkflow(selectedOrderId, workItemId)} onBack={openOrderList} />}

            {activeView === 'order-workflow' && selectedOrderId && selectedOrderWorkItemId && <DemoWorkflowDetails order={DEMO_ORDERS.find((item) => item.order_id === selectedOrderId) ?? DEMO_ORDERS[0]} workItemId={selectedOrderWorkItemId} onBack={() => openOrderWorkItems(selectedOrderId)} />}

            {activeView === 'order-view' && isCcManager && (
              <section className="panel-card details-panel">
                <div className="work-breadcrumbs"><button className="breadcrumb-button" type="button" onClick={() => navigateView('responsibilities')}>Responsibilities</button><span aria-hidden="true">/</span><span>Order View</span></div>
                <OrderView accessToken={user.access_token} />
              </section>
            )}

            {(activeView === 'responsibility-detail' || activeView === 'work-detail') && (
              <section className="panel-card details-panel">
                <div className="work-breadcrumbs">
                  <button className="breadcrumb-button" type="button" onClick={() => navigateView('responsibilities')}>Responsibilities</button>
                  <span aria-hidden="true">/</span>
                  {activeView === 'work-detail'
                    ? <button className="breadcrumb-button" type="button" onClick={() => openResponsibilityDetail(selectedResponsibilityId ?? '')}>{responsibilityDetail?.responsibility ?? 'Responsibility'}</button>
                    : <span>{responsibilityDetail?.responsibility ?? 'Responsibility'}</span>}
                  {activeView === 'work-detail' && <><span aria-hidden="true">/</span><span>{selectedWorkDetail?.label ?? 'Work detail'}</span></>}
                </div>
                {responsibilityLoading ? <div className="loading-panel">Loading responsibility…</div> : responsibilityError ? (
                  <div className="error-banner" role="alert">{responsibilityError}</div>
                ) : responsibilityDetail ? (
                  <>
                    {isCommunicationResponsibility && selectedWorkDetail ? (
                      <>
                        <div className="panel-heading"><div><p className="eyebrow">Communication responsibility</p><h3>{responsibilityDetail.responsibility}</h3></div></div>
                        <div className="communication-inline-portal">
                          {selectedWorkDetail.type === 'Email' && <EmailDiscoveryPortal workItem={{ work_item_id: selectedWorkDetail.work_item_id, work_item: selectedWorkDetail.work_item, customer_request_id: selectedWorkDetail.customer_request_id, label: selectedWorkDetail.label }} onInvoiceAction={(action, mapping) => action === 'create' ? setInvoiceCreateWorkflow(mapping) : openInvoicePage(action === 'edit' ? `/invoices/${mapping.invoiceId}/edit` : `/invoices/${mapping.invoiceId}/view`)} />}
                          {selectedWorkDetail.type === 'Chat' && <ChatDiscoveryPortal workItem={{ work_item_id: selectedWorkDetail.work_item_id, work_item: selectedWorkDetail.work_item, customer_request_id: selectedWorkDetail.customer_request_id, label: selectedWorkDetail.label }} />}
                          {selectedWorkDetail.type === 'Voice' && <VoiceDiscoveryPortal workItem={{ work_item_id: selectedWorkDetail.work_item_id, work_item: selectedWorkDetail.work_item, customer_request_id: selectedWorkDetail.customer_request_id, label: selectedWorkDetail.label }} />}
                          {selectedWorkDetail.type === 'Document' && <DocumentDiscoveryPortal workItem={{ work_item_id: selectedWorkDetail.work_item_id, work_item: selectedWorkDetail.work_item, customer_request_id: selectedWorkDetail.customer_request_id, label: selectedWorkDetail.label }} />}
                        </div>
                        <section className="work-content-section">
                          <h4 className="section-title">Actions</h4>
                          <div className="discovery-actions">
                            <button className="work-chat-button" type="button" onClick={() => { setTriageTarget('Order Management'); setTriageSaved(false); }}>Triage to Order Management</button>
                            <button className="work-chat-button" type="button" onClick={() => { setTriageTarget('Case Management'); setTriageSaved(false); }}>Triage to Case Management</button>
                          </div>
                        </section>
                      </>
                    ) : activeView === 'responsibility-detail' ? (
                      <>
                        <div className="panel-heading"><div><p className="eyebrow">Responsibility details</p><h3>{responsibilityDetail.responsibility}</h3><p>{responsibilityDetail.activity_name ?? responsibilityDetail.metric_name}</p></div></div>
                        <>
                          <dl className="definition-list compact-definition"><div><dt>Metric formula</dt><dd>{responsibilityDetail.formula}</dd></div></dl>
                          <div className="responsibility-status-grid">
                            {['Pending', 'In Progress', 'Completed', 'Blocked', 'Overdue'].map((status) => (
                              <button key={status} type="button" className={`mini-card status-filter-card${workStatusFilter === status ? ' selected' : ''}`} onClick={() => setWorkStatusFilter((current) => current === status ? '' : status)}>
                                <span>{status}</span><strong>{responsibilityDetail.status_counts[status] ?? 0}</strong>
                              </button>
                            ))}
                          </div>
                          <div className="panel-heading current-work-heading">
                            <div>
                              <h4 className="section-title">Current Work</h4>
                              <p>Select a work item to view its details and related communication.</p>
                            </div>
                            {workStatusFilter && <button className="text-button" type="button" onClick={() => setWorkStatusFilter('')}>Show all statuses</button>}
                          </div>
                          <div className="work-items-list">
                            {responsibilityWorkItems.map((item) => {
                              const label = item.work_item_name ?? item.work_item;
                              return (
                                <button className="work-item-row work-item-open" key={item.work_item_id} type="button" onClick={() => openWorkDetail(responsibilityDetail.responsibility_id, item.work_item_id)}>
                                  <span className="work-item-description">
                                    <strong>{item.work_item}</strong>
                                    <small>{item.activity_name} · Owner: {item.owner} · Priority: {item.priority} · Due {item.due_date}</small>
                                  </span>
                                  <em className={`work-item-status status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</em>
                                </button>
                              );
                            })}
                            {!responsibilityWorkItems.length && <div className="empty-state">No work items match this status.</div>}
                          </div>
                        </>
                      </>
                    ) : selectedWorkDetail ? (
                      <>
                        <ResponsibilityWorkflowDetails workItem={selectedWorkDetail} onBack={() => openResponsibilityDetail(selectedResponsibilityId ?? '')} />
                        <div className="legacy-work-detail">
                        <h4 className="section-title">Work Item Details</h4>
                        <div className="panel-heading">
                          <div><p className="eyebrow">{responsibilityDetail.responsibility}</p><h3>{selectedWorkDetail.label} — {selectedWorkDetail.work_item}</h3></div>
                          <span className={`work-item-status status-${selectedWorkDetail.status.toLowerCase().replace(/\s+/g, '-')}`}>{selectedWorkDetail.status}</span>
                        </div>
                        <h4 className="section-title">Work Information</h4>
                        <dl className="work-detail-grid">
                          <div><dt>Work</dt><dd>{selectedWorkDetail.label}</dd></div>
                          <div><dt>Type</dt><dd>{selectedWorkDetail.type}</dd></div>
                          <div><dt>Status</dt><dd>{selectedWorkDetail.status === 'In Progress' ? 'Open / In Progress' : selectedWorkDetail.status}</dd></div>
                          <div><dt>When</dt><dd>{selectedWorkDetail.when}</dd></div>
                          <div><dt>Where</dt><dd>{selectedWorkDetail.where}</dd></div>
                          <div><dt>By</dt><dd>{selectedWorkDetail.by}</dd></div>
                          <div><dt>To</dt><dd>{selectedWorkDetail.to}</dd></div>
                          <div><dt>Subject</dt><dd>{selectedWorkDetail.subject}</dd></div>
                          <div><dt>Process</dt><dd>{selectedWorkDetail.process}</dd></div>
                          <div><dt>Expected Time</dt><dd>{selectedWorkDetail.expectation}</dd></div>
                        </dl>
                        <section className="work-content-section">
                          <h4 className="section-title">Customer Details</h4>
                          <dl className="work-detail-grid">
                            <div><dt>Customer Request</dt><dd>{selectedWorkDetail.customer_request_id}</dd></div>
                            <div><dt>Customer</dt><dd>{selectedWorkDetail.by}</dd></div>
                            <div><dt>Channel</dt><dd>{selectedWorkDetail.type}</dd></div>
                            <div><dt>Assigned To</dt><dd>{selectedWorkDetail.to}</dd></div>
                          </dl>
                        </section>
                        <section className="work-content-section">
                          <h4 className="section-title">Content</h4>
                          <p>{selectedWorkDetail.content}</p>
                        </section>
                        <section className="work-content-section">
                          <h4 className="section-title">Transcript</h4>
                          {selectedWorkDetail.transcript.length ? selectedWorkDetail.transcript.map((line, index) => (
                            <p className="transcript-line" key={`${line.speaker}-${index}`}><strong>{line.speaker}:</strong> “{line.text}”</p>
                          )) : <p className="panel-description">No transcript is available for this demo work item.</p>}
                        </section>
                        <section className="work-content-section">
                          <h4 className="section-title">Related Communication</h4>
                          <div className="discovery-actions">
                            {selectedWorkDetail.type === 'Email' ? (
                              <button className="secondary-btn" type="button" onClick={() => setWorkDiscovery('email')}>Open Email Discovery</button>
                            ) : selectedWorkDetail.type === 'Chat' ? (
                              <button className="secondary-btn" type="button" onClick={() => setWorkDiscovery('chat-list')}>Open Chat Discovery</button>
                            ) : selectedWorkDetail.type === 'Voice' ? (
                              <><button className="secondary-btn" type="button" onClick={() => setWorkDiscovery('voice')}>Open Voice Discovery</button><button className="secondary-btn" type="button" onClick={() => setWorkDiscovery('chat-list')}>Open Chat Discovery</button><button className="secondary-btn" type="button" onClick={() => setWorkDiscovery('email')}>Open Email Discovery</button></>
                            ) : selectedWorkDetail.type === 'Document' ? (
                              <><button className="secondary-btn" type="button" onClick={() => setWorkDiscovery('document')}>Open Document Discovery</button><button className="secondary-btn" type="button" onClick={() => setWorkDiscovery('chat-list')}>Open Chat Discovery</button><button className="secondary-btn" type="button" onClick={() => setWorkDiscovery('email')}>Open Email Discovery</button></>
                            ) : (
                              <>
                                <button className="secondary-btn" type="button" onClick={() => setWorkDiscovery('chat')}>Open Chat Discovery</button>
                                <button className="secondary-btn" type="button" onClick={() => setWorkDiscovery('email')}>Open Email Discovery</button>
                              </>
                            )}
                          </div>
                        </section>
                        <section className="work-content-section">
                          <h4 className="section-title">Actions</h4>
                          <div className="discovery-actions">
                            <button className="work-chat-button" type="button" onClick={() => { setTriageTarget('Order Management'); setTriageSaved(false); }}>Triage to Order Management</button>
                            <button className="work-chat-button" type="button" onClick={() => { setTriageTarget('Case Management'); setTriageSaved(false); }}>Triage to Case Management</button>
                          </div>
                        </section>
                        </div>
                      </>
                    ) : <div className="empty-state">This work item is not available.</div>}
                  </>
                ) : <div className="empty-state">Responsibility is not available.</div>}
              </section>
            )}

            {activeView === 'workflows' && <>
            <section className="panel-card details-panel">
              <div className="panel-heading execution-heading">
                <div>
                  <h3>Process Execution History</h3>
                  <p>Completed duration excludes unfinished work; active work shows elapsed time.</p>
                </div>
                <label className="execution-search">
                  Search
                  <input value={processSearch} onChange={(event) => setProcessSearch(event.target.value)} placeholder="Request, process, task, status" />
                </label>
                <label className="execution-search">
                  Status
                  <select value={executionStatus} onChange={(event) => setExecutionStatus(event.target.value)}>
                    <option value="">All statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </label>
                <label className="execution-search">
                  Process
                  <input value={processFilter} onChange={(event) => setProcessFilter(event.target.value)} placeholder="Filter process" />
                </label>
                <label className="execution-search">
                  From
                  <input type="date" value={executionDateFrom} onChange={(event) => setExecutionDateFrom(event.target.value)} />
                </label>
                <label className="execution-search">
                  To
                  <input type="date" value={executionDateTo} onChange={(event) => setExecutionDateTo(event.target.value)} />
                </label>
              </div>
              {processExecutionsError && <div className="error-banner" role="alert">{processExecutionsError}</div>}
              {processExecutionsLoading && !processExecutions.length && <div className="loading-panel">Loading filtered process history…</div>}
              <div className="table-scroll">
                <table className="execution-table">
                  <thead>
                    <tr><th>Request</th><th>Process / task</th><th>Status</th><th>Duration</th><th>SLA</th><th>Alert</th></tr>
                  </thead>
                  <tbody>
                    {processExecutions.map((execution) => {
                      const observedMinutes = execution.duration_minutes ?? execution.elapsed_minutes ?? 0;
                      const breached = observedMinutes > execution.sla_target_minutes;
                      return (
                        <tr key={execution.process_execution_id}>
                          <td>{execution.customer_request_id}</td>
                          <td>
                            <details>
                              <summary>{execution.process_name}</summary>
                              <small>{execution.task_name} · {execution.process_execution_id}</small>
                              {execution.retry_count > 0 && <small>Retry count: {execution.retry_count}</small>}
                              {execution.failure_reason && <small>{execution.failure_reason}</small>}
                            </details>
                          </td>
                          <td>{execution.status}</td>
                          <td>{execution.status === 'Pending' ? 'Not started' : execution.duration_minutes === null ? `${execution.elapsed_minutes ?? 0} min elapsed` : `${execution.duration_minutes} min`}</td>
                          <td>{execution.status === 'Pending' ? 'SLA timing not started' : `${breached ? 'Over SLA' : 'Within SLA'} · ${execution.sla_target_minutes} min`}</td>
                          <td>{execution.alert_id ?? 'None'}</td>
                        </tr>
                      );
                    })}
                    {!processExecutions.length && !processExecutionsLoading && <tr><td colSpan={6}>No process executions match these filters.</td></tr>}
                  </tbody>
                </table>
              </div>
              {processExecutions.length < processExecutionTotal && (
                <button className="load-more-records" type="button" onClick={() => void loadMoreProcessExecutions()} disabled={processExecutionsLoading}>
                  {processExecutionsLoading ? 'Loading…' : `Load more (${processExecutions.length} of ${processExecutionTotal})`}
                </button>
              )}
            </section>
            </>}

            {activeView === 'alerts' && <section className="panel-card details-panel">
              <div className="panel-heading overview-kpi-heading">
                <div><h3>Exception Status Panel</h3><p>Analysis worksheet exceptions scoped to {visibleDashboard?.viewer.designation ?? user.designation ?? 'your persona'}.</p></div>
                <label className="period-picker">
                  Time period
                  <select value={metricsPeriod} onChange={(event) => { const period = KPI_PERIODS.find((item) => item === event.target.value); if (period) changeMetricsPeriod(period); }}>
                    {KPI_PERIODS.map((period) => <option key={period} value={period}>{period[0].toUpperCase() + period.slice(1)}</option>)}
                  </select>
                </label>
              </div>
              <div className="exception-summary-grid">
                {[
                  { key: 'critical' as const, label: 'Critical exceptions', value: exceptionSummary.critical_exceptions, className: 'critical' },
                  { key: 'ucl' as const, label: 'UCL breaches', value: exceptionSummary.ucl_breaches, className: 'ucl' },
                  { key: 'lcl' as const, label: 'LCL breaches', value: exceptionSummary.lcl_breaches, className: 'lcl' },
                ].map((item) => (
                  <button key={item.key} type="button" className={`exception-summary-card ${item.className}${exceptionFilter === item.key ? ' selected' : ''}`} aria-pressed={exceptionFilter === item.key} onClick={() => setExceptionFilter((current) => current === item.key ? null : item.key)}>
                    <span>{item.label}</span><strong>{item.value}</strong><small>{exceptionFilter === item.key ? 'Click to show all exceptions' : 'Click to filter exceptions'}</small>
                  </button>
                ))}
              </div>
              <div className="kpi-list-heading"><h4>{exceptionFilter ? `${exceptionFilter === 'ucl' ? 'UCL' : exceptionFilter === 'lcl' ? 'LCL' : 'Critical'} exceptions` : 'All exceptions'}</h4>{exceptionFilter && <button className="text-button" type="button" onClick={() => setExceptionFilter(null)}>Show all exceptions</button>}</div>
              {displayedExceptions.length ? (
                <div className="table-scroll">
                  <table className="execution-table">
                    <thead><tr><th>Exception</th><th>Process</th><th>Status / type</th><th>Measured</th><th>Limits</th><th>Variance</th><th>Impact</th><th>Priority / urgency</th><th>Assignment / action</th><th>Date</th></tr></thead>
                    <tbody>{displayedExceptions.map((exception) => <tr key={exception.exception_id}>
                      <td><strong>{exception.exception_id}</strong><small>{exception.process_id}</small></td>
                      <td>{exception.process_name}</td>
                      <td>{exception.workflow_status}<small>{exception.exception_type}</small></td>
                      <td>{exception.measured_value}</td>
                      <td>LCL {exception.lcl}<br />UCL {exception.ucl}</td>
                      <td>{exception.variance}</td>
                      <td>{exception.impact.toLocaleString()}</td>
                      <td><strong>{exception.priority}</strong><small>{exception.urgency}</small></td>
                      <td>{exception.assignment_group}<small>{exception.action_required}</small></td>
                      <td>{exception.exception_date}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              ) : <div className="empty-state">No Analysis exceptions match this persona and period.</div>}
            </section>}
          </>
        )}
      </main>
      {selectedKpiId && activeView === 'overview' && (
        <div className="chat-dialog-backdrop kpi-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedKpiId(null);
            window.history.pushState({}, '', `/?period=${metricsPeriod}`);
          }
        }}>
          <section className="kpi-dialog" role="dialog" aria-modal="true" aria-labelledby="kpi-dialog-title">
            <header className="chat-dialog-header">
              <div>
                <p className="eyebrow">{kpiDetail?.period ?? metricsPeriod} · {visibleDashboard?.persona ?? user.persona_id}</p>
                <h2 id="kpi-dialog-title">{kpiDetail?.kpi_name ?? metricKpis.find((item) => item.kpi_id === selectedKpiId)?.kpi_name ?? 'KPI details'}</h2>
              </div>
              <button
                className="chat-dialog-close"
                type="button"
                aria-label="Close KPI details"
                autoFocus
                onClick={() => {
                  setSelectedKpiId(null);
                  window.history.pushState({}, '', `/?period=${metricsPeriod}`);
                }}
              >
                ×
              </button>
            </header>
            <div className="kpi-dialog-content">
              {kpiDetailLoading ? (
                <div className="loading-panel">Loading KPI details…</div>
              ) : kpiDetailError ? (
                <div className="error-banner" role="alert">{kpiDetailError}</div>
              ) : kpiDetail ? (
                <>
                  <div className="kpi-summary-cards">
                    <article><span>Current value</span><strong>{formatKpiValue(kpiDetail.current_value, kpiDetail.unit)}</strong></article>
                    <article><span>Reference value</span><strong>Not configured</strong><small>No separate reference value is supplied.</small></article>
                    <article><span>Average team value</span><strong>{formatKpiValue(kpiDetail.team_average, kpiDetail.unit)}</strong><small>{kpiDetail.team_average_label ?? 'Team average unavailable'}</small></article>
                    <article><span>Target value</span><strong>{kpiDetail.target === null ? 'Not configured' : formatKpiValue(kpiDetail.target, kpiDetail.unit)}</strong><small>{kpiDetail.target_source ?? 'No approved SLA target supplied.'}</small></article>
                    <article><span>SLA status</span><strong>{getKpiSlaStatus({ value: kpiDetail.current_value, target: kpiDetail.target, team_average: kpiDetail.team_average, direction: kpiDetail.direction }) ?? 'Not available'}</strong></article>
                    <article><span>Trend direction · {kpiDetail.period}</span><strong>{selectedKpiTrend ? getKpiTrend(selectedKpiTrend.series, selectedKpiTrend.direction) : 'Trend unavailable'}{selectedKpiTrend?.illustrative ? ' · Illustrative demo' : ''}</strong></article>
                  </div>
                  {!kpiDetail.data_available && (
                    <div className="empty-state period-empty-state" role="status">
                      {kpiDetail.availability_message ?? 'Demo data not available for this period'}
                    </div>
                  )}
                  <section className="compact-trend-section kpi-dialog-chart">
                    <div className="panel-heading">
                      <div><h3>KPI trend</h3><p>{kpiDetail.period} · {kpiDetail.observation_count} observations</p></div>
                    </div>
                    <TrendChart series={selectedKpiTrend?.series ?? kpiDetail.trend_series} unit={kpiDetail.unit} />
                  </section>
                  <TargetDriverImpactSection detail={kpiDetail} />
                </>
              ) : (
                <div className="empty-state">KPI details are not available for the selected period.</div>
              )}
            </div>
          </section>
        </div>
      )}
      {workDiscovery && selectedWorkDetail && (
        <div className="chat-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setWorkDiscovery(null);
        }}>
          <section className={`chat-dialog${workDiscovery === 'chat' ? '' : ' email-dialog'}`} role="dialog" aria-modal="true" aria-labelledby="chat-dialog-title">
            <header className="chat-dialog-header">
              <div>
                <p className="eyebrow">{selectedWorkDetail.label} · {selectedWorkDetail.customer_request_id} · {selectedWorkDetail.status}</p>
                <h2 id="chat-dialog-title">{workDiscovery === 'chat' || workDiscovery === 'chat-list' ? 'Chat Discovery' : workDiscovery === 'voice' ? 'Voice Discovery' : workDiscovery === 'document' ? 'Document Discovery' : 'Email Discovery'}</h2>
              </div>
              <button className="chat-dialog-close" type="button" aria-label="Close discovery dialog" autoFocus onClick={() => setWorkDiscovery(null)}>×</button>
            </header>
            {workDiscovery === 'chat' ? (
              <iframe key={selectedWorkDetail.work_item_id} className="chat-dialog-frame" src={workChatUrl} title="Chat Discovery document assistant" />
            ) : (
              <div className="email-dialog-content">
                {workDiscovery === 'email' && <EmailDiscoveryPortal workItem={{ work_item_id: selectedWorkDetail.work_item_id, work_item: selectedWorkDetail.work_item, customer_request_id: selectedWorkDetail.customer_request_id, label: selectedWorkDetail.label }} onInvoiceAction={(action, mapping) => action === 'create' ? setInvoiceCreateWorkflow(mapping) : openInvoicePage(action === 'edit' ? `/invoices/${mapping.invoiceId}/edit` : `/invoices/${mapping.invoiceId}/view`)} />}
                {workDiscovery === 'chat-list' && <ChatDiscoveryPortal workItem={{ work_item_id: selectedWorkDetail.work_item_id, work_item: selectedWorkDetail.work_item, customer_request_id: selectedWorkDetail.customer_request_id, label: selectedWorkDetail.label }} />}
                {workDiscovery === 'voice' && <VoiceDiscoveryPortal workItem={{ work_item_id: selectedWorkDetail.work_item_id, work_item: selectedWorkDetail.work_item, customer_request_id: selectedWorkDetail.customer_request_id, label: selectedWorkDetail.label }} />}
                {workDiscovery === 'document' && <DocumentDiscoveryPortal workItem={{ work_item_id: selectedWorkDetail.work_item_id, work_item: selectedWorkDetail.work_item, customer_request_id: selectedWorkDetail.customer_request_id, label: selectedWorkDetail.label }} />}
              </div>
            )}
          </section>
        </div>
      )}
      {triageTarget && selectedWorkDetail && (
        <div className="chat-dialog-backdrop triage-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setTriageTarget(null);
        }}>
          <form className="triage-dialog" role="dialog" aria-modal="true" aria-labelledby="triage-title" onSubmit={(event) => {
            event.preventDefault();
            setTriageSaved(true);
          }}>
            <header className="chat-dialog-header">
              <div><p className="eyebrow">{selectedWorkDetail.label} · {selectedWorkDetail.customer_request_id}</p><h2 id="triage-title">Triage to {triageTarget}</h2></div>
              <button className="chat-dialog-close" type="button" aria-label="Close triage form" onClick={() => setTriageTarget(null)}>×</button>
            </header>
            <label className="triage-notes-label">Notes
              <textarea value={triageNotes} onChange={(event) => { setTriageNotes(event.target.value); setTriageSaved(false); }} placeholder="Add demo triage notes" rows={4} />
            </label>
            {triageSaved && <p className="triage-saved" role="status">Demo triage saved locally for {triageTarget}.</p>}
            <div className="discovery-actions triage-actions">
              <button className="work-chat-button" type="button" onClick={() => setTriageTarget(null)}>Cancel</button>
              <button className="secondary-btn" type="submit">Save demo triage</button>
            </div>
          </form>
        </div>
      )}
      <InvoiceCreateDialog
        workflow={invoiceCreateWorkflow}
        onClose={() => setInvoiceCreateWorkflow(null)}
      />
    </div>
  );
}
