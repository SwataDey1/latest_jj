from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MasterBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Company(MasterBase):
    company_id: str
    company_name: str
    gstin: str = ""
    pan: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    ship_from_address: str = ""


class Customer(MasterBase):
    customer_id: str
    customer_name: str
    gstin: str = ""
    contact_person: str = ""
    phone: str = ""
    email: str = ""
    billing_address: str = ""
    shipping_address: str = ""
    state_code: str = ""


class Product(MasterBase):
    product_id: str
    product_name: str
    hsn_sac: str = ""
    unit: str = "Nos"
    rate: float = Field(ge=0)
    gst_percentage: float = Field(ge=0)


class Bank(MasterBase):
    bank_id: str
    bank_name: str
    account_name: str = ""
    account_number: str = ""
    ifsc_code: str = ""
    swift_code: str = ""
    payment_terms: str = "Due within 15 days"


class InvoiceItemInput(BaseModel):
    product_id: str | None = None
    description: str = ""
    hsn_sac: str = ""
    quantity: float = Field(gt=0)
    unit: str = "Nos"
    rate: float = Field(ge=0)
    gst_percentage: float = Field(ge=0)


InvoiceStatus = Literal["Draft", "Pending Approval", "Approved", "Generated", "Sent", "Paid", "Cancelled"]


class InvoiceInput(BaseModel):
    invoice_date: date
    due_date: date | None = None
    po_reference: str = ""
    place_of_supply: str = ""
    company_id: str
    customer_id: str
    payment_terms: str = "Due within 15 days"
    terms_and_conditions: str = ""
    discount_amount: float = Field(default=0, ge=0)
    billing_address: str = ""
    shipping_address: str = ""
    delivery_spoc: str = ""
    delivery_date: date | None = None
    invoice_status: InvoiceStatus = "Draft"
    items: list[InvoiceItemInput] = Field(min_length=1)


class InvoiceResponse(InvoiceInput):
    model_config = ConfigDict(from_attributes=True)
    invoice_id: int
    invoice_no: str
    subtotal: float
    taxable_amount: float
    cgst: float
    sgst: float
    igst: float
    round_off: float
    grand_total: float
    amount_in_words: str
    company: Company | None = None
    customer: Customer | None = None