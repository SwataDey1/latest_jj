import { useMemo, useState } from 'react';
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
  const close = () => { setCreated(null); onClose(); };

  return (
    <ThemeProvider theme={invoiceTheme}>
      <InvoiceApiContext.Provider value={api}>
        <Dialog open={!!workflow} onClose={close} fullWidth maxWidth="lg" scroll="paper" aria-labelledby="invoice-create-dialog-title">
          <DialogTitle id="invoice-create-dialog-title" sx={{ pr: 6 }}>
            Create Invoice{workflow?.orderNumber ? ` · ${workflow.orderNumber}` : ''}
            <IconButton aria-label="Close create invoice" onClick={close} sx={{ position: 'absolute', right: 8, top: 8 }}>×</IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {created ? (
              <Alert severity="success">Invoice <strong>{created.invoice_no}</strong> was created successfully.</Alert>
            ) : workflow && (
              <InvoiceFormPage embedded={{ workflow, onCancel: close, onSaved: setCreated }} />
            )}
          </DialogContent>
          {created && (
            <DialogActions>
              <Stack direction="row" spacing={1}>
                <Button onClick={close}>Close</Button>
                <Button variant="contained" onClick={() => { const id = created.invoice_id; close(); onViewInvoice(id); }}>View Invoice</Button>
              </Stack>
            </DialogActions>
          )}
        </Dialog>
      </InvoiceApiContext.Provider>
    </ThemeProvider>
  );
}
