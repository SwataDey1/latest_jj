import { useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, ThemeProvider } from '@mui/material';
import UsInvoiceForm, { type SavedUsInvoice } from './UsInvoiceForm';
import { invoiceTheme } from './InvoiceModule';

export type InvoiceDialogWorkflow = { orderNumber?: string; invoiceFormTitle?: string };

type Props = {
  workflow: InvoiceDialogWorkflow | null;
  onClose: () => void;
};

export default function InvoiceCreateDialog({ workflow, onClose }: Props) {
  const [saved, setSaved] = useState<SavedUsInvoice | null>(null);
  const lastWorkflow = useRef(workflow);
  if (workflow) lastWorkflow.current = workflow;
  const close = () => { setSaved(null); onClose(); };
  const title = lastWorkflow.current?.invoiceFormTitle ?? 'Create Invoice';
  const orderNumber = lastWorkflow.current?.orderNumber;

  return (
    <ThemeProvider theme={invoiceTheme}>
      <Dialog open={!!workflow} onClose={close} fullWidth maxWidth="lg" scroll="paper" aria-labelledby="invoice-create-dialog-title">
        <DialogTitle id="invoice-create-dialog-title" sx={{ pr: 6 }}>
          {title}{orderNumber ? ` · ${orderNumber}` : ''}
          <IconButton aria-label={`Close ${title.toLowerCase()}`} onClick={close} sx={{ position: 'absolute', right: 8, top: 8 }}>×</IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {saved ? (
            <Alert severity="success">
              Invoice <strong>{saved.invoiceNumber}</strong> saved for {saved.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} (demo).
            </Alert>
          ) : workflow?.orderNumber ? (
            <UsInvoiceForm orderId={workflow.orderNumber} title={title} onCancel={close} onSaved={setSaved} />
          ) : workflow && (
            <Alert severity="warning">No order is linked to this email, so invoice data cannot be loaded.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={1}>
            {saved && <Button onClick={close}>Close</Button>}
            {/* Placeholder: sending invoices is not implemented yet. */}
            <Button variant="outlined" onClick={() => undefined}>Send Invoice</Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
