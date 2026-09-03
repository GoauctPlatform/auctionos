# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD sed -i -e "s/listen 80;/listen ${PORT:-80};/g" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
