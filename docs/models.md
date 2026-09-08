# Models

- Model metadata is tracked in config/models.yaml.
- Model binaries must be downloaded to data/models/.
- Manifest includes capability tags used by selector and router.

Implemented model management APIs:
- GET /api/v1/models/status
- GET /api/v1/models/downloads
- POST /api/v1/models/download
- GET /api/v1/models/download/{job_id}
- POST /api/v1/models/download/{job_id}/cancel
- DELETE /api/v1/models/{model_id}

Download behavior:
- Streams model downloads to .part files
- Supports resume when server supports range requests
- Supports cancellation
- Verifies SHA256 when a real checksum is provided
- Promotes .part to final model file only after verification
- Applies configurable max concurrent downloads and queueing policy
- Persists job state to data/models/.download_jobs.json for restart visibility
- Marks in-flight jobs as interrupted after service restart

Note:
- Replace placeholder SHA256 values in config/models.yaml for strict integrity checking.
