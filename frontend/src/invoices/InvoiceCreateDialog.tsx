import { useMemo, useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, ThemeProvider } from '@mui/material';
import { createInvoiceApi, Invoice, InvoiceApiContext } from './api';
import InvoiceFormPage, { type InvoiceWorkflowPrefill } from './InvoiceFormPage';
import { invoiceTheme } from './InvoiceModule';

type Props = {
  accessToken: string;
  workflow: InvoiceWorkflowPrefill | null;
  onClose: () => void;
  onViewInvoice: (invoiceId: number) => void;
};

export default function InvoiceCreateDialog({ accessToken, workflow, onClose, onViewInvoice }: Props) {
  const api = useMemo(() => createInvoiceApi(accessToken), [accessToken]);
  const [created, setCreated] = useState<Invoice | null>(null);
  const lastWorkflow = useRef(workflow);
  if (workflow) lastWorkflow.current = workflow;
  const close = () => { setCreated(null); onClose(); };
  const title = lastWorkflow.current?.invoiceFormTitle ?? 'Create Invoice';
  const orderNumber = lastWorkflow.current?.orderNumber;

  return (
    <ThemeProvider theme={invoiceTheme}>
      <InvoiceApiContext.Provider value={api}>
        <Dialog open={!!workflow} onClose={close} fullWidth maxWidth="lg" scroll="paper" aria-labelledby="invoice-create-dialog-title">
          <DialogTitle id="invoice-create-dialog-title" sx={{ pr: 6 }}>
            {title}{orderNumber ? ` · ${orderNumber}` : ''}
            <IconButton aria-label={`Close ${title.toLowerCase()}`} onClick={close} sx={{ position: 'absolute', right: 8, top: 8 }}>×</IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {created ? (
              <Alert severity="success">Invoice <strong>{created.invoice_no}</strong> was saved successfully.</Alert>
            ) : workflow && (
              <InvoiceFormPage embedded={{ workflow, title, onCancel: close, onSaved: setCreated }} />
            )}
          </DialogContent>
          <DialogActions>
            <Stack direction="row" spacing={1}>
              {created && <Button onClick={close}>Close</Button>}
              {/* Placeholder: sending invoices is not implemented yet. */}
              <Button variant="outlined" onClick={() => undefined}>Send Invoice</Button>
              {created && <Button variant="contained" onClick={() => { const id = created.invoice_id; close(); onViewInvoice(id); }}>View Invoice</Button>}
            </Stack>
          </DialogActions>
        </Dialog>
      </InvoiceApiContext.Provider>
    </ThemeProvider>
  );
}
