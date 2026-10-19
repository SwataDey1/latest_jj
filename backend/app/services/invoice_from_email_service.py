def build_invoice_from_email(payload: dict | None = None) -> dict:
    return {"source": "email", "status": "demo", "invoice": {"po_reference": "PO-DEMO-001", "items": []}, "received": payload or {}}