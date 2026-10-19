from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    documents: Mapped[list["Document"]] = relationship(back_populates="owner")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="user")


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    documents: Mapped[list["Document"]] = relationship(back_populates="workspace")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(64))
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    storage_path: Mapped[str] = mapped_column(String(500))
    content_hash: Mapped[str] = mapped_column(String(128), index=True)
    status: Mapped[str] = mapped_column(String(32), default="uploaded")
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[str | None] = mapped_column(Text, default="{}")
    error_message: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    workspace_id: Mapped[int | None] = mapped_column(ForeignKey("workspaces.id"), nullable=True)

    owner: Mapped[User | None] = relationship(back_populates="documents")
    workspace: Mapped[Workspace | None] = relationship(back_populates="documents")


class DocumentProcessingJob(Base):
    __tablename__ = "document_processing_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued")
    message: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), default="New chat")
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped[User] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"))
    role: Mapped[str] = mapped_column(String(32))
    content: Mapped[str] = mapped_column(Text)
    citation_json: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class QueryFeedback(Base):
    __tablename__ = "query_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[str | None] = mapped_column(String(64), default=None)
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    helpful: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_type: Mapped[str] = mapped_column(String(64))
    event_data: Mapped[str | None] = mapped_column(Text, default=None)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CompanyMaster(Base):
    __tablename__ = "company_master"

    company_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    company_name: Mapped[str] = mapped_column(String(255))
    gstin: Mapped[str] = mapped_column(String(32), default="")
    pan: Mapped[str] = mapped_column(String(32), default="")
    phone: Mapped[str] = mapped_column(String(64), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    address: Mapped[str] = mapped_column(Text, default="")
    ship_from_address: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    invoices: Mapped[list["InvoiceHeader"]] = relationship(back_populates="company")


class CustomerMaster(Base):
    __tablename__ = "customer_master"

    customer_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(255))
    gstin: Mapped[str] = mapped_column(String(32), default="")
    contact_person: Mapped[str] = mapped_column(String(255), default="")
    phone: Mapped[str] = mapped_column(String(64), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    billing_address: Mapped[str] = mapped_column(Text, default="")
    shipping_address: Mapped[str] = mapped_column(Text, default="")
    state_code: Mapped[str] = mapped_column(String(16), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    invoices: Mapped[list["InvoiceHeader"]] = relationship(back_populates="customer")


class ProductCatalog(Base):
    __tablename__ = "product_catalog"

    product_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    product_name: Mapped[str] = mapped_column(String(255))
    hsn_sac: Mapped[str] = mapped_column(String(64), default="")
    unit: Mapped[str] = mapped_column(String(32), default="Nos")
    rate: Mapped[float] = mapped_column(Float, default=0)
    gst_percentage: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    invoice_items: Mapped[list["InvoiceItem"]] = relationship(back_populates="product")


class BankMaster(Base):
    __tablename__ = "bank_master"

    bank_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    bank_name: Mapped[str] = mapped_column(String(255))
    account_name: Mapped[str] = mapped_column(String(255), default="")
    account_number: Mapped[str] = mapped_column(String(64), default="")
    ifsc_code: Mapped[str] = mapped_column(String(32), default="")
    swift_code: Mapped[str] = mapped_column(String(32), default="")
    payment_terms: Mapped[str] = mapped_column(String(255), default="Due within 15 days")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InvoiceHeader(Base):
    __tablename__ = "invoice_header"

    invoice_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invoice_no: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    invoice_date: Mapped[datetime] = mapped_column(Date)
    due_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    po_reference: Mapped[str] = mapped_column(String(128), default="")
    place_of_supply: Mapped[str] = mapped_column(String(128), default="")
    company_id: Mapped[str] = mapped_column(ForeignKey("company_master.company_id"))
    customer_id: Mapped[str] = mapped_column(ForeignKey("customer_master.customer_id"))
    payment_terms: Mapped[str] = mapped_column(String(255), default="Due within 15 days")
    terms_and_conditions: Mapped[str] = mapped_column(Text, default="")
    discount_amount: Mapped[float] = mapped_column(Float, default=0)
    billing_address: Mapped[str] = mapped_column(Text, default="")
    shipping_address: Mapped[str] = mapped_column(Text, default="")
    delivery_spoc: Mapped[str] = mapped_column(String(255), default="")
    delivery_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    invoice_status: Mapped[str] = mapped_column(String(32), default="Draft")
    subtotal: Mapped[float] = mapped_column(Float, default=0)
    taxable_amount: Mapped[float] = mapped_column(Float, default=0)
    cgst: Mapped[float] = mapped_column(Float, default=0)
    sgst: Mapped[float] = mapped_column(Float, default=0)
    igst: Mapped[float] = mapped_column(Float, default=0)
    round_off: Mapped[float] = mapped_column(Float, default=0)
    grand_total: Mapped[float] = mapped_column(Float, default=0)
    amount_in_words: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    company: Mapped[CompanyMaster] = relationship(back_populates="invoices")
    customer: Mapped[CustomerMaster] = relationship(back_populates="invoices")
    items: Mapped[list["InvoiceItem"]] = relationship(back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    item_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoice_header.invoice_id", ondelete="CASCADE"))
    product_id: Mapped[str | None] = mapped_column(ForeignKey("product_catalog.product_id"), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    hsn_sac: Mapped[str] = mapped_column(String(64), default="")
    quantity: Mapped[float] = mapped_column(Float, default=1)
    unit: Mapped[str] = mapped_column(String(32), default="Nos")
    rate: Mapped[float] = mapped_column(Float, default=0)
    gst_percentage: Mapped[float] = mapped_column(Float, default=0)
    amount: Mapped[float] = mapped_column(Float, default=0)
    invoice: Mapped[InvoiceHeader] = relationship(back_populates="items")
    product: Mapped[ProductCatalog | None] = relationship(back_populates="invoice_items")
