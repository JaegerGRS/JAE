# Security Baseline

- Default bind host is 127.0.0.1.
- No hardcoded API keys.
- Secrets are externalized and ignored by git.
- Log redaction filter masks simple secret key patterns.
- Frontend only accesses backend API routes.
- Model binaries remain outside git.
- Future milestones add auth, CSRF, backup encryption, node auth, and permissioned tool execution.
