FROM node:26-alpine AS build
WORKDIR /src
COPY src/AssistaJunto.React/package*.json ./
RUN npm ci
COPY src/AssistaJunto.React/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /src/dist /usr/share/nginx/html
COPY docker/react-nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 3000
