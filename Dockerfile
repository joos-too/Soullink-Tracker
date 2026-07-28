# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_BACKEND=supabase
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_FIREBASE_PROJECT_ID=soullink-tracker-local
ARG VITE_USE_FIREBASE_EMULATOR=false

ENV VITE_BACKEND=$VITE_BACKEND \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_USE_FIREBASE_EMULATOR=$VITE_USE_FIREBASE_EMULATOR

RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN mkdir -p /maintenance-src /maintenance/fonts && \
    cp -r /usr/share/nginx/html/fonts /maintenance-src/fonts
COPY maintenance.html /maintenance-src/maintenance.html
COPY docker/maintenance-entrypoint.sh /maintenance-entrypoint.sh
RUN chmod +x /maintenance-entrypoint.sh

ENTRYPOINT ["/maintenance-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
