# TODO: implement later
# frontend/Dockerfile
### 1. Build Stage ###
FROM node:20-alpine as builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install
COPY . .
RUN pnpm run build

### 2. Run Stage ###
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# If you have a custom nginx config, copy it here
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]