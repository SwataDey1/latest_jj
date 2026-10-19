import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { getErrorMessage, Invoice, useInvoiceApi } from './api';
import InvoicePreview from './InvoicePreview';

export default function InvoiceDetailPage() {
  const api = useInvoiceApi();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let current = true;
    setInvoice(null);
    setError('');
    api.get<Invoice>(`/invoices/${encodeURIComponent(id)}`)
      .then(({ data }) => { if (current) setInvoice(data); })
      .catch((loadError: unknown) => { if (current) setError(getErrorMessage(loadError, 'Invoice could not be loaded.')); });
    return () => { current = false; };
  }, [api, id]);

  const handleDelete = async () => {
    try {
      await api.delete(`/invoices/${encodeURIComponent(id)}`);
      navigate('/invoices', { replace: true });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Invoice could not be deleted.'));
      setConfirmDelete(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" className="no-print">
        <Typography variant="h5" component="h3">Invoice {invoice?.invoice_no ?? ''}</Typography>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => navigate('/invoices')}>Back to list</Button>
          <Button variant="outlined" disabled={!invoice} onClick={() => window.print()}>Print</Button>
          <Button variant="outlined" disabled={!invoice} onClick={() => navigate(`/invoices/${id}/edit`)}>Edit</Button>
          <Button variant="contained" color="error" disabled={!invoice} onClick={() => setConfirmDelete(true)}>Delete</Button>
        </Stack>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {!invoice && !error && <Typography>Loading…</Typography>}
      {invoice && (
        <InvoicePreview
          data={{
            invoice_no: invoice.invoice_no,
            invoice_date: invoice.invoice_date,
            due_date: invoice.due_date,
            po_reference: invoice.po_reference,
            place_of_supply: invoice.place_of_supply,
            payment_terms: invoice.payment_terms,
            terms_and_conditions: invoice.terms_and_conditions ?? null,
            billing_address: invoice.billing_address ?? invoice.customer?.billing_address,
            shipping_address: invoice.shipping_address ?? invoice.customer?.shipping_address,
            delivery_spoc: invoice.delivery_spoc,
            delivery_date: invoice.delivery_date,
            company: invoice.company,
            customer: invoice.customer,
            items: invoice.items,
            subtotal: invoice.subtotal,
            discount: invoice.discount_amount ?? invoice.discount ?? 0,
            taxable_value: invoice.taxable_value ?? invoice.taxable_amount ?? invoice.subtotal,
            cgst: invoice.cgst_amount ?? invoice.cgst ?? 0,
            sgst: invoice.sgst_amount ?? invoice.sgst ?? 0,
            igst: invoice.igst_amount ?? invoice.igst ?? 0,
            round_off: invoice.round_off,
            grand_total: invoice.grand_total,
            amount_in_words: invoice.amount_in_words,
          }}
        />
      )}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete invoice {invoice?.invoice_no}?</DialogTitle>
        <DialogContent>This permanently removes the invoice and its line items.</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void handleDelete()}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
