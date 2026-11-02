"""Pydantic schemas for background removal API."""

from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service status, e.g. 'ok'")
    model: str = Field(..., description="Configured background-removal provider")
    ready: bool = Field(..., description="Whether provider credentials are configured")
    device: str = Field(default="remote API", description="Processing provider")
    error: Optional[str] = Field(default=None, description="Configuration guidance when unavailable")


class ErrorResponse(BaseModel):
    error: str = Field(..., description="Human-friendly error summary")
    detail: Optional[str] = Field(default=None, description="Additional context or guidance")
