"""
async_task_manager.py — ARES Asynchronous Background Task & Event Streaming Manager

Decouples long-running AI LangGraph agent runs and MIP solver optimizations
from the synchronous request-response cycle. Provides real-time SSE progress streaming.
"""

import uuid
import time
import asyncio
import logging
from typing import Dict, Any, Optional, Callable
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# In-memory Task Registry (In commercial multi-instance deployment, backed by Redis/Celery)
_task_registry: Dict[str, Dict[str, Any]] = {}
_executor = ThreadPoolExecutor(max_workers=8)

def create_task(task_type: str, metadata: Optional[Dict[str, Any]] = None) -> str:
    """Initializes a new background task record."""
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    _task_registry[task_id] = {
        "task_id": task_id,
        "task_type": task_type,
        "status": "PENDING", # PENDING, RUNNING, COMPLETED, FAILED
        "progress": 0, # 0 to 100
        "stage": "Initialized",
        "result": None,
        "error": None,
        "created_at": time.time(),
        "updated_at": time.time(),
        "metadata": metadata or {}
    }
    return task_id

def update_task_progress(task_id: str, progress: int, stage: str, details: Optional[Dict[str, Any]] = None):
    """Updates progress and execution stage of a running background task."""
    if task_id in _task_registry:
        _task_registry[task_id]["status"] = "RUNNING"
        _task_registry[task_id]["progress"] = min(100, max(0, progress))
        _task_registry[task_id]["stage"] = stage
        _task_registry[task_id]["updated_at"] = time.time()
        if details:
            _task_registry[task_id].setdefault("details", {}).update(details)

def complete_task(task_id: str, result: Any):
    """Marks task as successfully completed with final result payload."""
    if task_id in _task_registry:
        _task_registry[task_id]["status"] = "COMPLETED"
        _task_registry[task_id]["progress"] = 100
        _task_registry[task_id]["stage"] = "Completed"
        _task_registry[task_id]["result"] = result
        _task_registry[task_id]["updated_at"] = time.time()

def fail_task(task_id: str, error_message: str):
    """Marks task as failed with error details."""
    if task_id in _task_registry:
        _task_registry[task_id]["status"] = "FAILED"
        _task_registry[task_id]["stage"] = "Failed"
        _task_registry[task_id]["error"] = error_message
        _task_registry[task_id]["updated_at"] = time.time()

def get_task(task_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves status and results for a given task ID."""
    return _task_registry.get(task_id)

def run_in_background(task_id: str, fn: Callable, *args, **kwargs):
    """Submits a synchronous worker function to execute asynchronously in worker thread pool."""
    def _worker():
        try:
            update_task_progress(task_id, 10, "Starting Execution")
            res = fn(*args, task_id=task_id, **kwargs)
            complete_task(task_id, res)
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}", exc_info=True)
            fail_task(task_id, str(e))

    _executor.submit(_worker)
