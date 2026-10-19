from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.app.db.models import BankMaster, CompanyMaster, CustomerMaster, InvoiceHeader, InvoiceItem, ProductCatalog
from backend.app.schemas.invoice_management import InvoiceInput
from backend.app.services.customer_master import find_customer_by_id


MASTER_MODELS = {
    "companies": CompanyMaster,
    "customers": CustomerMaster,
    "products": ProductCatalog,
    "banks": BankMaster,
}


def list_master(db: Session, model: type, search: str = "") -> list:
    rows = db.scalars(select(model)).all()
    if not search.strip():
        return rows
    needle = search.casefold()
    return [row for row in rows if needle in " ".join(str(value) for value in vars(row).values()).casefold()]


def get_master(db: Session, model: type, item_id: str):
    row = db.get(model, item_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return row


def save_master(db: Session, model: type, payload: dict, item_id: str | None = None):
    row = get_master(db, model, item_id) if item_id else model(**payload)
    for key, value in payload.items():
        setattr(row, key, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_master(db: Session, model: type, item_id: str) -> None:
    row = get_master(db, model, item_id)
    db.delete(row)
    db.commit()


def _money(value: float) -> float:
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def amount_in_words(value: float) -> str:
    whole = int(round(value))
    if whole == 0:
        return "Rupees Zero Only"
    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def words(number: int) -> str:
        if number < 20:
            return units[number]
        if number < 100:
            return tens[number // 10] + (f" {units[number % 10]}" if number % 10 else "")
        if number < 1000:
            return f"{units[number // 100]} Hundred" + (f" {words(number % 100)}" if number % 100 else "")
        if number < 100000:
            return f"{words(number // 1000)} Thousand" + (f" {words(number % 1000)}" if number % 1000 else "")
        if number < 10000000:
            return f"{words(number // 100000)} Lakh" + (f" {words(number % 100000)}" if number % 100000 else "")
        return f"{words(number // 10000000)} Crore" + (f" {words(number % 10000000)}" if number % 10000000 else "")

    return f"Rupees {words(whole)} Only"


def next_invoice_number(db: Session) -> str:
    year = date.today().year
    prefix = f"INV-{year}-"
    count = len(db.scalars(select(InvoiceHeader).where(InvoiceHeader.invoice_no.like(f"{prefix}%"))).all()) + 1
    return f"{prefix}{count:05d}"


def serialize_invoice(invoice: InvoiceHeader) -> dict:
    return {
        "invoice_id": invoice.invoice_id,
        "invoice_no": invoice.invoice_no,
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "po_reference": invoice.po_reference,
        "place_of_supply": invoice.place_of_supply,
        "company_id": invoice.company_id,
        "customer_id": invoice.customer_id,
        "payment_terms": invoice.payment_terms,
        "terms_and_conditions": invoice.terms_and_conditions,
        "discount_amount": invoice.discount_amount,
        "billing_address": invoice.billing_address,
        "shipping_address": invoice.shipping_address,
        "delivery_spoc": invoice.delivery_spoc,
        "delivery_date": invoice.delivery_date,
        "invoice_status": invoice.invoice_status,
        "subtotal": invoice.subtotal,
        "taxable_amount": invoice.taxable_amount,
        "cgst": invoice.cgst,
        "sgst": invoice.sgst,
        "igst": invoice.igst,
        "round_off": invoice.round_off,
        "grand_total": invoice.grand_total,
        "amount_in_words": invoice.amount_in_words,
        "company": invoice.company,
        "customer": invoice.customer,
        "items": [{
            "product_id": item.product_id, "description": item.description, "hsn_sac": item.hsn_sac,
            "quantity": item.quantity, "unit": item.unit, "rate": item.rate,
            "gst_percentage": item.gst_percentage, "amount": item.amount,
        } for item in invoice.items],
    }


def save_invoice(db: Session, payload: InvoiceInput, invoice_id: int | None = None) -> InvoiceHeader:
    company = db.get(CompanyMaster, payload.company_id)
    source_customer = find_customer_by_id(payload.customer_id)
    customer = db.get(CustomerMaster, payload.customer_id)
    if not company or (not source_customer and not customer):
        raise HTTPException(status_code=400, detail="Select a valid company and customer")
    if customer is None:
        customer = CustomerMaster(customer_id=payload.customer_id)
    if source_customer:
        for field in ("customer_name", "gstin", "contact_person", "phone", "email", "billing_address", "shipping_address", "state_code"):
            setattr(customer, field, source_customer.get(field, ""))
    db.add(customer)
    invoice = db.get(InvoiceHeader, invoice_id) if invoice_id else InvoiceHeader(invoice_no=next_invoice_number(db))
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    for field in ("invoice_date", "due_date", "po_reference", "place_of_supply", "company_id", "customer_id", "payment_terms", "terms_and_conditions", "discount_amount", "billing_address", "shipping_address", "delivery_spoc", "delivery_date", "invoice_status"):
        setattr(invoice, field, getattr(payload, field))
    invoice.items = []
    subtotal = 0.0
    cgst = sgst = igst = 0.0
    same_state = payload.place_of_supply.strip().casefold() in {customer.state_code.strip().casefold(), "", "same state"}
    for item_input in payload.items:
        amount = _money(item_input.quantity * item_input.rate)
        tax = _money(amount * item_input.gst_percentage / 100)
        subtotal += amount
        if same_state:
            cgst += tax / 2
            sgst += tax / 2
        else:
            igst += tax
        invoice.items.append(InvoiceItem(**item_input.model_dump(), amount=amount))
    invoice.subtotal = _money(subtotal)
    invoice.taxable_amount = _money(max(invoice.subtotal - payload.discount_amount, 0))
    tax_ratio = invoice.taxable_amount / invoice.subtotal if invoice.subtotal else 0
    cgst *= tax_ratio
    sgst *= tax_ratio
    igst *= tax_ratio
    invoice.cgst, invoice.sgst, invoice.igst = _money(cgst), _money(sgst), _money(igst)
    invoice.round_off = _money(round(invoice.taxable_amount + invoice.cgst + invoice.sgst + invoice.igst) - (invoice.taxable_amount + invoice.cgst + invoice.sgst + invoice.igst))
    invoice.grand_total = _money(invoice.taxable_amount + invoice.cgst + invoice.sgst + invoice.igst + invoice.round_off)
    invoice.amount_in_words = amount_in_words(invoice.grand_total)
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return db.scalar(select(InvoiceHeader).options(joinedload(InvoiceHeader.company), joinedload(InvoiceHeader.customer), joinedload(InvoiceHeader.items)).where(InvoiceHeader.invoice_id == invoice.invoice_id))