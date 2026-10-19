from __future__ import annotations

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import User
from backend.app.services.auth_service import decode_access_token
from backend.app.services.customer_master import find_customer_by_id, get_applications
from backend.app.services.demo_dashboard_service import DEMO_ACCOUNT_ASSIGNMENTS


def get_demo_dashboard_context(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
) -> tuple[User, dict[str, str]]:
    scheme, _, token = authorization.partition(" ")
    claims = decode_access_token(token) if scheme.lower() == "bearer" else None
    if not claims:
        raise HTTPException(status_code=401, detail="Sign in to view this dashboard")
    user = db.get(User, claims.get("sub"))
    if user is None or user.email != claims.get("email"):
        raise HTTPException(status_code=401, detail="Sign in to view this dashboard")
    customer = find_customer_by_id(claims.get("customer_id", ""))
    if (
        customer is None
        or customer["username"].casefold() != str(claims.get("username", "")).casefold()
        or customer["customer_category"] != claims.get("category")
        or customer["persona"] != claims.get("persona")
    ):
        raise HTTPException(status_code=401, detail="Customer session is invalid or no longer matches the master data.")
    applications = get_applications(customer["customer_id"])
    if not applications:
        raise HTTPException(status_code=403, detail="No applications are assigned to this customer.")
    if not any(
        right in {"Read", "Admin"}
        for application in applications
        for right in application["rights"]
    ):
        raise HTTPException(status_code=403, detail="This customer has no read access to dashboard applications.")

    persona = str(claims.get("persona_id", ""))
    if not persona.startswith("role-"):
        raise HTTPException(status_code=403, detail="No dashboard persona is assigned to this session.")
    dashboard_email = user.email
    if dashboard_email not in DEMO_ACCOUNT_ASSIGNMENTS:
        dashboard_email = f"role{persona.removeprefix('role-')}@local.dev"
    assignment = DEMO_ACCOUNT_ASSIGNMENTS.get(dashboard_email)
    if assignment is None or claims.get("role") != assignment["role"]:
        raise HTTPException(status_code=403, detail="No dashboard is assigned to this user")
    return user, {
        **assignment,
        "dashboard_email": dashboard_email,
        "customer_id": customer["customer_id"],
        "username": customer["username"],
    }
