from __future__ import annotations

import uvicorn

from backend.api.dependencies import _config


if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=_config.server.host,
        port=_config.server.port,
        log_level="info",
    )
