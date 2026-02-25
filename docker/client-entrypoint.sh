#!/bin/sh
# Injeta API_BASE_URL no appsettings.json do Blazor WASM em runtime
CONFIG="/usr/share/nginx/html/appsettings.json"

if [ -n "$API_BASE_URL" ]; then
    echo "{\"ApiBaseUrl\": \"$API_BASE_URL\"}" > "$CONFIG"
    echo "Blazor config: ApiBaseUrl=$API_BASE_URL"
fi
