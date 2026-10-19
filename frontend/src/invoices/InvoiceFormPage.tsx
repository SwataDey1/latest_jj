import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { Company, Customer, getErrorMessage, Invoice, InvoiceInput, Product, useInvoiceApi } from './api';
import { calculateTotals, formatMoney, supplyStateCode } from './calculations';
import InvoicePreview, { DEFAULT_TERMS } from './InvoicePreview';

type LineRow = {
  key: number;
  product_id: string;
  description: string;
  hsn_sac: string;
  quantity: string;
  unit: string;
  rate: string;
  gst_percentage: string;
};

type Header = {
  invoice_no: string;
  invoice_date: string;
  due_date: string;
  po_reference: string;
  place_of_supply: string;
  company_id: string;
  customer_id: string;
  payment_terms: string;
  terms_and_conditions: string;
  discount_amount: string;
  billing_address: string;
  shipping_address: string;
  delivery_spoc: string;
  delivery_date: string;
};

let lineKey = 0;
const emptyLine = (): LineRow => ({ key: ++lineKey, product_id: '', description: '', hsn_sac: '', quantity: '1', unit: '', rate: '', gst_percentage: '' });
const today = () => new Date().toISOString().slice(0, 10);

const emptyHeader = (): Header => ({
  invoice_no: '',
  invoice_date: today(),
  due_date: '',
  po_reference: '',
  place_of_supply: '',
  company_id: '',
  customer_id: '',
  payment_terms: 'Payment due within 30 days of invoice date.',
  terms_and_conditions: DEFAULT_TERMS,
  discount_amount: '0',
  billing_address: '',
  shipping_address: '',
  delivery_spoc: '',
  delivery_date: '',
});

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return <TextField fullWidth size="small" label={label} value={value ?? ''} multiline InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />;
}

export default function InvoiceFormPage() {
  const api = useInvoiceApi();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [header, setHeader] = useState<Header>(emptyHeader);
  const [lines, setLines] = useState<LineRow[]>(() => [emptyLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileEditor, setProfileEditor] = useState<'billing' | 'shipping' | 'spoc' | 'delivery' | null>(null);

  useEffect(() => {
    let current = true;
    const requests: Promise<unknown>[] = [
      api.get<Company[]>('/companies'),
      api.get<Customer[]>('/customers'),
      api.get<Product[]>('/products'),
    ];
    if (id) requests.push(api.get<Invoice>(`/invoices/${encodeURIComponent(id)}`));
    Promise.all(requests).then((responses) => {
      if (!current) return;
      const [companyResponse, customerResponse, productResponse, invoiceResponse] = responses as [
        { data: Company[] }, { data: Customer[] }, { data: Product[] }, { data: Invoice } | undefined,
      ];
      setCompanies(companyResponse.data);
      setCustomers(customerResponse.data);
      setProducts(productResponse.data);
      const workflow = !id ? (location.state as { workflow?: { orderNumber?: string; companyId?: string; customerId?: string; productId?: string; quantity?: number } } | null)?.workflow : undefined;
      if (workflow) {
        const workflowProduct = productResponse.data.find((item) => item.product_id === workflow.productId);
        const workflowCustomer = customerResponse.data.find((item) => item.customer_id === workflow.customerId);
        setHeader((current) => ({
          ...current,
          po_reference: workflow.orderNumber ?? current.po_reference,
          company_id: workflow.companyId ?? current.company_id,
          customer_id: workflow.customerId ?? current.customer_id,
          place_of_supply: workflowCustomer?.state_code ?? current.place_of_supply,
          billing_address: workflowCustomer?.billing_address ?? current.billing_address,
          shipping_address: workflowCustomer?.shipping_address ?? workflowCustomer?.billing_address ?? current.shipping_address,
          delivery_spoc: workflowCustomer?.contact_person ?? current.delivery_spoc,
        }));
        if (workflowProduct) {
          setLines([{
            key: ++lineKey,
            product_id: workflowProduct.product_id,
            description: workflowProduct.product_name,
            hsn_sac: workflowProduct.hsn_sac,
            quantity: String(workflow.quantity ?? 1),
            unit: workflowProduct.unit,
            rate: String(workflowProduct.rate),
            gst_percentage: String(workflowProduct.gst_percentage),
          }]);
        }
      }
      const queryReference = new URLSearchParams(location.search).get('po_reference');
      if (!id && queryReference) setHeader((current) => ({ ...current, po_reference: queryReference }));
      const invoice = invoiceResponse?.data;
      if (invoice) {
        setHeader({
          invoice_no: invoice.invoice_no,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date ?? '',
          po_reference: invoice.po_reference ?? '',
          place_of_supply: invoice.place_of_supply,
          company_id: String(invoice.company_id),
          customer_id: String(invoice.customer_id),
          payment_terms: invoice.payment_terms ?? '',
          terms_and_conditions: invoice.terms_and_conditions ?? '',
          discount_amount: String(invoice.discount_amount ?? 0),
          billing_address: invoice.billing_address ?? invoice.customer?.billing_address ?? '',
          shipping_address: invoice.shipping_address ?? invoice.customer?.shipping_address ?? '',
          delivery_spoc: invoice.delivery_spoc ?? invoice.customer?.contact_person ?? '',
          delivery_date: invoice.delivery_date ?? '',
        });
        setLines(invoice.items.map((item) => ({
          key: ++lineKey,
          product_id: String(item.product_id),
          description: item.description,
          hsn_sac: item.hsn_sac,
          quantity: String(item.quantity),
          unit: item.unit,
          rate: String(item.rate),
          gst_percentage: String(item.gst_percentage),
        })));
      }
    }).catch((error: unknown) => {
      if (current) setLoadError(getErrorMessage(error, 'Invoice data could not be loaded.'));
    });
    return () => { current = false; };
  }, [api, id, location.search]);

  const company = companies.find((item) => String(item.company_id) === header.company_id) ?? null;
  const customer = customers.find((item) => String(item.customer_id) === header.customer_id) ?? null;
  const intraState = !!company && company.gstin.slice(0, 2) === supplyStateCode(header.place_of_supply, customer?.state_code);
  const totals = useMemo(() => calculateTotals(
    lines.map((line) => ({ quantity: Number(line.quantity), rate: Number(line.rate), gst_percentage: Number(line.gst_percentage) })),
    intraState,
    Number(header.discount_amount),
  ), [lines, intraState, header.discount_amount]);

  const setHeaderField = (field: keyof Header, value: string) => {
    setHeader((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const selectCustomer = (customerId: string) => {
    const selected = customers.find((item) => String(item.customer_id) === customerId);
    setHeader((current) => ({
      ...current,
      customer_id: customerId,
      place_of_supply: selected?.state_code ?? current.place_of_supply,
      billing_address: selected?.billing_address ?? current.billing_address,
      shipping_address: selected?.shipping_address || selected?.billing_address || current.shipping_address,
      delivery_spoc: selected?.contact_person ?? current.delivery_spoc,
    }));
    setErrors((current) => ({ ...current, customer_id: '', place_of_supply: '' }));
  };

  const updateLine = (key: number, patch: Partial<LineRow>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([name]) => !name.startsWith(`line-${key}-`))));
  };

  const selectProduct = (key: number, productId: string) => {
    const product = products.find((item) => String(item.product_id) === productId);
    updateLine(key, product
      ? { product_id: productId, description: product.product_name, hsn_sac: product.hsn_sac, unit: product.unit, rate: String(product.rate), gst_percentage: String(product.gst_percentage) }
      : { product_id: productId });
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!header.company_id) next.company_id = 'Select a company';
    if (!header.customer_id) next.customer_id = 'Select a customer';
    if (!header.invoice_date) next.invoice_date = 'Invoice date is required';
    if (header.due_date && header.invoice_date && header.due_date < header.invoice_date) next.due_date = 'Due date cannot be before the invoice date';
    if (!header.place_of_supply.trim()) next.place_of_supply = 'Place of supply is required';
    if (!lines.length) next.lines = 'Add at least one line item';
    const discount = Number(header.discount_amount || 0);
    if (Number.isNaN(discount) || discount < 0) next.discount_amount = 'Discount cannot be negative';
    else if (discount > totals.subtotal) next.discount_amount = 'Discount cannot exceed the subtotal';
    for (const line of lines) {
      if (!line.product_id) next[`line-${line.key}-product_id`] = 'Required';
      if (!(Number(line.quantity) > 0)) next[`line-${line.key}-quantity`] = 'Must be > 0';
      if (line.rate === '' || Number.isNaN(Number(line.rate)) || Number(line.rate) < 0) next[`line-${line.key}-rate`] = 'Invalid';
      const gst = Number(line.gst_percentage);
      if (line.gst_percentage === '' || Number.isNaN(gst) || gst < 0 || gst > 100) next[`line-${line.key}-gst_percentage`] = '0-100';
    }
    return next;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSubmitError('Please fix the highlighted fields.');
      return;
    }
    const payload: InvoiceInput = {
      invoice_date: header.invoice_date,
      due_date: header.due_date || null,
      po_reference: header.po_reference.trim(),
      place_of_supply: header.place_of_supply.trim(),
      company_id: header.company_id,
      customer_id: header.customer_id,
      payment_terms: header.payment_terms.trim(),
      terms_and_conditions: header.terms_and_conditions.trim(),
      discount_amount: Number(header.discount_amount || 0),
      billing_address: header.billing_address.trim(),
      shipping_address: header.shipping_address.trim(),
      delivery_spoc: header.delivery_spoc.trim(),
      delivery_date: header.delivery_date || null,
      items: lines.map((line) => ({
        product_id: line.product_id || null,
        description: line.description.trim(),
        hsn_sac: line.hsn_sac.trim(),
        quantity: Number(line.quantity),
        unit: line.unit.trim(),
        rate: Number(line.rate),
        gst_percentage: Number(line.gst_percentage),
      })),
    };
    setSaving(true);
    setSubmitError('');
    try {
      const { data } = id
        ? await api.put<Invoice>(`/invoices/${encodeURIComponent(id)}`, payload)
        : await api.post<Invoice>('/invoices', payload);
      navigate(`/invoices/${data.invoice_id}`);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Invoice could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const lineError = (line: LineRow, field: string) => errors[`line-${line.key}-${field}`];

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 220px' }, gap: 2, alignItems: 'start' }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="h3">{isEdit ? `Edit Invoice ${header.invoice_no}` : 'Create Invoice'}</Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => navigate(isEdit ? `/invoices/${id}` : '/invoices')}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : 'Save Invoice'}</Button>
          </Stack>
        </Stack>

        {loadError && <Alert severity="error">{loadError}</Alert>}
        {submitError && <Alert severity="error">{submitError}</Alert>}
        {!loadError && (!companies.length || !customers.length || !products.length) && (
          <Alert severity="info">Add at least one company, customer and product in the master pages before creating an invoice.</Alert>
        )}

        <Paper id="invoice-header" variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Invoice Header</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="Invoice No." value={header.invoice_no} onChange={(event) => setHeaderField('invoice_no', event.target.value)} helperText={isEdit ? undefined : 'Auto-generated if blank'} inputProps={{ maxLength: 64 }} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" type="date" label="Invoice Date" required InputLabelProps={{ shrink: true }} value={header.invoice_date} onChange={(event) => setHeaderField('invoice_date', event.target.value)} error={!!errors.invoice_date} helperText={errors.invoice_date} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" type="date" label="Due Date" InputLabelProps={{ shrink: true }} value={header.due_date} onChange={(event) => setHeaderField('due_date', event.target.value)} error={!!errors.due_date} helperText={errors.due_date} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="PO Reference" value={header.po_reference} onChange={(event) => setHeaderField('po_reference', event.target.value)} inputProps={{ maxLength: 128 }} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField select fullWidth size="small" label="Company" required value={header.company_id} onChange={(event) => setHeaderField('company_id', event.target.value)} error={!!errors.company_id} helperText={errors.company_id}>
                {companies.map((item) => <MenuItem key={item.company_id} value={String(item.company_id)}>{item.company_name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField select fullWidth size="small" label="Customer" required value={header.customer_id} onChange={(event) => selectCustomer(event.target.value)} error={!!errors.customer_id} helperText={errors.customer_id}>
                {customers.map((item) => <MenuItem key={item.customer_id} value={String(item.customer_id)}>{item.customer_name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth size="small" label="Place of Supply" required value={header.place_of_supply} onChange={(event) => setHeaderField('place_of_supply', event.target.value)} error={!!errors.place_of_supply} helperText={errors.place_of_supply || 'Starts with the 2-digit state code, e.g. 29-Karnataka'} inputProps={{ maxLength: 64 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Payment Terms" value={header.payment_terms} onChange={(event) => setHeaderField('payment_terms', event.target.value)} inputProps={{ maxLength: 255 }} />
            </Grid>
            <Grid item id="delivery-date" xs={12} sm={6}>
              <TextField fullWidth size="small" type="date" label="Delivery Date" InputLabelProps={{ shrink: true }} value={header.delivery_date} onChange={(event) => setHeaderField('delivery_date', event.target.value)} />
            </Grid>
            <Grid item id="delivery-spoc" xs={12} sm={6}>
              <TextField fullWidth size="small" label="Delivery SPOC" value={header.delivery_spoc} onChange={(event) => setHeaderField('delivery_spoc', event.target.value)} />
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper id="shipment-address" variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>Seller (auto-filled)</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12}><ReadOnlyField label="Seller Name" value={company?.company_name} /></Grid>
                <Grid item xs={6}><ReadOnlyField label="GSTIN" value={company?.gstin} /></Grid>
                <Grid item xs={6}><ReadOnlyField label="PAN" value={company?.pan} /></Grid>
                <Grid item xs={12}><ReadOnlyField label="Address" value={company?.address} /></Grid>
                <Grid item xs={12}><ReadOnlyField label="Ship From Address" value={company?.ship_from_address} /></Grid>
                <Grid item xs={12}><ReadOnlyField label="Contact Details" value={company ? [company.phone, company.email].filter(Boolean).join(' | ') : ''} /></Grid>
              </Grid>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper id="billing-address" variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>Customer (auto-filled)</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12}><ReadOnlyField label="Customer Name" value={customer?.customer_name} /></Grid>
                <Grid item xs={6}><ReadOnlyField label="GSTIN" value={customer ? customer.gstin ?? 'Unregistered' : ''} /></Grid>
                <Grid item xs={6}><ReadOnlyField label="State Code" value={customer?.state_code} /></Grid>
                <Grid item xs={12}><TextField fullWidth size="small" label="Billing Address" value={header.billing_address} onChange={(event) => setHeaderField('billing_address', event.target.value)} multiline /></Grid>
                <Grid item xs={12}><TextField fullWidth size="small" label="Shipping Address" value={header.shipping_address} onChange={(event) => setHeaderField('shipping_address', event.target.value)} multiline /></Grid>
                <Grid item xs={12}><ReadOnlyField label="Contact Details" value={customer ? [customer.contact_person, customer.phone, customer.email].filter(Boolean).join(' | ') : ''} /></Grid>
                <Grid item xs={12}><Stack direction="row" spacing={1}><Button type="button" size="small" variant="outlined" onClick={() => setProfileEditor('billing')}>Edit Bill To</Button><Button type="button" size="small" variant="outlined" onClick={() => setProfileEditor('shipping')}>Edit Ship To</Button><Button type="button" size="small" variant="outlined" onClick={() => setProfileEditor('spoc')}>Edit SPOC</Button></Stack></Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        <Paper id="product-catalogue" variant="outlined" sx={{ p: 2, overflowX: 'auto' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight={700}>Line Items</Typography>
            <Button size="small" variant="outlined" onClick={() => setLines((current) => [...current, emptyLine()])}>Add Line</Button>
          </Stack>
          {errors.lines && <Alert severity="error" sx={{ mb: 1 }}>{errors.lines}</Alert>}
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 200 }}>Product</TableCell>
                <TableCell>Description</TableCell>
                <TableCell sx={{ width: 100 }}>HSN/SAC</TableCell>
                <TableCell sx={{ width: 90 }}>Qty</TableCell>
                <TableCell sx={{ width: 80 }}>Unit</TableCell>
                <TableCell sx={{ width: 110 }}>Rate</TableCell>
                <TableCell sx={{ width: 80 }}>GST %</TableCell>
                <TableCell align="right" sx={{ width: 110 }}>Amount</TableCell>
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, index) => (
                <TableRow key={line.key}>
                  <TableCell>
                    <TextField select fullWidth size="small" label="Product" value={line.product_id} onChange={(event) => selectProduct(line.key, event.target.value)} error={!!lineError(line, 'product_id')} helperText={lineError(line, 'product_id')}>
                      {products.map((item) => <MenuItem key={item.product_id} value={String(item.product_id)}>{item.product_name}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell><TextField fullWidth size="small" value={line.description} onChange={(event) => updateLine(line.key, { description: event.target.value })} inputProps={{ 'aria-label': `Line ${index + 1} description` }} /></TableCell>
                  <TableCell><TextField fullWidth size="small" value={line.hsn_sac} onChange={(event) => updateLine(line.key, { hsn_sac: event.target.value })} inputProps={{ 'aria-label': `Line ${index + 1} HSN/SAC`, maxLength: 16 }} /></TableCell>
                  <TableCell><TextField fullWidth size="small" type="number" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} error={!!lineError(line, 'quantity')} helperText={lineError(line, 'quantity')} inputProps={{ 'aria-label': `Line ${index + 1} quantity`, min: 0, step: 'any' }} /></TableCell>
                  <TableCell><TextField fullWidth size="small" value={line.unit} onChange={(event) => updateLine(line.key, { unit: event.target.value })} inputProps={{ 'aria-label': `Line ${index + 1} unit`, maxLength: 32 }} /></TableCell>
                  <TableCell><TextField fullWidth size="small" type="number" value={line.rate} onChange={(event) => updateLine(line.key, { rate: event.target.value })} error={!!lineError(line, 'rate')} helperText={lineError(line, 'rate')} inputProps={{ 'aria-label': `Line ${index + 1} rate`, min: 0, step: 'any' }} /></TableCell>
                  <TableCell><TextField fullWidth size="small" type="number" value={line.gst_percentage} onChange={(event) => updateLine(line.key, { gst_percentage: event.target.value })} error={!!lineError(line, 'gst_percentage')} helperText={lineError(line, 'gst_percentage')} inputProps={{ 'aria-label': `Line ${index + 1} GST percentage`, min: 0, max: 100, step: 'any' }} /></TableCell>
                  <TableCell align="right">{formatMoney(totals.lineAmounts[index])}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" aria-label={`Remove line ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>&times;</IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <TextField
              size="small"
              type="number"
              label="Discount (₹)"
              value={header.discount_amount}
              onChange={(event) => setHeaderField('discount_amount', event.target.value)}
              error={!!errors.discount_amount}
              helperText={errors.discount_amount || 'Applied before GST'}
              inputProps={{ min: 0, step: 'any' }}
              sx={{ maxWidth: 220 }}
            />
            <Stack alignItems="flex-end" spacing={0.5}>
              <Typography>Subtotal: <b>{formatMoney(totals.subtotal)}</b> &nbsp; Discount: <b>-{formatMoney(totals.discount)}</b> &nbsp; Taxable Value: <b>{formatMoney(totals.taxableValue)}</b></Typography>
              <Typography>CGST: <b>{formatMoney(totals.cgst)}</b> &nbsp; SGST: <b>{formatMoney(totals.sgst)}</b> &nbsp; IGST: <b>{formatMoney(totals.igst)}</b> &nbsp; Round Off: <b>{formatMoney(totals.roundOff)}</b></Typography>
              <Typography variant="h6">Grand Total: ₹ {formatMoney(totals.grandTotal)}</Typography>
              <Typography variant="body2" color="text.secondary">{totals.amountInWords}</Typography>
            </Stack>
          </Stack>
        </Paper>

        <Paper id="terms-delivery" variant="outlined" sx={{ p: 2 }}>
          <TextField fullWidth multiline minRows={3} size="small" label="Terms & Conditions (one per line)" value={header.terms_and_conditions} onChange={(event) => setHeaderField('terms_and_conditions', event.target.value)} />
        </Paper>

        <Typography variant="subtitle1" fontWeight={700}>Preview</Typography>
        <InvoicePreview
          data={{
            invoice_no: header.invoice_no,
            invoice_date: header.invoice_date,
            due_date: header.due_date || null,
            po_reference: header.po_reference,
            place_of_supply: header.place_of_supply,
            payment_terms: header.payment_terms,
            terms_and_conditions: header.terms_and_conditions,
            billing_address: header.billing_address,
            shipping_address: header.shipping_address,
            delivery_spoc: header.delivery_spoc,
            delivery_date: header.delivery_date || null,
            company,
            customer,
            items: lines.map((line, index) => ({
              description: line.description,
              hsn_sac: line.hsn_sac,
              quantity: Number(line.quantity) || 0,
              unit: line.unit,
              rate: Number(line.rate) || 0,
              gst_percentage: Number(line.gst_percentage) || 0,
              amount: totals.lineAmounts[index],
            })),
            subtotal: totals.subtotal,
            discount: totals.discount,
            taxable_value: totals.taxableValue,
            cgst: totals.cgst,
            sgst: totals.sgst,
            igst: totals.igst,
            round_off: totals.roundOff,
            grand_total: totals.grandTotal,
            amount_in_words: totals.amountInWords,
          }}
        />
      </Stack>
      <Paper component="aside" variant="outlined" sx={{ p: 2, position: { lg: 'sticky' }, top: 16 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Invoice Navigation</Typography>
        {[
          ['billing-address', 'Billing Address'],
          ['shipment-address', 'Shipment Address'],
          ['product-catalogue', 'Product Catalogue'],
          ['terms-delivery', 'Terms of Delivery'],
          ['delivery-spoc', 'Delivery SPOC'],
          ['delivery-date', 'Delivery Date'],
          ['invoice-header', 'All Invoice Fields'],
        ].map(([target, label]) => <Button type="button" key={target} fullWidth size="small" sx={{ justifyContent: 'flex-start' }} onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{label}</Button>)}
      </Paper>
      <Dialog open={!!profileEditor} onClose={() => setProfileEditor(null)} fullWidth maxWidth="sm">
        <DialogTitle>{profileEditor === 'billing' ? 'Bill To Information' : profileEditor === 'shipping' ? 'Ship To Information' : profileEditor === 'spoc' ? 'Delivery SPOC' : 'Delivery Date'}</DialogTitle>
        <DialogContent>
          {profileEditor === 'billing' && <TextField autoFocus fullWidth multiline minRows={3} margin="dense" label="Billing Address" value={header.billing_address} onChange={(event) => setHeaderField('billing_address', event.target.value)} />}
          {profileEditor === 'shipping' && <TextField autoFocus fullWidth multiline minRows={3} margin="dense" label="Shipping Address" value={header.shipping_address} onChange={(event) => setHeaderField('shipping_address', event.target.value)} />}
          {profileEditor === 'spoc' && <TextField autoFocus fullWidth margin="dense" label="Delivery SPOC" value={header.delivery_spoc} onChange={(event) => setHeaderField('delivery_spoc', event.target.value)} />}
          {profileEditor === 'delivery' && <TextField autoFocus fullWidth type="date" margin="dense" label="Delivery Date" InputLabelProps={{ shrink: true }} value={header.delivery_date} onChange={(event) => setHeaderField('delivery_date', event.target.value)} />}
        </DialogContent>
        <DialogActions><Button type="button" onClick={() => setProfileEditor(null)}>Done</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
