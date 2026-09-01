"""
Background worker simulation for ARES.
In a production environment (with Docker/Redis), this would be a real Celery application.
For the Hackathon MVP (without Redis), this simulates async task queuing via FastAPI BackgroundTasks
or asyncio.
"""
import asyncio
import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)

# Mock Celery Task decorator
def shared_task(name: str = None):
    def decorator(func: Callable):
        func.delay = lambda *args, **kwargs: asyncio.create_task(_run_async(func, *args, **kwargs))
        return func
    return decorator

async def _run_async(func: Callable, *args, **kwargs):
    """Run a sync or async function asynchronously in the background."""
    try:
        if asyncio.iscoroutinefunction(func):
            await func(*args, **kwargs)
        else:
            # Run sync function in thread pool
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, lambda: func(*args, **kwargs))
    except Exception as e:
        logger.error(f"Background task failed: {e}")
