import { useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material';
import { createInvoiceApi, InvoiceApiContext } from './api';
import InvoiceDetailPage from './InvoiceDetailPage';
import InvoiceFormPage from './InvoiceFormPage';
import InvoiceListPage from './InvoiceListPage';
import { CompanyMasterPage, ProductCatalogPage } from './MasterPages';

export const INVOICE_ROUTE_PATTERN = /^\/(invoices|company-master|product-catalog)(\/|$)/;

export const INVOICE_NAV_ITEMS = [
  { path: '/company-master', label: 'Company Master' },
  { path: '/product-catalog', label: 'Product Catalog' },
  { path: '/invoices/create', label: 'Create Invoice' },
  { path: '/invoices', label: 'Invoice List' },
] as const;

const theme = createTheme({
  palette: { primary: { main: '#1c5b63' } },
  typography: { fontFamily: 'inherit' },
});

export default function InvoiceModule({ accessToken }: { accessToken: string }) {
  const api = useMemo(() => createInvoiceApi(accessToken), [accessToken]);

  return (
    <ThemeProvider theme={theme}>
      <InvoiceApiContext.Provider value={api}>
        <section className="invoice-module">
          <Routes>
            <Route path="/invoices" element={<InvoiceListPage />} />
            <Route path="/invoices/create" element={<InvoiceFormPage />} />
            <Route path="/invoices/:id/view" element={<InvoiceDetailPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
            <Route path="/company-master" element={<CompanyMasterPage />} />
            <Route path="/product-catalog" element={<ProductCatalogPage />} />
            <Route path="*" element={<Navigate to="/invoices" replace />} />
          </Routes>
        </section>
      </InvoiceApiContext.Provider>
    </ThemeProvider>
  );
}
