from datetime import datetime

from openpyxl import Workbook

from backend.app.main import app, fedex_shipments
from backend.app.services.fedex_shipment_service import list_fedex_shipments


def _workbook(tmp_path):
    path = tmp_path / "demo_process_kpi_data.xlsx"
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "FedEx_Shipments"
    sheet.append(["Order_ID", "Tracking_AWB_No", "Commercial_Invoice_No", "Ship_Date", "Actual_Weight_kg", "Commercial_Invoice_No"])
    sheet.append(["ORD-1", 794644790001, "INV-1", datetime(2026, 10, 8), 8.2, "US-INV-1"])
    sheet.append(["ORD-2", 794644790002, "INV-2", datetime(2026, 10, 9), 13.0, "US-INV-2"])
    sheet.append([None] * 6)
    workbook.save(path)
    return path


def test_fedex_shipments_keep_duplicate_columns_and_filter_by_order_id(tmp_path):
    path = _workbook(tmp_path)
    assert list_fedex_shipments("ord-1", path) == [{
        "order_id": "ORD-1",
        "tracking_awb_no": "794644790001",
        "commercial_invoice_no": "INV-1",
        "ship_date": "2026-10-08",
        "actual_weight_kg": "8.2",
        "commercial_invoice_no_2": "US-INV-1",
    }]
    assert [row["order_id"] for row in list_fedex_shipments(None, path)] == ["ORD-1", "ORD-2"]
    assert list_fedex_shipments("ORD-404", path) == []


def test_fedex_shipments_api_serves_workbook_data():
    assert "/api/fedex-shipments" in {route.path for route in app.routes}
    rows = fedex_shipments("ORD-78430")
    assert rows and all(row["order_id"] == "ORD-78430" for row in rows)
    assert rows[0]["fedex_service_product"]
