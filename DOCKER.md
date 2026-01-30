### Development (Docker)

- Start: `docker compose up -d --build`
- App URL: `http://localhost:3000/`

Local subdomains require DNS support on your machine. On Windows, `*.localhost` does not resolve by default.

- Recommended: map hostnames in your hosts file to `127.0.0.1` (example):
  - `admin.localhost` → `127.0.0.1`
  - `school1.localhost` → `127.0.0.1`

Then use:
- SaaS admin: `http://admin.localhost:3000/saas-admin`
- Tenant: `http://school1.localhost:3000/`

If you cannot edit hosts/DNS, you can still test subdomain routing by connecting to `http://localhost:3000` and sending a `Host` header (API tests).

### Production (Docker)

- Start: `docker compose -f docker-compose.prod.yml up -d --build`
- App URL: `http://<your-domain>/`

Notes:
- Configure wildcard DNS: `*.yoursaas.com` → your server.
- The `web` container (nginx) proxies `/api/*` to the backend and forwards `X-Forwarded-Host` so tenant detection works.

