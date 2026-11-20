# syntax=docker/dockerfile:1
FROM node:26-alpine AS build
WORKDIR /src
COPY src/AssistaJunto.React/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --include=dev
COPY src/AssistaJunto.React/ ./
RUN npm run build

FROM nginx:alpine
ENV REACT_API_UPSTREAM=http://api:5000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    NGINX_ENVSUBST_FILTER="^(REACT_API_UPSTREAM|NGINX_LOCAL_RESOLVERS)$"
RUN rm -f /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html
COPY --from=build /src/dist /usr/share/nginx/html
COPY --chmod=755 docker/react-upstream.envsh /docker-entrypoint.d/05-react-upstream.envsh
COPY docker/react-nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -T 3 -O /dev/null http://127.0.0.1:3000/healthz || exit 1
