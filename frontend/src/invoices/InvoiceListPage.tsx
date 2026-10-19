import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage, InvoiceSummary, useInvoiceApi } from './api';
import { formatMoney } from './calculations';

export default function InvoiceListPage() {
  const api = useInvoiceApi();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizeInvoice = (invoice: InvoiceSummary): InvoiceSummary => ({
    ...invoice,
    company_name: invoice.company_name ?? invoice.company?.company_name ?? '',
    customer_name: invoice.customer_name ?? invoice.customer?.customer_name ?? '',
    source: invoice.source ?? invoice.invoice_status ?? 'manual',
    tax_amount: invoice.tax_amount ?? ((invoice.cgst ?? 0) + (invoice.sgst ?? 0) + (invoice.igst ?? 0)),
  });

  useEffect(() => {
    let current = true;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError('');
      api.get<InvoiceSummary[]>('/invoices', { params: search.trim() ? { search: search.trim() } : {} })
        .then(({ data }) => { if (current) setInvoices(data.map(normalizeInvoice)); })
        .catch((loadError: unknown) => { if (current) setError(getErrorMessage(loadError, 'Invoices could not be loaded.')); })
        .finally(() => { if (current) setLoading(false); });
    }, 250);
    return () => {
      current = false;
      window.clearTimeout(timeout);
    };
  }, [api, search]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Typography variant="h5" component="h3">Invoice List</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Search invoice, PO, company, customer" value={search} onChange={(event) => setSearch(event.target.value)} inputProps={{ maxLength: 100 }} sx={{ minWidth: 280 }} />
          <Button variant="contained" onClick={() => navigate('/invoices/create')}>Create Invoice</Button>
        </Stack>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Invoice No.</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>PO Reference</TableCell>
              <TableCell>Source</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="right">Tax</TableCell>
              <TableCell align="right">Grand Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.invoice_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${invoice.invoice_id}`)}>
                <TableCell><b>{invoice.invoice_no}</b></TableCell>
                <TableCell>{invoice.invoice_date}</TableCell>
                <TableCell>{invoice.due_date ?? '—'}</TableCell>
                <TableCell>{invoice.company_name}</TableCell>
                <TableCell>{invoice.customer_name}</TableCell>
                <TableCell>{invoice.po_reference ?? '—'}</TableCell>
                <TableCell><Chip size="small" label={invoice.source} /></TableCell>
                <TableCell align="right">{formatMoney(invoice.subtotal)}</TableCell>
                <TableCell align="right">{formatMoney(invoice.tax_amount ?? 0)}</TableCell>
                <TableCell align="right"><b>{formatMoney(invoice.grand_total)}</b></TableCell>
              </TableRow>
            ))}
            {!invoices.length && (
              <TableRow><TableCell colSpan={10} align="center">{loading ? 'Loading…' : search ? 'No matching invoices.' : 'No invoices yet.'}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
