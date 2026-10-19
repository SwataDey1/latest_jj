from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.api.demo_auth import get_demo_dashboard_context
from backend.app.db.models import User
from backend.app.services.invoice_service import create_invoice, list_invoices


router = APIRouter(prefix="/api/invoices", tags=["invoices"])


class CreateInvoiceRequest(BaseModel):
    order_id: str = Field(min_length=1, max_length=80)


class InvoiceCreatedResponse(BaseModel):
    orderId: str
    poNumber: str
    invoiceNumber: str
    status: Literal["Invoice Created"]
    validationStatus: Literal["PASSED"]
    poCreated: bool


class InvoiceValidationErrorResponse(BaseModel):
    status: Literal["FAILED", "VALIDATION_FAILED"]
    errors: list[str]


class InvoiceHistoryItem(BaseModel):
    invoiceNumber: str
    poNumber: str
    status: Literal["Invoice Created"]
    validationStatus: Literal["PASSED"]
    createdAt: str


class InvoiceHistoryResponse(BaseModel):
    orderId: str
    invoices: list[InvoiceHistoryItem]


@router.post("", response_model=InvoiceCreatedResponse | InvoiceValidationErrorResponse)
def create_order_invoice(
    request: CreateInvoiceRequest,
    context: tuple[User, dict[str, str]] = Depends(get_demo_dashboard_context),
) -> dict:
    _, assignment = context
    if assignment["persona_id"] != "role-07":
        raise HTTPException(status_code=403, detail="Invoice creation is available to CC Manager only")
    return create_invoice(request.order_id)


@router.get("", response_model=InvoiceHistoryResponse)
def get_invoice_history(
    order_id: str = Query(min_length=1, max_length=80),
    context: tuple[User, dict[str, str]] = Depends(get_demo_dashboard_context),
) -> dict:
    _, assignment = context
    if assignment["persona_id"] != "role-07":
        raise HTTPException(status_code=403, detail="Invoice history is available to CC Manager only")
    return list_invoices(order_id)