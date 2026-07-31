#!/bin/sh
# Sync maintenance page and fonts to the mounted volume on every start.
# /maintenance is a mounted volume, so the directory created in the image is
# shadowed by the mount and must be (re)created here before copying.
mkdir -p /maintenance/fonts
cp -f /maintenance-src/maintenance.html /maintenance/maintenance.html
cp -rf /maintenance-src/fonts/. /maintenance/fonts/

exec "$@"
