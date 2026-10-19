def build_invoice_from_chat(payload: dict | None = None) -> dict:
    return {"source": "chat", "status": "demo", "invoice": {"po_reference": "CHAT-DEMO-001", "items": []}, "received": payload or {}}