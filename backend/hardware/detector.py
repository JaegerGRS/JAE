from __future__ import annotations

import hashlib
import platform
import socket
import subprocess
from typing import Any

import psutil

from backend.hardware.schemas import CpuInfo, GpuInfo, HardwareCapabilities, HardwareProfile


class HardwareDetector:
    """Collects hardware information with multiple fallback methods."""

    def detect(self) -> HardwareProfile:
        hostname = socket.gethostname()
        os_name = platform.system()
        os_version = platform.version()

        cpu = CpuInfo(
            model=platform.processor() or self._cpu_model_from_wmic(),
            cores=psutil.cpu_count(logical=False) or 0,
            threads=psutil.cpu_count(logical=True) or 0,
        )

        vm = psutil.virtual_memory()
        total_ram_gb = round(vm.total / (1024**3), 2)
        free_ram_gb = round(vm.available / (1024**3), 2)

        gpus = self._detect_gpus()
        capabilities = self._detect_capabilities(gpus)

        raw_device_id = f"{hostname}:{cpu.model}:{total_ram_gb}"
        device_id = hashlib.sha256(raw_device_id.encode("utf-8")).hexdigest()[:16]

        return HardwareProfile(
            device_id=device_id,
            hostname=hostname,
            os=os_name,
            os_version=os_version,
            cpu=cpu,
            total_ram_gb=total_ram_gb,
            free_ram_gb=free_ram_gb,
            gpus=gpus,
            capabilities=capabilities,
        )

    def _cpu_model_from_wmic(self) -> str:
        try:
            result = subprocess.run(
                ["wmic", "cpu", "get", "Name", "/value"],
                capture_output=True,
                text=True,
                timeout=3,
                check=False,
            )
            for line in result.stdout.splitlines():
                if line.strip().startswith("Name="):
                    return line.split("=", 1)[1].strip()
        except Exception:
            pass
        return "Unknown CPU"

    def _detect_gpus(self) -> list[GpuInfo]:
        methods = [self._gpu_from_nvidia_smi, self._gpu_from_powershell]
        seen: set[tuple[str, str, float]] = set()
        gpus: list[GpuInfo] = []
        for method in methods:
            for gpu in method():
                key = (gpu.vendor, gpu.model, gpu.vram_gb)
                if key in seen:
                    continue
                seen.add(key)
                gpus.append(gpu)
        return gpus

    def _gpu_from_nvidia_smi(self) -> list[GpuInfo]:
        try:
            result = subprocess.run(
                [
                    "nvidia-smi",
                    "--query-gpu=name,memory.total",
                    "--format=csv,noheader,nounits",
                ],
                capture_output=True,
                text=True,
                timeout=3,
                check=False,
            )
            if result.returncode != 0:
                return []
            output = result.stdout.strip()
            if not output:
                return []
            gpus: list[GpuInfo] = []
            for line in output.splitlines():
                parts = [p.strip() for p in line.split(",")]
                if len(parts) < 2:
                    continue
                model, mem_mb = parts[0], parts[1]
                try:
                    vram_gb = round(float(mem_mb) / 1024.0, 2)
                except ValueError:
                    vram_gb = 0.0
                gpus.append(GpuInfo(vendor="NVIDIA", model=model, vram_gb=vram_gb))
            return gpus
        except Exception:
            return []

    def _gpu_from_powershell(self) -> list[GpuInfo]:
        command = (
            "Get-CimInstance Win32_VideoController | "
            "Select-Object Name,AdapterRAM | ConvertTo-Json"
        )
        try:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-Command", command],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            if result.returncode != 0 or not result.stdout.strip():
                return []
            rows = self._normalize_json_rows(result.stdout)
            gpus: list[GpuInfo] = []
            for row in rows:
                name = str(row.get("Name", "Unknown")).strip()
                adapter_ram = row.get("AdapterRAM", 0)
                try:
                    vram_gb = round(float(adapter_ram) / (1024**3), 2)
                except (ValueError, TypeError):
                    vram_gb = 0.0
                vendor = self._infer_vendor(name)
                gpus.append(GpuInfo(vendor=vendor, model=name, vram_gb=vram_gb))
            return gpus
        except Exception:
            return []

    def _normalize_json_rows(self, raw: str) -> list[dict[str, Any]]:
        import json

        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [x for x in parsed if isinstance(x, dict)]
        if isinstance(parsed, dict):
            return [parsed]
        return []

    def _infer_vendor(self, model_name: str) -> str:
        low = model_name.lower()
        if "nvidia" in low or "geforce" in low or "quadro" in low:
            return "NVIDIA"
        if "amd" in low or "radeon" in low:
            return "AMD"
        if "intel" in low:
            return "INTEL"
        return "Unknown"

    def _detect_capabilities(self, gpus: list[GpuInfo]) -> HardwareCapabilities:
        has_nvidia = any(g.vendor == "NVIDIA" for g in gpus)
        has_amd = any(g.vendor == "AMD" for g in gpus)
        has_gpu = bool(gpus)
        return HardwareCapabilities(
            cuda=has_nvidia,
            hip=has_amd,
            vulkan=has_gpu,
            cpu=True,
        )
