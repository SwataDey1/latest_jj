from datetime import datetime

from openpyxl import Workbook

from backend.app.main import app, email_discovery_emails
from backend.app.services.email_discovery_service import list_demo_emails


def test_email_discovery_reads_email_sheet_fields(tmp_path):
    workbook_path = tmp_path / "demo_process_kpi_data.xlsx"
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Emails"
    sheet.append(
        [
            "Email ID",
            "Order ID",
            "Subject",
            "Sender Email",
            "Received Time",
            "Summary",
            "Next Action",
            "Priority",
        ]
    )
    sheet.append(
        [
            "EML-4821",
            "ORD-78419",
            "Delivery address correction",
            "maya@example.com",
            datetime(2026, 10, 8, 9, 18),
            "Customer confirmed corrected address",
            "Verify address",
            "High",
        ]
    )
    sheet.append([None] * 8)
    orders = workbook.create_sheet("Order")
    orders.append(["Order ID", "Description", "Customer Name", "Customer ID", "Order Status", "PO Number", "PO Status",
                   "Invoice Status", "Invoice Amount", "Priority", "Current Role", "Next Role", "Pending Action"])
    orders.append(["ORD-78419", "Surgical kits", "Acme Health", "CUST-42", "Delivery Planning", "PO-1", "Approved",
                   "Pending", 1200, "High", "Order Desk", "Billing", "Confirm address"])
    orders.append(["ORD-1", "Gloves", "Acme Health", "CUST-42", "Delivered", "PO-2", "Approved",
                   "Paid", "Null", "Low", "Billing", "Closed", "None"])
    workbook.save(workbook_path)

    assert list_demo_emails(workbook_path) == [
        {
            "email_id": "EML-4821",
            "order_id": "ORD-78419",
            "subject": "Delivery address correction",
            "sender_email": "maya@example.com",
            "received_time": "2026-10-08T09:18",
            "summary": "Customer confirmed corrected address",
            "next_action": "Verify address",
            "priority": "High",
            "order": {
                "order_id": "ORD-78419",
                "description": "Surgical kits",
                "customer_name": "Acme Health",
                "customer_id": "CUST-42",
                "order_status": "Delivery Planning",
                "po_number": "PO-1",
                "po_status": "Approved",
                "invoice_status": "Pending",
                "invoice_amount": "1200",
                "priority": "High",
                "current_role": "Order Desk",
                "next_role": "Billing",
                "pending_action": "Confirm address",
            },
            "customer": {
                "customer_name": "Acme Health",
                "customer_id": "CUST-42",
                "total_orders": 2,
                "open_orders": 1,
                "open_deliveries": 1,
                "open_invoices": 1,
            },
        }
    ]


def test_email_discovery_api_is_registered_and_serves_workbook_data():
    assert "/api/emails" in {route.path for route in app.routes}
    emails = email_discovery_emails()
    assert len(emails) == 20
    assert emails[0]["email_id"] == "EML-4821"
    assert emails[0]["order_id"] == "ORD-78419"
    assert emails[0]["subject"] == "Delivery address correction"
    assert all(email["order"] for email in emails)
