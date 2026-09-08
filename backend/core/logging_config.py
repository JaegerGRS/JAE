from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


class RedactingFilter(logging.Filter):
    """Redacts simple secret-like key/value patterns in log messages."""

    REDACT_KEYS = ("api_key", "token", "password", "secret")

    def filter(self, record: logging.LogRecord) -> bool:
        text = str(record.msg)
        for key in self.REDACT_KEYS:
            marker = f"{key}="
            if marker in text.lower():
                parts = text.split()
                cleaned: list[str] = []
                for part in parts:
                    low = part.lower()
                    if low.startswith(marker):
                        cleaned.append(f"{part.split('=')[0]}=***")
                    else:
                        cleaned.append(part)
                record.msg = " ".join(cleaned)
        return True


def configure_logging(log_dir: Path, log_level: str = "INFO") -> None:
    log_dir.mkdir(parents=True, exist_ok=True)
    root = logging.getLogger()
    root.setLevel(log_level.upper())

    for handler in list(root.handlers):
        root.removeHandler(handler)

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = RotatingFileHandler(
        filename=log_dir / "application.log",
        maxBytes=2_000_000,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    file_handler.addFilter(RedactingFilter())

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.addFilter(RedactingFilter())

    root.addHandler(file_handler)
    root.addHandler(console_handler)
