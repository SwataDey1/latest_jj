from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.app.db.database import get_db
from backend.app.db.models import BankMaster, CompanyMaster, InvoiceHeader, ProductCatalog
from backend.app.schemas.invoice_management import Bank, Company, Customer, InvoiceInput, InvoiceResponse, Product
from backend.app.services.customer_master import list_customers
from backend.app.services.invoice_from_chat_service import build_invoice_from_chat
from backend.app.services.invoice_from_email_service import build_invoice_from_email
from backend.app.services.invoice_management_service import delete_master, get_master, list_master, save_invoice, save_master, serialize_invoice

router = APIRouter(prefix="/api/invoice-management", tags=["invoice-management"])
integration_router = APIRouter(prefix="/api", tags=["invoice-integration"])


def master_routes(path: str, model: type, schema: type) -> None:
    @router.get(f"/{path}", response_model=list[schema], name=f"list_{path}")
    def list_items(search: str = Query(default=""), db: Session = Depends(get_db)):
        return list_master(db, model, search)

    @router.get(f"/{path}/{{item_id}}", response_model=schema, name=f"get_{path[:-1]}")
    def get_item(item_id: str, db: Session = Depends(get_db)):
        return get_master(db, model, item_id)

    @router.post(f"/{path}", response_model=schema, name=f"create_{path[:-1]}")
    def create_item(payload: dict, db: Session = Depends(get_db)):
        return save_master(db, model, payload)

    @router.put(f"/{path}/{{item_id}}", response_model=schema, name=f"update_{path[:-1]}")
    def update_item(item_id: str, payload: dict, db: Session = Depends(get_db)):
        return save_master(db, model, payload, item_id)

    @router.delete(f"/{path}/{{item_id}}", status_code=204, name=f"delete_{path[:-1]}")
    def remove_item(item_id: str, db: Session = Depends(get_db)):
        delete_master(db, model, item_id)


master_routes("companies", CompanyMaster, Company)
master_routes("products", ProductCatalog, Product)
master_routes("banks", BankMaster, Bank)


def _customer_payload(record: dict[str, str]) -> dict[str, str]:
    username = record.get("username", "")
    customer_id = record.get("customer_id", "")
    customer_name = record.get("customer_name", "")
    return {
        "customer_id": customer_id,
        "customer_name": customer_name,
        "gstin": record.get("gstin", ""),
        "contact_person": record.get("contact_person", ""),
        "phone": record.get("phone", ""),
        "email": record.get("email", username if "@" in username else ""),
        "billing_address": record.get("billing_address", f"{customer_name}, Billing Address (demo)"),
        "shipping_address": record.get("shipping_address", f"{customer_name}, Shipping Address (demo)"),
        "state_code": record.get("state_code", "27"),
    }


@router.get("/customers", response_model=list[Customer])
def list_invoice_customers(search: str = Query(default="")):
    records = [_customer_payload(record) for record in list_customers()]
    if search.strip():
        needle = search.casefold()
        records = [record for record in records if needle in " ".join(record.values()).casefold()]
    return records


@router.get("/invoices")
def list_invoices(search: str = Query(default=""), db: Session = Depends(get_db)):
    query = select(InvoiceHeader).options(joinedload(InvoiceHeader.company), joinedload(InvoiceHeader.customer), joinedload(InvoiceHeader.items)).order_by(InvoiceHeader.created_at.desc())
    invoices = db.scalars(query).unique().all()
    if search.strip():
        needle = search.casefold()
        invoices = [invoice for invoice in invoices if needle in invoice.invoice_no.casefold() or needle in invoice.customer.customer_name.casefold()]
    return [serialize_invoice(invoice) for invoice in invoices]


@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.scalar(select(InvoiceHeader).options(joinedload(InvoiceHeader.company), joinedload(InvoiceHeader.customer), joinedload(InvoiceHeader.items)).where(InvoiceHeader.invoice_id == invoice_id))
    if invoice is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Invoice not found")
    return serialize_invoice(invoice)


@router.post("/invoices")
def create_invoice(payload: InvoiceInput, db: Session = Depends(get_db)):
    return serialize_invoice(save_invoice(db, payload))


@router.put("/invoices/{invoice_id}")
def update_invoice(invoice_id: int, payload: InvoiceInput, db: Session = Depends(get_db)):
    return serialize_invoice(save_invoice(db, payload, invoice_id))


@router.delete("/invoices/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = get_master(db, InvoiceHeader, invoice_id)
    db.delete(invoice)
    db.commit()


@router.post("/invoice/from-email")
def invoice_from_email(payload: dict | None = None):
    return build_invoice_from_email(payload)


@router.post("/invoice/from-chat")
def invoice_from_chat(payload: dict | None = None):
    return build_invoice_from_chat(payload)


@router.post("/invoice/from-order")
def invoice_from_order(payload: dict | None = None):
    return {"source": "order", "status": "demo", "invoice": {"po_reference": "ORDER-DEMO-001", "items": []}, "received": payload or {}}


integration_router.add_api_route("/invoice/from-email", invoice_from_email, methods=["POST"])
integration_router.add_api_route("/invoice/from-chat", invoice_from_chat, methods=["POST"])
integration_router.add_api_route("/invoice/from-order", invoice_from_order, methods=["POST"])