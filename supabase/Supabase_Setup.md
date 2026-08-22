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

### Authentication email templates

The branded account-confirmation and password-recovery templates live in
`public/auth-email-templates`. Local Supabase loads them directly through
`supabase/config.toml`. Restart the local stack after changing a template:

```bash
supabase stop
supabase start
```

The self-hosted Auth service loads custom templates from URLs. Because these
files are deployed with the frontend, copy
[`docker-compose.auth-email-templates.yml`](docker-compose.auth-email-templates.yml)
beside the self-hosted Supabase `docker-compose.yml`, then enable the override
and recreate Auth:

```bash
cd supabase-project
sh run.sh config add auth-email-templates
docker compose up -d --force-recreate auth
```

The override builds the template URLs from `SITE_URL`. They must be reachable
from the Auth container, so deploy the frontend templates first and ensure
`SITE_URL` is the public HTTPS frontend URL. Both emails also load the app logo
through that URL.

### Staging SMTP sink

Use Mailpit for hosted staging rehearsals. It accepts every address but does
not deliver messages to the Internet. The web inbox is bound to server
loopback, and the SMTP port is available only inside the staging Compose
network.

Copy [`docker-compose.mailpit.yml`](docker-compose.mailpit.yml) beside the
staging Supabase `docker-compose.yml`. Do not install this override in the
production stack. In the staging stack's `.env`, add:

```dotenv
SMTP_ADMIN_EMAIL=staging@soullink-tracker.invalid
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_SENDER_NAME=Soullink Tracker Staging
MAILPIT_UI_PORT=8025
ENABLE_EMAIL_AUTOCONFIRM=false
```

The `.invalid` sender domain is intentional and cannot be a public mail
destination. The base Supabase Compose file maps these `SMTP_*` values to the
Auth service's `GOTRUE_SMTP_*` settings.

Enable the override and recreate Auth:

```bash
cd /path/to/staging/supabase-project
sh run.sh config add mailpit
docker compose up -d mailpit
docker compose up -d --force-recreate auth
docker compose ps mailpit auth
docker compose exec auth sh -c \
  'printf "host=%s port=%s user=%s\n" "$GOTRUE_SMTP_HOST" "$GOTRUE_SMTP_PORT" "$GOTRUE_SMTP_USER"'
```

The printed host and port must be `mailpit` and `1025`. `docker compose ps`
must show Mailpit's UI as `127.0.0.1:8025->8025/tcp`; it must not show a
published SMTP port.

To make the inbox convenient for multiple staging operators, expose it through
a dedicated HTTPS Nginx virtual host with Basic Auth. Keep the Docker port
bound to `127.0.0.1`; Nginx is the only public entry point. Create a DNS record
such as `staging-mail.example.com` for the server, provision a matching TLS
certificate, and create the password file:

```bash
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd-mailpit staging-operator
sudo chown root:www-data /etc/nginx/.htpasswd-mailpit
sudo chmod 640 /etc/nginx/.htpasswd-mailpit
```

Omit `-c` when adding further users so the existing file is not overwritten.
Create `/etc/nginx/sites-available/staging-mailpit`:

```nginx
server {
    listen 80;
    server_name staging-mail.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name staging-mail.example.com;

    # This include or another certificate configuration must cover this host.
    include /etc/nginx/includes/default-sl.conf;

    # Apply authentication at server scope so it also covers the API and
    # WebSocket endpoint, not only the inbox page.
    auth_basic "Soullink staging mail";
    auth_basic_user_file /etc/nginx/.htpasswd-mailpit;

    add_header X-Robots-Tag "noindex, nofollow, noarchive" always;

    location / {
        proxy_pass http://127.0.0.1:8025;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 3600s;
    }
}
```

Enable and validate the virtual host:

```bash
sudo ln -s /etc/nginx/sites-available/staging-mailpit \
  /etc/nginx/sites-enabled/staging-mailpit
sudo nginx -t
sudo systemctl reload nginx
```

Verify with `docker compose ps mailpit` and `ss -ltn | grep ':8025'` that
Mailpit remains bound only to `127.0.0.1:8025`. Never proxy or publish its SMTP
port `1025`. Use a strong, unique Basic Auth password because captured messages
contain working password-reset links.

Open the configured URL, log in, and request a recovery email in the staging
frontend. Now check that:

1. exactly one message appears in Mailpit;
2. its recipient and staging sender are correct;
3. its action URL starts with the staging Supabase HTTPS hostname;
4. its `redirect_to` value is the exact staging frontend reset URL; and
5. following it through Nginx opens the staging password-reset page.

Mailpit stores captured messages under `volumes/mailpit`. Include that
directory in the staging-only reset procedure so a clean rehearsal does not
retain mail from the previous run. This sink is only for staging; replace it
with a production SMTP provider before cutover.

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
`docker-compose.yml` into separate server directories. No `.env` file is
required in either frontend deployment directory. The workflows pass the fixed
Compose project name and image tag directly to Docker Compose.

Set the `DEPLOY_PATH` variable in the GitHub `staging` and `production`
environments to the respective directory. Set `APP_PORT` to the server-local
frontend port (`8068` for staging and `8067` for production), and set `APP_URL`
to the public frontend URL. The distinct Compose project names, image tags,
directories, and host ports prevent either deployment from replacing the
other.

Create the matching database safety marker once through the internal
`supabase_admin` role. The regular `postgres` role is intentionally not a
superuser and may return `permission denied to set parameter
"app.environment"`.

Run this only from the staging Supabase Compose directory:

```bash
docker compose exec db psql \
  -U supabase_admin \
  -d postgres \
  -v ON_ERROR_STOP=1 \
  -c "alter database postgres set app.environment = 'staging';"
```

Run this only from the production Supabase Compose directory:

```bash
docker compose exec db psql \
  -U supabase_admin \
  -d postgres \
  -v ON_ERROR_STOP=1 \
  -c "alter database postgres set app.environment = 'production';"
```

Verify the value through a new ordinary connection:

```bash
docker compose exec db psql \
  -U postgres \
  -d postgres \
  -tAc "select current_setting('app.environment', true);"
```

The result must exactly match the intended environment. The deployment
pipeline checks this marker before running any migration.

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
