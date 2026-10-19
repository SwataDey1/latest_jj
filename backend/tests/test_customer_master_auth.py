import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from backend.app.api.demo_auth import get_demo_dashboard_context
from backend.app.db.database import Base
from backend.app.main import (
    LoginRequest,
    app,
    auth_options,
    customer_alerts,
    customer_kpis,
    customer_responsibilities,
    customer_workflows,
    get_session,
    login,
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def test_customer_master_login_and_session_are_csv_backed(db_session):
    options = auth_options()
    assert {"Partner", "Client", "Vendor"} <= set(options["categories"])
    assert {"EndUser", "Manager", "Admin"} <= set(options["personas"])
    assert {
        "/login",
        "/session",
        "/kpis",
        "/responsibilities",
        "/alerts",
        "/workflows",
    } <= {route.path for route in app.routes}

    response = login(
        LoginRequest(username="manager", password="pass123", category="Partner", persona_id="Manager"),
        db_session,
    )

    assert response["session"]["customer_id"] == "2"
    assert response["session"]["customer_name"] == "Wipro"
    assert response["session"]["rbac_role"] == "Manager"
    assert response["session"]["application_access"][0] == {
        "application_name": "UI-AI Solutions",
        "tenancy_id": "1004",
        "rights": ["Read"],
    }
    assert "password" not in response["session"]

    restored = get_session(
        db=db_session,
        authorization=f"Bearer {response['access_token']}",
    )
    assert restored["session"] == response["session"]


@pytest.mark.parametrize(
    ("username", "password", "category", "persona", "message"),
    [
        ("unknown", "pass123", "Partner", "Manager", "Username"),
        ("manager", "pass123", "Client", "Manager", "Category"),
        ("manager", "pass123", "Partner", "Admin", "Persona"),
        ("manager", "wrong", "Partner", "Manager", "Password"),
    ],
)
def test_customer_master_login_rejects_mismatched_credentials(
    db_session, username, password, category, persona, message
):
    with pytest.raises(HTTPException, match=message):
        login(
            LoginRequest(
                username=username,
                password=password,
                category=category,
                persona_id=persona,
            ),
            db_session,
        )


def test_customer_dashboard_endpoints_use_authenticated_assignment(db_session):
    response = login(
        LoginRequest(username="manager", password="pass123", category="Partner", persona_id="Manager"),
        db_session,
    )
    context = get_demo_dashboard_context(
        f"Bearer {response['access_token']}",
        db_session,
    )
    assert context[1]["customer_id"] == "2"
    assert context[1]["dashboard_email"] == "role17@local.dev"

    assert customer_kpis(context=context)["period"] == "weekly"
    assert "responsibilities" in customer_responsibilities(context=context)
    assert "alerts" in customer_alerts(context=context)
    assert "items" in customer_workflows(context=context)
