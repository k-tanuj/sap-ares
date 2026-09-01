"""
conftest.py for USITC adapter tests.

Globally mocks httpx.Client so no test ever makes a real network call.
Individual tests can override this by re-patching in their own scope.
"""
import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture(autouse=True)
def no_real_network():
    """
    Module-wide fixture: replace httpx.Client with a mock that raises
    immediately, forcing all adapters to use their fallback paths.
    Tests that need specific responses can patch normalize_via_llm directly.
    """
    mock_instance = MagicMock()
    mock_instance.__enter__ = MagicMock(return_value=mock_instance)
    mock_instance.__exit__ = MagicMock(return_value=False)
    mock_instance.get.side_effect = Exception("No real network in tests")
    mock_instance.post.side_effect = Exception("No real network in tests")

    with patch("app.services.trade_adapters.httpx.Client", return_value=mock_instance):
        yield
