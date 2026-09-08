from __future__ import annotations

from backend.hardware.detector import HardwareDetector


def test_detect_returns_profile() -> None:
    detector = HardwareDetector()
    profile = detector.detect()

    assert profile.device_id
    assert profile.hostname
    assert profile.cpu.cores >= 0
    assert profile.total_ram_gb > 0
