"""Pydantic schemas for background removal API."""

from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service status, e.g. 'ok'")
    model: str = Field(..., description="Configured segmentation model name")
    ready: bool = Field(..., description="Whether model session is ready")
    device: str = Field(default="cpu", description="Inference device")


class ErrorResponse(BaseModel):
    error: str = Field(..., description="Human-friendly error summary")
    detail: Optional[str] = Field(default=None, description="Additional context or guidance")
