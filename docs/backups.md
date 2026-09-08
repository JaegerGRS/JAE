# Backups

Implemented (Milestone 2 part 1):
- Create encrypted backup
- Verify backup integrity and decryption
- Staged restore with preflight diff and rollback guard
- Backup metadata history through API and database records
- Signed backup metadata (HMAC-SHA256)
- Optional encrypted backup export to local mirror directory

Encryption:
- Uses cryptography Fernet authenticated encryption.
- Key is loaded from JAE_AI_BACKUP_KEY or generated locally at data/keys/backup.key.
- Keys are local-only and must never be committed.

Metadata signing:
- Uses HMAC-SHA256 over canonical metadata JSON.
- Key is loaded from JAE_AI_BACKUP_SIGNING_KEY or generated locally at data/keys/backup-signing.key.
- Verification fails if metadata is tampered.

API endpoints:
- GET /api/v1/backups
- POST /api/v1/backups/create
- POST /api/v1/backups/verify
- POST /api/v1/backups/preflight
- POST /api/v1/backups/restore
- POST /api/v1/backups/export

Restore flow:
- Run preflight to compute deterministic action plan and plan hash.
- Restore call may include expected plan hash.
- If the hash changed, restore is rejected.
- If write fails mid-restore, changed files are rolled back.

Next:
- Add backup policy scheduling and encrypted off-device sync.
