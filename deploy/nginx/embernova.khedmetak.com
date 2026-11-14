# /etc/nginx/sites-available/embernova.khedmetak.com (symlinked into sites-enabled)
# EmberNova: nginx terminates TLS (Let's Encrypt, certbot webroot) and proxies to uvicorn on 127.0.0.1:8020.

server {
    listen 80;
    listen [::]:80;
    server_name embernova.khedmetak.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/embernova/acme;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name embernova.khedmetak.com;

    ssl_certificate     /etc/letsencrypt/live/embernova.khedmetak.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/embernova.khedmetak.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000" always;

    client_max_body_size 128k;
    # No limit_conn: under HTTP/2 it counts concurrent streams, and the media page legitimately
    # opens dozens (thumbnails + video ranges). Per-IP request rates are limited below instead.

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_vary on;
    gzip_types text/css application/javascript application/json text/csv image/svg+xml text/event-stream;

    access_log /var/log/nginx/embernova-access.log;
    error_log  /var/log/nginx/embernova-error.log warn;

    # Content-hashed build assets: served by nginx, cached for a year.
    location /assets/ {
        alias /var/www/embernova/current/frontend/dist/assets/;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Content-Type-Options "nosniff" always;
        access_log off;
        try_files $uri =404;
    }

    # Live SI research turns stream Server-Sent Events: no buffering, long reads.
    location ~ ^/api/sessions/[^/]+/messages$ {
        limit_req zone=embernova_turns burst=4 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:8020;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # Overwrite (never append): the app rate-limits on the first X-Forwarded-For entry.
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Original NASA media and PDFs: stream byte ranges straight through, no temp-file spooling.
    location ~ ^/api/(media/[^/]+/stream|files/[^/]+/original)$ {
        limit_req zone=embernova_api burst=150 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:8020;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_max_temp_file_size 0;
        proxy_read_timeout 300s;
    }

    location / {
        limit_req zone=embernova_api burst=150 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:8020;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Connection "";
        proxy_read_timeout 120s;
    }
}
