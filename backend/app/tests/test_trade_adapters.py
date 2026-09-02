import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from app.services.trade_adapters import (
    get_trade_adapters,
    FederalRegisterAdapter,
    USITCAdapter,
    EUTaricAdapter,
    WTOTradeMonitoringAdapter,
    MaritimePortDisruptionAdapter,
    NormalizedTradeEvent
)

def test_trade_adapter_registry():
    """Verify that all 7 enterprise trade adapters are registered and accessible."""
    adapters = get_trade_adapters()
    assert len(adapters) == 7
    source_names = [a.get_source_name() for a in adapters]
    assert "FederalRegister" in source_names
    assert "USITC" in source_names
    assert "EU_TARIC" in source_names
    assert "WTO_Monitoring" in source_names
    assert "Maritime_Chokepoints" in source_names
    assert "CBIC" in source_names
    assert "DGFT" in source_names

def test_federal_register_adapter():
    """Test Federal Register regulatory document ingestion and parsing."""
    adapter = FederalRegisterAdapter()
    assert adapter.is_available() is True
    events = adapter.fetch_latest()
    assert isinstance(events, list)
    assert len(events) >= 1
    for ev in events:
        assert isinstance(ev, NormalizedTradeEvent)
        assert ev.source_agency == "FederalRegister"
        assert ev.title != ""

def test_eu_taric_adapter():
    """Test EU TARIC customs tariff regulation adapter."""
    adapter = EUTaricAdapter()
    assert adapter.is_available() is True
    events = adapter.fetch_latest()
    assert len(events) >= 1
    assert events[0].source_agency == "EU_TARIC"

def test_wto_monitoring_adapter():
    """Test WTO Trade Monitoring & Safeguard alert adapter."""
    adapter = WTOTradeMonitoringAdapter()
    assert adapter.is_available() is True
    events = adapter.fetch_latest()
    assert len(events) >= 1
    assert events[0].source_agency == "WTO_Monitoring"

def test_maritime_chokepoints_adapter():
    """Test Maritime AIS & Choke-point disruption adapter."""
    adapter = MaritimePortDisruptionAdapter()
    assert adapter.is_available() is True
    events = adapter.fetch_latest()
    assert len(events) >= 1
    assert events[0].source_agency == "Maritime_Chokepoints"
    assert events[0].event_type == "SIGNAL"

if __name__ == "__main__":
    test_trade_adapter_registry()
    test_federal_register_adapter()
    test_eu_taric_adapter()
    test_wto_monitoring_adapter()
    test_maritime_chokepoints_adapter()
    print("ALL TRADE ADAPTER TESTS PASSED!")
