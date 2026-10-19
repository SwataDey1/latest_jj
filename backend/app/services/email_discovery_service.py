from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from backend.app.services.demo_dashboard_service import (
    DEMO_WORKBOOK_PATH,
    _read_demo_table,
)


EMAIL_COLUMNS = (
    "Email ID",
    "Order ID",
    "Subject",
    "Sender Email",
    "Received Time",
    "Summary",
    "Next Action",
    "Priority",
)
CLOSED_ORDER_STATUSES = {"delivered"}
DELIVERY_ORDER_STATUSES = {
    "delivery planning",
    "fulfillment in progress",
    "backorder management",
    "expedited processing",
    "inventory hold",
}
NO_INVOICE_STATUSES = {"", "not started", "not created", "validation pending"}
CLOSED_INVOICE_STATUSES = NO_INVOICE_STATUSES | {"paid", "rejected"}


def _text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat(timespec="minutes")
    text = str(value).strip()
    # The workbook uses "None"/"Null" as placeholders for empty cells.
    return "" if text.casefold() in {"none", "null"} else text


def _order_payload(row: dict[str, Any]) -> dict[str, str]:
    return {
        "order_id": _text(row.get("Order ID")),
        "description": _text(row.get("Description")),
        "customer_name": _text(row.get("Customer Name")),
        "customer_id": _text(row.get("Customer ID")),
        "order_status": _text(row.get("Order Status")),
        "po_number": _text(row.get("PO Number")),
        "po_status": _text(row.get("PO Status")),
        "invoice_status": _text(row.get("Invoice Status")),
        "invoice_amount": _text(row.get("Invoice Amount")),
        "priority": _text(row.get("Priority")),
        "current_role": _text(row.get("Current Role")),
        "next_role": _text(row.get("Next Role")),
        "pending_action": _text(row.get("Pending Action")),
    }


def _customer_context(customer_name: str, orders: list[dict[str, str]]) -> dict[str, Any]:
    customer_orders = [order for order in orders if customer_name and order["customer_name"] == customer_name]
    customer_id = next((order["customer_id"] for order in customer_orders if order["customer_id"]), "")
    statuses = [order["order_status"].casefold() for order in customer_orders]
    invoice_statuses = [order["invoice_status"].casefold() for order in customer_orders]
    return {
        "customer_name": customer_name,
        "customer_id": customer_id,
        "total_orders": len(customer_orders),
        "open_orders": sum(1 for status in statuses if status and status not in CLOSED_ORDER_STATUSES),
        "open_deliveries": sum(1 for status in statuses if status in DELIVERY_ORDER_STATUSES),
        "open_invoices": sum(1 for status in invoice_statuses if status not in CLOSED_INVOICE_STATUSES),
    }


def list_demo_emails(
    workbook_path: Path = DEMO_WORKBOOK_PATH,
) -> list[dict[str, Any]]:
    rows = _read_demo_table("Emails", workbook_path)
    if rows and not set(EMAIL_COLUMNS).issubset(rows[0]):
        raise ValueError("The Emails sheet is missing one or more required columns.")

    orders = [
        _order_payload(row)
        for row in _read_demo_table("Order", workbook_path)
        if _text(row.get("Order ID"))
    ]
    orders_by_id = {order["order_id"]: order for order in orders}

    emails: list[dict[str, Any]] = []
    for row in rows:
        email_id = _text(row.get("Email ID"))
        order_id = _text(row.get("Order ID"))
        if not email_id and not order_id:
            continue
        order = orders_by_id.get(order_id)
        emails.append({
            "email_id": email_id,
            "order_id": order_id,
            "subject": _text(row.get("Subject")),
            "sender_email": _text(row.get("Sender Email")),
            "received_time": _text(row.get("Received Time")),
            "summary": _text(row.get("Summary")),
            "next_action": _text(row.get("Next Action")),
            "priority": _text(row.get("Priority")) or (order["priority"] if order else ""),
            "order": order,
            "customer": _customer_context(order["customer_name"], orders) if order else None,
        })
    return emails
