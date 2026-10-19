import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { getErrorMessage, MasterResource, useInvoiceApi } from './api';

export type FieldConfig<T> = {
  name: keyof T & string;
  label: string;
  required?: boolean;
  type?: 'text' | 'number' | 'email';
  multiline?: boolean;
  uppercase?: boolean;
  fullWidth?: boolean;
  helperText?: string;
  validate?: (value: string, values: Record<string, string>) => string | undefined;
};

export type ColumnConfig<T> = {
  label: string;
  render: (record: T) => React.ReactNode;
  align?: 'left' | 'right';
};

type MasterCrudPageProps<T> = {
  title: string;
  singular: string;
  resource: MasterResource;
  idKey: keyof T & string;
  fields: FieldConfig<T>[];
  columns: ColumnConfig<T>[];
};

type FormMode = { kind: 'create' } | { kind: 'edit'; record: unknown } | { kind: 'view'; record: unknown };

function toFormValues<T>(fields: FieldConfig<T>[], record?: T): Record<string, string> {
  return Object.fromEntries(fields.map((field) => {
    const value = record ? (record as Record<string, unknown>)[field.name] : undefined;
    return [field.name, value === null || value === undefined ? '' : String(value)];
  }));
}

function validateForm<T>(fields: FieldConfig<T>[], values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.name].trim();
    if (field.required && !value) {
      errors[field.name] = `${field.label} is required`;
      continue;
    }
    if (field.type === 'number' && value && Number.isNaN(Number(value))) {
      errors[field.name] = `${field.label} must be a number`;
      continue;
    }
    const message = value ? field.validate?.(value, values) : undefined;
    if (message) errors[field.name] = message;
  }
  return errors;
}

function toPayload<T>(fields: FieldConfig<T>[], values: Record<string, string>): Record<string, string | number | null> {
  return Object.fromEntries(fields.map((field) => {
    const value = values[field.name].trim();
    if (!value) return [field.name, null];
    return [field.name, field.type === 'number' ? Number(value) : value];
  }));
}

export default function MasterCrudPage<T>({ title, singular, resource, idKey, fields, columns }: MasterCrudPageProps<T>) {
  const api = useInvoiceApi();
  const [records, setRecords] = useState<T[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<FormMode | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => toFormValues(fields));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get<T[]>(`/${resource}`, { params: term.trim() ? { search: term.trim() } : {} });
      setRecords(data);
    } catch (error) {
      setLoadError(getErrorMessage(error, `${title} could not be loaded.`));
    } finally {
      setLoading(false);
    }
  }, [api, resource, title]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(search), 250);
    return () => window.clearTimeout(timeout);
  }, [load, search]);

  const openForm = (next: FormMode) => {
    setMode(next);
    setValues(toFormValues(fields, next.kind === 'create' ? undefined : next.record as T));
    setErrors({});
    setSubmitError('');
  };

  const handleChange = (field: FieldConfig<T>, raw: string) => {
    const value = field.uppercase ? raw.toUpperCase() : raw;
    setValues((current) => ({ ...current, [field.name]: value }));
    if (errors[field.name]) setErrors((current) => ({ ...current, [field.name]: '' }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mode || mode.kind === 'view') return;
    const nextErrors = validateForm(fields, values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setSaving(true);
    setSubmitError('');
    try {
      const payload = toPayload(fields, values);
      if (mode.kind === 'create') await api.post(`/${resource}`, payload);
      else await api.put(`/${resource}/${(mode.record as Record<string, unknown>)[idKey]}`, payload);
      setToast({ message: `${singular} ${mode.kind === 'create' ? 'added' : 'updated'}.`, severity: 'success' });
      setMode(null);
      await load(search);
    } catch (error) {
      setSubmitError(getErrorMessage(error, `${singular} could not be saved.`));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/${resource}/${(deleteTarget as Record<string, unknown>)[idKey]}`);
      setToast({ message: `${singular} deleted.`, severity: 'success' });
      await load(search);
    } catch (error) {
      setToast({ message: getErrorMessage(error, `${singular} could not be deleted.`), severity: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const readOnly = mode?.kind === 'view';

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Typography variant="h5" component="h3">{title}</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" label={`Search ${title.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} inputProps={{ maxLength: 100 }} />
          <Button variant="contained" onClick={() => openForm({ kind: 'create' })}>Add {singular}</Button>
        </Stack>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              {columns.map((column) => <TableCell key={column.label} align={column.align}>{column.label}</TableCell>)}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => {
              const id = String((record as Record<string, unknown>)[idKey]);
              return (
                <TableRow key={id} hover>
                  <TableCell>{id}</TableCell>
                  {columns.map((column) => <TableCell key={column.label} align={column.align}>{column.render(record)}</TableCell>)}
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="View"><IconButton size="small" aria-label={`View ${singular} ${id}`} onClick={() => openForm({ kind: 'view', record })}>&#128065;</IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" aria-label={`Edit ${singular} ${id}`} onClick={() => openForm({ kind: 'edit', record })}>&#9998;</IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" color="error" aria-label={`Delete ${singular} ${id}`} onClick={() => setDeleteTarget(record)}>&#128465;</IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {!records.length && (
              <TableRow>
                <TableCell colSpan={columns.length + 2} align="center">
                  {loading ? 'Loading…' : search ? 'No matching records.' : `No ${title.toLowerCase()} yet. Add one to get started.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!mode} onClose={() => setMode(null)} maxWidth="md" fullWidth>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <DialogTitle>{mode?.kind === 'create' ? `Add ${singular}` : mode?.kind === 'edit' ? `Edit ${singular}` : `${singular} details`}</DialogTitle>
          <DialogContent dividers>
            {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
            <Grid container spacing={2}>
              {fields.map((field) => (
                <Grid item xs={12} sm={field.fullWidth || field.multiline ? 12 : 6} key={field.name}>
                  <TextField
                    fullWidth
                    size="small"
                    label={field.label}
                    name={field.name}
                    type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                    required={field.required && !readOnly}
                    multiline={field.multiline}
                    minRows={field.multiline ? 2 : undefined}
                    value={values[field.name]}
                    onChange={(event) => handleChange(field, event.target.value)}
                    error={!!errors[field.name]}
                    helperText={errors[field.name] || (readOnly ? undefined : field.helperText)}
                    InputProps={{ readOnly }}
                  />
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMode(null)}>{readOnly ? 'Close' : 'Cancel'}</Button>
            {readOnly
              ? <Button variant="outlined" onClick={() => mode && openForm({ kind: 'edit', record: (mode as { record: unknown }).record })}>Edit</Button>
              : <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>}
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete {singular.toLowerCase()}?</DialogTitle>
        <DialogContent>This action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void confirmDelete()}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">{toast.message}</Alert> : undefined}
      </Snackbar>
    </Stack>
  );
}
