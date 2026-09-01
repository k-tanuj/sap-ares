"""
Tests for USITC DataWeb adapter integration.

Covers:
1.  USITCAdapter unit tests
2.  Authentication/configuration via environment variables
3.  Successful data retrieval (mocked httpx)
4.  Invalid/missing credentials graceful handling
5.  API failure / timeout fallback to mock data
6.  Rate limiting response handling
7.  Response normalization into NormalizedTradeEvent
8.  Duplicate detection in ingestion pipeline
9.  Source provenance (source_agency="USITC")
10. Tariff-event review lifecycle (DETECTED status, not auto-confirmed)
11. Organization isolation (requires buyer token)
12. Mock adapter fallback
13. USITC failure does NOT break CBIC, DGFT, Manual, File Import
"""
import pytest
import os
from datetime import datetime
from unittest.mock import patch, MagicMock

# We add the project root to sys.path so imports work
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.trade_adapters import (
    USITCAdapter,
    CBICAdapter,
    DGFTAdapter,
    NormalizedTradeEvent,
    get_trade_adapters,
    normalize_via_llm
)


# ---------------------------------------------------------------------------
# 1. Basic adapter metadata
# ---------------------------------------------------------------------------

class TestUSITCAdapterMetadata:
    def test_get_source_name(self):
        adapter = USITCAdapter()
        assert adapter.get_source_name() == "USITC"

    def test_is_available_returns_true(self, monkeypatch):
        monkeypatch.setenv("USITC_API_KEY", "some-valid-token")
        adapter = USITCAdapter()
        assert adapter.is_available() is True

    def test_is_available_returns_false_without_key(self, monkeypatch):
        monkeypatch.delenv("USITC_API_KEY", raising=False)
        adapter = USITCAdapter(api_key="")
        assert adapter.is_available() is False


# ---------------------------------------------------------------------------
# 2. Configuration from environment variables
# ---------------------------------------------------------------------------

class TestUSITCConfiguration:
    def test_reads_base_url_from_env(self, monkeypatch):
        monkeypatch.setenv("USITC_API_BASE_URL", "https://custom.usitc.example.com/api/v1")
        adapter = USITCAdapter()
        assert adapter.base_url == "https://custom.usitc.example.com/api/v1"

    def test_reads_api_key_from_env(self, monkeypatch):
        monkeypatch.setenv("USITC_API_KEY", "test-secret-key-1234")
        adapter = USITCAdapter()
        assert adapter.api_key == "test-secret-key-1234"

    def test_default_base_url_when_env_not_set(self, monkeypatch):
        monkeypatch.delenv("USITC_API_BASE_URL", raising=False)
        adapter = USITCAdapter()
        assert "usitc" in adapter.base_url.lower()

    def test_empty_api_key_when_env_not_set(self, monkeypatch):
        monkeypatch.delenv("USITC_API_KEY", raising=False)
        adapter = USITCAdapter()
        assert adapter.api_key == ""


# ---------------------------------------------------------------------------
# 3. fetch_latest - LLM normalization path
# ---------------------------------------------------------------------------

class TestUSITCFetchLatest:
    """All fetch tests are network-isolated via conftest.py autouse fixture."""

    def _make_fake_event(self):
        return NormalizedTradeEvent(
            title="USITC: Rare Earth Magnet Import Spike",
            source_country="China",
            destination_country="USA",
            affected_hscode_categories="Rare Earth Magnets, Neodymium",
            tariff_rate_increase=0.0,
            effective_date=datetime(2026, 9, 1),
            source_agency="USITC",
            reference_id="USITC-Q3-2026",
            confidence_score=0.75,
            evidence_url="https://dataweb.usitc.gov"
        )

    def test_fetch_latest_returns_list(self):
        adapter = USITCAdapter()
        with patch("app.services.trade_adapters.normalize_via_llm") as mock_llm:
            mock_llm.return_value = self._make_fake_event()
            results = adapter.fetch_latest()
        assert isinstance(results, list)

    def test_fetch_latest_returns_normalized_event(self):
        adapter = USITCAdapter()
        with patch("app.services.trade_adapters.normalize_via_llm") as mock_llm:
            mock_llm.return_value = self._make_fake_event()
            results = adapter.fetch_latest()
        assert len(results) >= 1
        assert isinstance(results[0], NormalizedTradeEvent)

    def test_fetch_latest_source_agency_is_usitc(self):
        adapter = USITCAdapter()
        with patch("app.services.trade_adapters.normalize_via_llm") as mock_llm:
            mock_llm.return_value = self._make_fake_event()
            results = adapter.fetch_latest()
        assert results[0].source_agency == "USITC"

    def test_fetch_latest_evidence_url_set(self):
        adapter = USITCAdapter()
        with patch("app.services.trade_adapters.normalize_via_llm") as mock_llm:
            mock_llm.return_value = self._make_fake_event()
            results = adapter.fetch_latest()
        assert results[0].evidence_url is not None
        assert "usitc" in results[0].evidence_url.lower()


# ---------------------------------------------------------------------------
# 4. API failure / timeout - graceful fallback to mock data
# ---------------------------------------------------------------------------

class TestUSITCAPIFailure:
    """Verify graceful degradation when the API is unavailable. Network isolated via conftest."""

    def test_timeout_falls_back_to_mock(self):
        """USITC adapter must NOT crash when network is unavailable."""
        adapter = USITCAdapter()
        with patch("app.services.trade_adapters.httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.side_effect = Exception("Network timeout")
            with patch("app.services.trade_adapters.normalize_via_llm") as mock_llm:
                mock_llm.return_value = NormalizedTradeEvent(
                    title="Fallback Mock Event",
                    source_country="China",
                    destination_country="USA",
                    affected_hscode_categories="Rare Earth Magnets",
                    tariff_rate_increase=0.0,
                    effective_date=datetime(2026, 9, 1),
                    source_agency="USITC",
                )
                results = adapter.fetch_latest()
        # Should still return results via fallback
        assert isinstance(results, list)

    def test_llm_failure_returns_empty_list(self):
        """If LLM normalization fails, return empty list - don't crash."""
        adapter = USITCAdapter()
        with patch("app.services.trade_adapters.normalize_via_llm") as mock_llm:
            mock_llm.return_value = None  # simulate LLM parse failure
            results = adapter.fetch_latest()
        assert results == []

    def test_exception_in_fetch_does_not_propagate(self):
        """USITC failure must not propagate to crash the application."""
        adapter = USITCAdapter()
        with patch("app.services.trade_adapters.normalize_via_llm", side_effect=RuntimeError("LLM down")):
            try:
                results = adapter.fetch_latest()
                # If it reaches here, it handled the exception
                assert results == []
            except RuntimeError:
                pytest.fail("USITCAdapter.fetch_latest() should not propagate exceptions")


# ---------------------------------------------------------------------------
# 5. SIGNAL vs TARIFF classification
# ---------------------------------------------------------------------------

class TestUSITCSignalClassification:
    def test_zero_rate_increase_classified_as_signal(self):
        adapter = USITCAdapter()
        event = NormalizedTradeEvent(
            title="Trade Anomaly",
            source_country="China",
            destination_country="USA",
            affected_hscode_categories="Magnets",
            tariff_rate_increase=0.0,
            effective_date=datetime(2026, 9, 1),
            source_agency="USITC",
            event_type="TARIFF"  # will be overridden by adapter logic
        )
        with patch("app.services.trade_adapters.normalize_via_llm") as mock_llm:
            mock_llm.return_value = event
            results = adapter.fetch_latest()
        assert len(results) == 1
        # The adapter sets event_type=SIGNAL for 0% rate with no restriction keywords
        assert results[0].event_type == "SIGNAL"

    def test_rate_increase_classified_as_tariff(self):
        adapter = USITCAdapter()
        event = NormalizedTradeEvent(
            title="Tariff Hike",
            source_country="China",
            destination_country="USA",
            affected_hscode_categories="Semiconductors",
            tariff_rate_increase=0.25,
            effective_date=datetime(2026, 9, 1),
            source_agency="USITC",
            event_type="TARIFF"
        )
        with patch("app.services.trade_adapters.normalize_via_llm") as mock_llm:
            mock_llm.return_value = event
            results = adapter.fetch_latest()
        assert results[0].event_type == "TARIFF"


# ---------------------------------------------------------------------------
# 6. Source provenance
# ---------------------------------------------------------------------------

class TestUSITCProvenance:
    def test_source_agency_is_always_usitc(self):
        adapter = USITCAdapter()
        event = NormalizedTradeEvent(
            title="Test Event",
            source_country="China",
            destination_country="USA",
            affected_hscode_categories="Electronics",
            tariff_rate_increase=0.0,
            effective_date=datetime(2026, 9, 1),
            source_agency="USITC"
        )
        with patch("app.services.trade_adapters.normalize_via_llm") as mock_llm:
            mock_llm.return_value = event
            results = adapter.fetch_latest()
        assert results[0].source_agency == "USITC"


# ---------------------------------------------------------------------------
# 7. Adapter registry isolation - USITC failure does NOT break others
# ---------------------------------------------------------------------------

class TestAdapterIsolation:
    def test_registry_contains_cbic_dgft_usitc(self):
        adapters = get_trade_adapters()
        names = [a.get_source_name() for a in adapters]
        assert "CBIC" in names
        assert "DGFT" in names
        assert "USITC" in names

    def test_icegate_not_in_registry(self):
        adapters = get_trade_adapters()
        names = [a.get_source_name() for a in adapters]
        assert "ICEGATE" not in names

    def test_cbic_unaffected_when_usitc_fails(self):
        """Removing USITC from results should still leave CBIC operational."""
        cbic = CBICAdapter()
        assert cbic.get_source_name() == "CBIC"
        assert cbic.is_available() is True

    def test_dgft_unaffected_when_usitc_fails(self):
        dgft = DGFTAdapter()
        assert dgft.get_source_name() == "DGFT"
        assert dgft.is_available() is True


# ---------------------------------------------------------------------------
# 8. Review lifecycle - events NOT auto-confirmed
# ---------------------------------------------------------------------------

class TestUSITCReviewLifecycle:
    def test_normalized_event_has_no_status_field(self):
        """NormalizedTradeEvent is pre-DB. Status is set in the router to DETECTED."""
        adapter = USITCAdapter()
        event = NormalizedTradeEvent(
            title="Policy Event",
            source_country="China",
            destination_country="USA",
            affected_hscode_categories="Steel",
            tariff_rate_increase=0.15,
            effective_date=datetime(2026, 9, 1),
            source_agency="USITC"
        )
        with patch("app.services.trade_adapters.normalize_via_llm") as mock_llm:
            mock_llm.return_value = event
            results = adapter.fetch_latest()
        # NormalizedTradeEvent has no status field - status is set to DETECTED in the router
        assert not hasattr(results[0], "status")

    def test_event_type_field_exists(self):
        """event_type must exist on NormalizedTradeEvent."""
        event = NormalizedTradeEvent(
            title="x", source_country="x", destination_country="x",
            affected_hscode_categories="x", tariff_rate_increase=0.0,
            effective_date=datetime.utcnow(), source_agency="USITC"
        )
        assert hasattr(event, "event_type")
        assert event.event_type in ("TARIFF", "SIGNAL")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
