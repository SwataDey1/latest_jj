from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.models import CompanyMaster, CustomerMaster, InvoiceHeader, InvoiceItem, ProductCatalog


COMPANIES = [
    {
        "company_id": "CMP-ACME",
        "company_name": "Acme Healthcare Solutions LLP",
        "gstin": "27AAFCA5678M1Z2",
        "pan": "AAFCA5678M",
        "phone": "+91 22 6650 3300",
        "email": "accounts@acmehealth.example",
        "address": "14 Health Park, Andheri East, Mumbai 400069",
        "ship_from_address": "Acme Healthcare Warehouse, Mumbai 400069",
    },
    {
        "company_id": "CMP-CONTOSO",
        "company_name": "Contoso MedTech India Pvt Ltd",
        "gstin": "07AAGCC3456H1Z4",
        "pan": "AAGCC3456H",
        "phone": "+91 11 4060 7000",
        "email": "finance@contoso-medtech.example",
        "address": "8 Innovation Road, New Delhi 110020",
        "ship_from_address": "Contoso MedTech Distribution Centre, Delhi 110020",
    },
    {
        "company_id": "CMP-NORTHWIND",
        "company_name": "Northwind Surgical Supplies",
        "gstin": "24AAJFN7890L1Z6",
        "pan": "AAJFN7890L",
        "phone": "+91 79 2656 4400",
        "email": "sales@northwind-surgical.example",
        "address": "302 Shapath Hexa, S.G. Highway, Ahmedabad, Gujarat 380060",
        "ship_from_address": "Shed 18, Changodar GIDC Ahmedabad, Gujarat 382213",
    },
    {
        "company_id": "CMP-WIPRO",
        "company_name": "Wipro Medical Devices Pvt Ltd",
        "gstin": "29AABCW1234K1Z5",
        "pan": "AABCW1234K",
        "phone": "+91 80 4110 2000",
        "email": "billing@wipro-meddevices.example",
        "address": "55 Electronic City, Bengaluru, Karnataka 560100",
        "ship_from_address": "Wipro Medical Devices Warehouse, Bengaluru 560100",
    },
]

CUSTOMERS = [
    ("CUS-APOLLO", "Apollo Clinic Chennai", "33AAECA2468R1Z9", "33", "S. Lakshmi", "+91 44 2811 0000"),
    ("CUS-CITYCARE", "City Care Pharmacy", "", "07", "Amit Verma", "+91 11 4155 9090"),
    ("CUS-CONTOSO", "Contoso Diagnostics", "27AADCC8765Q1Z3", "27", "Rahul Mehta", "+91 20 4567 1234"),
    ("CUS-FORTIS", "Fortis Care Hyderabad", "36AABCF1122G1Z7", "36", "Dr. Ravi Teja", "+91 40 6644 1000"),
    ("CUS-KOCHI", "Kochi Medical College Hospital", "32AAATK7788P1Z5", "32", "Dr. Meera Nair", "+91 484 270 5500"),
    ("CUS-KOLKATA", "Kolkata Heart Institute", "19AAATK3344J1Z1", "19", "Ananya Sen", "+91 33 4011 2200"),
    ("CUS-LUCKNOW", "Lucknow Diagnostics Centre", "09AAFCL5566N1Z3", "09", "Vikas Srivastava", "+91 522 400 8800"),
    ("CUS-MEDPLUS", "MedPlus Pharmacy Delhi", "07AKMCM2233R1Z8", "07", "Rohit Khanna", "+91 11 4700 1212"),
    ("CUS-NORTHSTAR", "Northstar Hospitals Pvt Ltd", "29AACCN4321P1Z8", "29", "Dr. Kavya Rao", "+91 80 2222 7788"),
    ("CUS-SUNRISE", "Sunrise Nursing Home", "24ABDFS9900Q1Z2", "24", "Hetal Patel", "+91 79 2747 3300"),
]

PRODUCTS = [
    ("PRD-MAINT", "Annual Maintenance Service", "998719", "Year", 25000, 18),
    ("PRD-BP", "Blood Pressure Monitor", "9018", "Nos", 2349, 12),
    ("PRD-CAL", "Calibration Service", "998346", "Visit", 3500, 18),
    ("PRD-THERMO", "Digital Thermometer", "9025", "Nos", 350, 18),
    ("PRD-SYRINGE", "Disposable Syringe 5ml (Pack of 100)", "9018", "Pack", 620, 12),
    ("PRD-EQUIP", "Equipment Installation", "998729", "Hrs", 1200, 18),
    ("PRD-WHEEL", "Foldable Wheelchair", "8713", "Nos", 6499, 5),
    ("PRD-GLUCO", "Glucometer Kit", "9027", "Kit", 1249.5, 12),
    ("PRD-BED", "Hospital Bed Mattress", "9404", "Nos", 8650, 18),
    ("PRD-CANNULA", "IV Cannula 20G (Pack of 50)", "9018", "Pack", 1475, 12),
    ("PRD-OXIMETER", "Pulse Oximeter", "9018", "Nos", 1850, 12),
]


def _ensure_master(db: Session, model: type, key: str, values: dict) -> None:
    if db.get(model, values[key]) is None:
        db.add(model(**values))


def ensure_invoice_demo_data(db: Session) -> None:
    for company in COMPANIES:
        _ensure_master(db, CompanyMaster, "company_id", company)
    for customer_id, name, gstin, state_code, contact, phone in CUSTOMERS:
        _ensure_master(db, CustomerMaster, "customer_id", {
            "customer_id": customer_id,
            "customer_name": name,
            "gstin": gstin,
            "contact_person": contact,
            "phone": phone,
            "email": f"{customer_id.lower()}@example",
            "billing_address": f"{name}, Main Road, {state_code}",
            "shipping_address": f"{name}, Receiving Gate, {state_code}",
            "state_code": state_code,
        })
    for product_id, name, hsn_sac, unit, rate, gst in PRODUCTS:
        _ensure_master(db, ProductCatalog, "product_id", {
            "product_id": product_id,
            "product_name": name,
            "hsn_sac": hsn_sac,
            "unit": unit,
            "rate": rate,
            "gst_percentage": gst,
        })
    db.flush()

    invoice_specs = [
        ("NWS/26-27/0003", date(2026, 10, 11), date(2026, 11, 10), "PO-FCH-2296", "CMP-NORTHWIND", "CUS-FORTIS", [("PRD-CANNULA", 12), ("PRD-OXIMETER", 8), ("PRD-CAL", 1)]),
        ("INV-202610-0002", date(2026, 10, 10), date(2026, 11, 9), "", "CMP-ACME", "CUS-CITYCARE", [("PRD-BP", 5), ("PRD-THERMO", 10)]),
        ("WMD/26-27/0005", date(2026, 10, 9), date(2026, 11, 8), "PO-NSH-1042", "CMP-WIPRO", "CUS-NORTHSTAR", [("PRD-MAINT", 1), ("PRD-GLUCO", 4)]),
        ("CMT/26-27/0003", date(2026, 10, 6), date(2026, 10, 21), "", "CMP-CONTOSO", "CUS-CITYCARE", [("PRD-SYRINGE", 20), ("PRD-EQUIP", 2)]),
    ]
    for invoice_no, invoice_date, due_date, po_reference, company_id, customer_id, lines in invoice_specs:
        if db.scalar(select(InvoiceHeader).where(InvoiceHeader.invoice_no == invoice_no)):
            continue
        invoice = InvoiceHeader(
            invoice_no=invoice_no,
            invoice_date=invoice_date,
            due_date=due_date,
            po_reference=po_reference,
            place_of_supply="36-Telangana",
            company_id=company_id,
            customer_id=customer_id,
            payment_terms="Net 30 days from invoice date.",
            invoice_status="Generated",
        )
        subtotal = 0.0
        tax = 0.0
        for line_no, (product_id, quantity) in enumerate(lines, 1):
            product = db.get(ProductCatalog, product_id)
            amount = round(product.rate * quantity, 2)
            line_tax = round(amount * product.gst_percentage / 100, 2)
            subtotal += amount
            tax += line_tax
            invoice.items.append(InvoiceItem(
                product_id=product_id,
                description=product.product_name,
                hsn_sac=product.hsn_sac,
                quantity=quantity,
                unit=product.unit,
                rate=product.rate,
                gst_percentage=product.gst_percentage,
                amount=amount,
            ))
        invoice.subtotal = round(subtotal, 2)
        invoice.taxable_amount = invoice.subtotal
        invoice.igst = round(tax, 2)
        invoice.cgst = 0
        invoice.sgst = 0
        invoice.round_off = round(round(invoice.subtotal + tax) - (invoice.subtotal + tax), 2)
        invoice.grand_total = round(invoice.subtotal + tax + invoice.round_off, 2)
        invoice.amount_in_words = "Indian Rupees demo amount only"
        db.add(invoice)
    db.commit()
