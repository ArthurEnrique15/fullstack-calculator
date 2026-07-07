# Nginx expectations (frontend container)

Coordination note for the Frontend agent (Prism). The `frontend` service in `docker-compose.yml` owns its own `nginx.conf`; this is what integration expects from it so `docker compose up` yields a working end-to-end app.

## Required behavior

1. **Serve the built SPA** from `/usr/share/nginx/html` (or wherever the Dockerfile copies `dist/`) on port `80` inside the container.
2. **SPA fallback:** unknown paths return `index.html` (`try_files $uri $uri/ /index.html;`) so client-side routing works.
3. **Reverse-proxy `/api/`** to the backend service:
   - Upstream: `http://backend:8080` (service name from `docker-compose.yml`).
   - Preserve request method, body, and headers.
   - Do **not** rewrite `/api` off the path — the backend routes on `/api/v1/calculate` directly.
4. **Health**: optionally proxy `/healthz` too, or leave it — the backend has its own healthcheck in compose.

## Reference `nginx.conf` snippet

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # SPA
  location / {
    try_files $uri $uri/ /index.html;
  }

  # API reverse proxy
  location /api/ {
    proxy_pass http://backend:8080;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Why

- Single browser origin → no CORS in the happy path. The backend's CORS middleware stays as a dev safety net.
- Backend hostname `backend` resolves via Docker's default bridge network. If the compose service name changes, update `proxy_pass`.
