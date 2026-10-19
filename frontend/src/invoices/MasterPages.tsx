import type { Company, Customer, Product } from './api';
import { EMAIL_PATTERN, formatMoney, GSTIN_PATTERN, PAN_PATTERN, PHONE_PATTERN } from './calculations';
import MasterCrudPage from './MasterCrudPage';

const validateGstin = (value: string) => (GSTIN_PATTERN.test(value) ? undefined : 'Enter a valid 15-character GSTIN');
const validatePhone = (value: string) => (PHONE_PATTERN.test(value) ? undefined : 'Enter a valid phone number');
const validateEmail = (value: string) => (EMAIL_PATTERN.test(value) ? undefined : 'Enter a valid email address');

export function CompanyMasterPage() {
  return (
    <MasterCrudPage<Company>
      title="Company Master"
      singular="Company"
      resource="companies"
      idKey="company_id"
      fields={[
        { name: 'company_name', label: 'Company Name', required: true, fullWidth: true },
        { name: 'gstin', label: 'GSTIN', required: true, uppercase: true, validate: validateGstin },
        {
          name: 'pan',
          label: 'PAN',
          required: true,
          uppercase: true,
          validate: (value, values) => {
            if (!PAN_PATTERN.test(value)) return 'Enter a valid 10-character PAN';
            if (values.gstin && values.gstin.slice(2, 12) !== value) return 'PAN must match characters 3-12 of the GSTIN';
            return undefined;
          },
        },
        { name: 'phone', label: 'Phone', validate: validatePhone },
        { name: 'email', label: 'Email', type: 'email', validate: validateEmail },
        { name: 'address', label: 'Address', required: true, multiline: true },
        { name: 'ship_from_address', label: 'Ship From Address', multiline: true },
        { name: 'bank_name', label: 'Bank Name' },
        { name: 'bank_account_name', label: 'Account Name', helperText: 'Defaults to the company name' },
        { name: 'bank_account_no', label: 'Bank Account No.' },
        { name: 'bank_ifsc', label: 'IFSC', uppercase: true, validate: (value) => (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value) ? undefined : 'Enter a valid 11-character IFSC') },
        { name: 'bank_branch', label: 'Bank Branch' },
      ]}
      columns={[
        { label: 'Company Name', render: (record) => record.company_name },
        { label: 'GSTIN', render: (record) => record.gstin },
        { label: 'PAN', render: (record) => record.pan },
        { label: 'Phone', render: (record) => record.phone ?? '—' },
        { label: 'Email', render: (record) => record.email ?? '—' },
      ]}
    />
  );
}

export function CustomerMasterPage() {
  return (
    <MasterCrudPage<Customer>
      title="Customer Master"
      singular="Customer"
      resource="customers"
      idKey="customer_id"
      fields={[
        { name: 'customer_name', label: 'Customer Name', required: true, fullWidth: true },
        {
          name: 'gstin',
          label: 'GSTIN',
          uppercase: true,
          validate: (value, values) => {
            if (!GSTIN_PATTERN.test(value)) return 'Enter a valid 15-character GSTIN';
            if (values.state_code && value.slice(0, 2) !== values.state_code) return 'GSTIN must start with the state code';
            return undefined;
          },
        },
        { name: 'state_code', label: 'State Code', required: true, helperText: '2-digit GST state code, e.g. 29', validate: (value) => (/^\d{2}$/.test(value) ? undefined : 'Enter a 2-digit state code') },
        { name: 'contact_person', label: 'Contact Person' },
        { name: 'phone', label: 'Phone', validate: validatePhone },
        { name: 'email', label: 'Email', type: 'email', validate: validateEmail },
        { name: 'billing_address', label: 'Billing Address', required: true, multiline: true },
        { name: 'shipping_address', label: 'Shipping Address', multiline: true, helperText: 'Leave blank to use the billing address' },
      ]}
      columns={[
        { label: 'Customer Name', render: (record) => record.customer_name },
        { label: 'GSTIN', render: (record) => record.gstin ?? 'Unregistered' },
        { label: 'State Code', render: (record) => record.state_code },
        { label: 'Contact', render: (record) => record.contact_person ?? '—' },
        { label: 'Phone', render: (record) => record.phone ?? '—' },
      ]}
    />
  );
}

export function ProductCatalogPage() {
  return (
    <MasterCrudPage<Product>
      title="Product Catalog"
      singular="Product"
      resource="products"
      idKey="product_id"
      fields={[
        { name: 'product_name', label: 'Product Name', required: true, fullWidth: true },
        { name: 'hsn_sac', label: 'HSN/SAC', required: true, validate: (value) => (/^\d{4,8}$/.test(value) ? undefined : 'HSN/SAC must be 4-8 digits') },
        { name: 'unit', label: 'Unit', required: true, helperText: 'e.g. Nos, Kg, Hrs' },
        { name: 'rate', label: 'Rate', type: 'number', required: true, validate: (value) => (Number(value) >= 0 ? undefined : 'Rate cannot be negative') },
        { name: 'gst_percentage', label: 'GST %', type: 'number', required: true, validate: (value) => (Number(value) >= 0 && Number(value) <= 100 ? undefined : 'GST % must be between 0 and 100') },
      ]}
      columns={[
        { label: 'Product Name', render: (record) => record.product_name },
        { label: 'HSN/SAC', render: (record) => record.hsn_sac },
        { label: 'Unit', render: (record) => record.unit },
        { label: 'Rate', align: 'right', render: (record) => formatMoney(record.rate) },
        { label: 'GST %', align: 'right', render: (record) => `${record.gst_percentage}%` },
      ]}
    />
  );
}
