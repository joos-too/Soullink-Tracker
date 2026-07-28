#!/bin/sh
# Sync maintenance page and fonts to the mounted volume on every start
cp -f /maintenance-src/maintenance.html /maintenance/maintenance.html
cp -f /maintenance-src/fonts/* /maintenance/fonts/

exec "$@"
