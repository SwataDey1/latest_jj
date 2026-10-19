import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { API_BASE } from './api';

export const SELLER = {
  name: 'Mentor Worldwide, LLC',
  address: 'Irvine, CA 92618, USA',
  customerService: '(800) 235-5731',
};

export type CatalogProduct = { product_id: string; category: string; family: string; name: string };

export type OrderInvoiceData = {
  order_id: string;
  invoice_id: string;
  company: string;
  customer: string;
  order_date: string;
  billing_address: string;
  shipping_address: string;
  hts_code: string;
  contact_details: string;
  po_number: string;
  order_description: string;
  invoice_status: string;
  invoice_amount: string;
};

export type SavedUsInvoice = { invoiceNumber: string; total: number };

type Line = { key: number; productId: string; description: string; htsCode: string; quantity: string; unitPrice: string };

type Header = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  orderId: string;
  orderDate: string;
  poNumber: string;
  company: string;
  attention: string;
  contactDetails: string;
  billingAddress: string;
  shipToName: string;
  shippingAddress: string;
  discount: string;
  salesTaxRate: string;
  shipping: string;
  notes: string;
};

let lineKey = 0;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (isoDate: string, days: number) => {
  const value = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(value.getTime())) return '';
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
const usd = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const num = (value: string) => (value.trim() === '' ? 0 : Number(value));

const headerFrom = (data: OrderInvoiceData): Header => {
  const invoiceDate = today();
  return {
    invoiceNumber: data.invoice_id,
    invoiceDate,
    dueDate: addDays(invoiceDate, 30),
    paymentTerms: 'Net 30',
    orderId: data.order_id,
    orderDate: data.order_date,
    poNumber: data.po_number,
    company: data.company,
    attention: data.customer,
    contactDetails: data.contact_details,
    billingAddress: data.billing_address,
    shipToName: data.company,
    shippingAddress: data.shipping_address || data.billing_address,
    discount: '0',
    salesTaxRate: '0',
    shipping: '0',
    notes: 'Please remit payment in U.S. dollars and reference the invoice number with your payment.',
  };
};

const linesFrom = (data: OrderInvoiceData): Line[] => {
  const amount = Number(data.invoice_amount);
  return [{
    key: ++lineKey,
    productId: '',
    description: data.order_description,
    htsCode: data.hts_code,
    quantity: '1',
    unitPrice: amount > 0 ? String(amount) : '',
  }];
};

type Props = {
  orderId: string;
  title: string;
  onCancel: () => void;
  onSaved: (invoice: SavedUsInvoice) => void;
};

export default function UsInvoiceForm({ orderId, title, onCancel, onSaved }: Props) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [header, setHeader] = useState<Header | null>(null);
  const [htsCode, setHtsCode] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    const getJson = async <T,>(path: string): Promise<T> => {
      const response = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
      if (!response.ok) {
        const detail = await response.json().then((body: { detail?: unknown }) => body.detail).catch(() => undefined);
        // FastAPI's generic "Not Found" means the route itself is missing (backend running older code).
        if (response.status === 404 && detail === 'Not Found') throw new Error('The invoice data service is unavailable. Restart the backend server to load the latest API.');
        throw new Error(typeof detail === 'string' ? detail : `Request failed (${response.status}).`);
      }
      return response.json() as Promise<T>;
    };
    setHeader(null);
    setLoadError('');
    Promise.all([
      getJson<OrderInvoiceData>(`/api/order-invoice/${encodeURIComponent(orderId)}`),
      getJson<CatalogProduct[]>('/api/product-catalog'),
    ]).then(([data, catalog]) => {
      setProducts(catalog);
      setHeader(headerFrom(data));
      setHtsCode(data.hts_code);
      setLines(linesFrom(data));
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Invoice data could not be loaded.');
    });
    return () => controller.abort();
  }, [orderId]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + num(line.quantity) * num(line.unitPrice), 0);
    const discount = header ? num(header.discount) : 0;
    const taxable = Math.max(subtotal - discount, 0);
    const salesTax = header ? Math.round(taxable * num(header.salesTaxRate)) / 100 : 0;
    const shipping = header ? num(header.shipping) : 0;
    return { subtotal, discount, taxable, salesTax, shipping, total: taxable + salesTax + shipping };
  }, [lines, header]);

  if (loadError) return <Alert severity="error">{loadError}</Alert>;
  if (!header) return <Typography color="text.secondary" role="status">Loading invoice data…</Typography>;

  const setField = (field: keyof Header) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setHeader((current) => current && ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const updateLine = (key: number, patch: Partial<Line>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([name]) => !name.startsWith(`line-${key}-`))));
  };
  const selectProduct = (key: number, productId: string) => {
    const product = products.find((item) => item.product_id === productId);
    updateLine(key, { productId, description: product ? product.name : '' });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!header.invoiceDate) next.invoiceDate = 'Required';
    if (header.dueDate && header.dueDate < header.invoiceDate) next.dueDate = 'Cannot be before the invoice date';
    if (!header.company.trim()) next.company = 'Required';
    if (!header.billingAddress.trim()) next.billingAddress = 'Required';
    if (!header.shippingAddress.trim()) next.shippingAddress = 'Required';
    if (!lines.length) next.lines = 'Add at least one line item';
    for (const [field, label] of [['discount', 'Discount'], ['salesTaxRate', 'Sales tax rate'], ['shipping', 'Shipping']] as const) {
      const value = num(header[field]);
      if (Number.isNaN(value) || value < 0) next[field] = `${label} cannot be negative`;
    }
    if (num(header.salesTaxRate) > 100) next.salesTaxRate = 'Must be 0–100';
    if (totals.discount > totals.subtotal) next.discount = 'Cannot exceed the subtotal';
    for (const line of lines) {
      if (!line.productId) next[`line-${line.key}-product`] = 'Select a product';
      if (!(num(line.quantity) > 0)) next[`line-${line.key}-quantity`] = 'Must be > 0';
      if (line.unitPrice === '' || Number.isNaN(num(line.unitPrice)) || num(line.unitPrice) < 0) next[`line-${line.key}-unitPrice`] = 'Invalid';
    }
    return next;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    onSaved({ invoiceNumber: header.invoiceNumber || `INV-${header.orderId.replace(/^ORD-/, '')}`, total: totals.total });
  };

  const field = (name: keyof Header, label: string, extra: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <TextField fullWidth size="small" label={label} value={header[name]} onChange={setField(name)} error={!!errors[name]} helperText={errors[name] || extra.helperText} InputLabelProps={{ shrink: true }} {...extra} />
  );
  const readOnly = { InputProps: { readOnly: true } };
  const grid = { display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' } } as const;
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h5" component="h3">{title}</Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="contained">Save Invoice</Button>
          </Stack>
        </Stack>
        {hasErrors && <Alert severity="error">Please fix the highlighted fields.</Alert>}

        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }} aria-label="Seller details">
          <Typography variant="overline" color="text.secondary">Seller (Remit To)</Typography>
          <Typography fontWeight={700}>{SELLER.name}&nbsp;&nbsp;|&nbsp;&nbsp;{SELLER.address}</Typography>
          <Typography variant="body2">Customer Service: {SELLER.customerService}</Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Invoice Details</Typography>
          <Box sx={grid}>
            {field('invoiceNumber', 'Invoice Number', { placeholder: 'Assigned on save', helperText: header.invoiceNumber ? undefined : 'Assigned on save if blank' })}
            {field('invoiceDate', 'Invoice Date *', { type: 'date' })}
            {field('dueDate', 'Due Date', { type: 'date' })}
            {field('paymentTerms', 'Payment Terms')}
            {field('orderId', 'Order ID', readOnly)}
            {field('orderDate', 'Order Date', { type: 'date' })}
            {field('poNumber', 'PO Number')}
            <TextField fullWidth size="small" label="Currency" value="USD – U.S. Dollar" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
          </Box>
        </Paper>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Bill To</Typography>
            <Stack spacing={1.5}>
              {field('company', 'Company *')}
              {field('attention', 'Attention')}
              {field('billingAddress', 'Billing Address *', { multiline: true, minRows: 2 })}
              {field('contactDetails', 'Contact Details')}
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Ship To</Typography>
            <Stack spacing={1.5}>
              {field('shipToName', 'Ship To Name')}
              {field('shippingAddress', 'Shipping Address *', { multiline: true, minRows: 2 })}
            </Stack>
          </Paper>
        </Box>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>Line Items</Typography>
            <Button size="small" onClick={() => setLines((current) => [...current, { key: ++lineKey, productId: '', description: '', htsCode, quantity: '1', unitPrice: '' }])}>+ Add Line</Button>
          </Stack>
          {errors.lines && <Alert severity="error" sx={{ mb: 1 }}>{errors.lines}</Alert>}
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 240 }}>Product</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell sx={{ width: 110 }}>HTS Code</TableCell>
                  <TableCell sx={{ width: 80 }}>Qty</TableCell>
                  <TableCell sx={{ width: 130 }}>Unit Price ($)</TableCell>
                  <TableCell sx={{ width: 120 }} align="right">Amount</TableCell>
                  <TableCell sx={{ width: 40 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={line.key}>
                    <TableCell>
                      <TextField select fullWidth size="small" label="Product" value={line.productId} onChange={(event) => selectProduct(line.key, event.target.value)} error={!!errors[`line-${line.key}-product`]} helperText={errors[`line-${line.key}-product`]} SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 360 } } } }}>
                        {products.map((product) => (
                          <MenuItem key={product.product_id} value={product.product_id}>
                            <Box>
                              <Typography variant="body2">{product.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{product.product_id} · {product.category} · {product.family}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell><TextField fullWidth size="small" multiline value={line.description} onChange={(event) => updateLine(line.key, { description: event.target.value })} inputProps={{ 'aria-label': `Line ${index + 1} description` }} /></TableCell>
                    <TableCell><TextField fullWidth size="small" value={line.htsCode} onChange={(event) => updateLine(line.key, { htsCode: event.target.value })} inputProps={{ 'aria-label': `Line ${index + 1} HTS code` }} /></TableCell>
                    <TableCell><TextField fullWidth size="small" type="number" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} error={!!errors[`line-${line.key}-quantity`]} helperText={errors[`line-${line.key}-quantity`]} inputProps={{ min: 1, 'aria-label': `Line ${index + 1} quantity` }} /></TableCell>
                    <TableCell><TextField fullWidth size="small" type="number" value={line.unitPrice} onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })} error={!!errors[`line-${line.key}-unitPrice`]} helperText={errors[`line-${line.key}-unitPrice`]} inputProps={{ min: 0, step: '0.01', 'aria-label': `Line ${index + 1} unit price` }} /></TableCell>
                    <TableCell align="right">{usd(num(line.quantity) * num(line.unitPrice) || 0)}</TableCell>
                    <TableCell><IconButton size="small" aria-label={`Remove line ${index + 1}`} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>×</IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 320px' } }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Notes</Typography>
            {field('notes', 'Notes / Remittance Instructions', { multiline: true, minRows: 3 })}
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }} aria-label="Invoice totals">
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between"><span>Subtotal</span><strong>{usd(totals.subtotal)}</strong></Stack>
              {field('discount', 'Discount ($)', { type: 'number', inputProps: { min: 0, step: '0.01' } })}
              {field('salesTaxRate', 'Sales Tax Rate (%)', { type: 'number', inputProps: { min: 0, max: 100, step: '0.01' } })}
              <Stack direction="row" justifyContent="space-between"><span>Sales Tax</span><span>{usd(totals.salesTax)}</span></Stack>
              {field('shipping', 'Shipping & Handling ($)', { type: 'number', inputProps: { min: 0, step: '0.01' } })}
              <Divider />
              <Stack direction="row" justifyContent="space-between"><Typography fontWeight={700}>Total Due (USD)</Typography><Typography fontWeight={700}>{usd(totals.total)}</Typography></Stack>
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}
