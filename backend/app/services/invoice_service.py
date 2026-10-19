from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone


MOCK_ORDERS: dict[str, dict] = {
    "ORD-78419": {
        "order_id": "ORD-78419",
        "status": "READY_FOR_INVOICING",
        "purchase_order": {"number": "PO-1001", "status": "VALID"},
        "bill_to": "Northstar Health Accounts Payable",
        "ship_to": "Northstar Health, 1200 Harbor Way",
        "tax_details": "CA sales tax",
        "delivery_date": "2026-10-10",
        "delivery_spoc": "Maya Patel",
        "invoices": [],
    },
    "ORD-78420": {
        "order_id": "ORD-78420",
        "status": "READY_FOR_INVOICING",
        "purchase_order": None,
        "bill_to": "Northstar Health Accounts Payable",
        "ship_to": "Northstar Health, 1200 Harbor Way",
        "tax_details": "CA sales tax",
        "delivery_date": "2026-10-12",
        "delivery_spoc": "Maya Patel",
        "invoices": [],
    },
    "ORD-VALIDATION-FAILED": {
        "order_id": "ORD-VALIDATION-FAILED",
        "status": "READY_FOR_INVOICING",
        "purchase_order": None,
        "bill_to": "",
        "ship_to": "",
        "tax_details": "",
        "delivery_date": "2026-10-12",
        "delivery_spoc": "Maya Patel",
        "invoices": [],
    },
}

_next_po_number = 1002
_next_invoice_number = 1002


def _missing_invoice_fields(order: dict) -> list[str]:
    fields = {
        "bill_to": "Bill To Missing",
        "ship_to": "Ship To Missing",
        "tax_details": "Tax Details Missing",
        "delivery_date": "Delivery Date Missing",
        "delivery_spoc": "Delivery SPOC Missing",
    }
    return [message for field, message in fields.items() if not order.get(field)]


def create_invoice(order_id: str) -> dict:
    """Create an invoice from isolated in-memory order data for the Order View demo."""
    global _next_po_number, _next_invoice_number

    order = MOCK_ORDERS.get(order_id)
    if order is None:
        return {"status": "FAILED", "errors": ["Order not found"]}

    purchase_order = order.get("purchase_order")
    if purchase_order is None:
        purchase_order = {"number": f"PO-{_next_po_number}", "status": "VALID"}
        _next_po_number += 1
        order["purchase_order"] = purchase_order
        order["status"] = "PO_CREATED"

    if purchase_order.get("status") != "VALID":
        return {"status": "FAILED", "errors": ["Purchase Order is not valid"]}

    errors = _missing_invoice_fields(order)
    if errors:
        order["status"] = "VALIDATION_FAILED"
        return {"status": "VALIDATION_FAILED", "errors": errors}

    invoice_number = f"INV-{_next_invoice_number}"
    _next_invoice_number += 1
    invoice = {
        "invoice_number": invoice_number,
        "po_number": purchase_order["number"],
        "validation_status": "PASSED",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    order["invoices"].append(invoice)
    order["status"] = "INVOICE_CREATED"
    return {
        "orderId": order_id,
        "poNumber": invoice["po_number"],
        "invoiceNumber": invoice_number,
        "status": "Invoice Created",
        "validationStatus": "PASSED",
        "poCreated": len(order["invoices"]) == 1 and purchase_order["number"] != "PO-1001",
    }


def get_mock_order(order_id: str) -> dict | None:
    order = MOCK_ORDERS.get(order_id)
    return deepcopy(order) if order else None


def list_invoices(order_id: str) -> dict:
    order = MOCK_ORDERS.get(order_id)
    if order is None:
        return {"orderId": order_id, "invoices": []}
    return {
        "orderId": order_id,
        "invoices": [
            {
                "invoiceNumber": invoice["invoice_number"],
                "poNumber": invoice["po_number"],
                "status": "Invoice Created",
                "validationStatus": invoice["validation_status"],
                "createdAt": invoice["created_at"],
            }
            for invoice in reversed(order["invoices"])
        ],
    }