# Supabase Setup

## Installing Supabase

Followed [this](https://supabase.com/docs/guides/self-hosting/docker) guide for self-hosting.

Quick start via `curl -fsSL https://supabase.link/setup.sh | sh`.

After script finish, start stack:

```bash
cd supabase-project && \
sh run.sh start
```

View the generated credentials any time via:

```bash
sh run.sh secrets
```

### Supabase URLs

If not entered in the install script, in `supabase-project/.env`, configure the public Supabase and application URLs:

```dotenv
SUPABASE_PUBLIC_URL=https://supabase.soullink-tracker.de
API_EXTERNAL_URL=https://supabase.soullink-tracker.de/auth/v1
SITE_URL=https://soullink-tracker.de
```

After changing these values, recreate the stack:

```bash
cd supabase-project
sh run.sh recreate
```

### Password length

Require at least eight characters for new passwords and password changes. In
`supabase-project/.env`, configure Supabase Auth with:

```dotenv
GOTRUE_PASSWORD_MIN_LENGTH=8
```

Recreate the Auth service after changing this value:

```bash
cd supabase-project
docker compose up -d --force-recreate auth
```

The equivalent local CLI setting is maintained in `supabase/config.toml` as
`minimum_password_length = 8`. Existing migrated Firebase passwords remain
valid even if they are shorter; the limit applies when creating or changing a
password.

### Bind Kong to localhost only

In `supabase-project/docker-compose.yml`, bind Kong's HTTP port to localhost.
Nginx is responsible for TLS, so do not publish Kong's HTTPS port:

```yaml
ports:
  - "127.0.0.1:8000:8000/tcp"
  # - "127.0.0.1:8443:8443/tcp"
```

Recreate only Kong after this change:

```bash
docker compose up -d --force-recreate kong
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Expected output for `supabase-kong` includes
`127.0.0.1:8000->8000/tcp`. Ports such as `8001-8004/tcp` and `8443-8447/tcp`
without a host address are container-internal and are not exposed publicly.

### Bind the database pooler to localhost only

Supavisor (the `pooler` service) exposes PostgreSQL-compatible ports `5432`
(session mode) and `6543` (transaction mode). The web application communicates
with Supabase through Kong and does not need either database port exposed to the
Internet.

In the `pooler` service in `supabase-project/docker-compose.yml`, bind both
published ports to localhost (adjust the existing port variables if the Compose
file uses them):

```yaml
ports:
  - "127.0.0.1:5432:5432/tcp"
  - "127.0.0.1:6543:6543/tcp"
```

Recreate the pooler and verify that neither port is bound to `0.0.0.0` or
`[::]`:

```bash
docker compose up -d --force-recreate supavisor
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Expected output includes:

```text
supabase-pooler  127.0.0.1:5432->5432/tcp, 127.0.0.1:6543->6543/tcp
```

For database administration from a remote computer, use an SSH tunnel rather
than exposing PostgreSQL publicly:

```bash
ssh -L 5432:127.0.0.1:5432 your-user@your-server
```

Ports shown by `docker ps` without a host mapping, such as `5000/tcp` or
`3000/tcp`, are container-internal. Only mappings in the form
`IP:host-port->container-port` are published on the server.

### Prepare branch-specific frontend deployments

The staging and production workflows deploy the same parameterized
`docker-compose.yml` into separate server directories. Create a persistent
`.env` beside the copied Compose file in each directory. The deployment
workflow updates only `docker-compose.yml` and leaves these files in place.

Staging:

```dotenv
COMPOSE_PROJECT_NAME=soullink-tracker-staging
IMAGE_TAG=staging
APP_PORT=8068
```

Production:

```dotenv
COMPOSE_PROJECT_NAME=soullink-tracker-production
IMAGE_TAG=latest
APP_PORT=8067
```

Set the `DEPLOY_PATH` variable in the GitHub `staging` and `production`
environments to the respective directory. Also set each environment's
`APP_URL` variable to its public frontend URL. The distinct Compose project
names, image tags, directories, and host ports prevent either deployment from
replacing the other.

Create the matching database safety marker once through an administrative
connection:

```sql
-- Run only on the staging database:
alter database postgres set app.environment = 'staging';

-- Run only on the production database:
alter database postgres set app.environment = 'production';
```

Reconnect after setting the marker. The deployment pipeline checks it before
running any migration.

### Nginx virtual host

Create an Nginx config for the Supabase subdomain, you can also integrate the Frontend in here as well (without subdomain):

```nginx
server {
    listen 443 ssl;
    server_name soullink-tracker.de;

    include /etc/nginx/includes/default-sl.conf;

    location / {
        proxy_pass http://127.0.0.1:8067;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name supabase.soullink-tracker.de;

    include /etc/nginx/includes/default-sl.conf;

    location /realtime/v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket specific headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Studio, Auth, REST, Storage, Functions, GraphQL, and other API routes.
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}


server {
    listen 80;
    server_name supabase.soullink-tracker.de;
    return 301 https://$host$request_uri;
}

```

Enable and validate the site:

```bash
sudo ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Studio and verification

Open `https://supabase.janlieder.de` and sign in with `DASHBOARD_USERNAME` (standard is `supabase`) and
`DASHBOARD_PASSWORD` from `../.env` (or from `sh run.sh secrets`).

Verify Auth through the reverse proxy:

```bash
curl -I https://supabase.janlieder.de/auth/v1/
```

An HTTP `401 Unauthorized` response is expected and confirms that Nginx can
reach Kong and Supabase Auth.

## Enabling analytics

Logs & Analytics are not included in the default configuration to reduce the memory footprint. To enable them:

```bash
sh run.sh config add logs && \
sh run.sh start
```

This layers docker-compose.logs.yml on top of the base configuration and starts two additional services:

- Logflare (Analytics) - log management and event analytics
- Vector - collects logs from all running containers and forwards them to Logflare

The Log Explorer in Studio is also enabled automatically. Note that these services increase resource requirements.
