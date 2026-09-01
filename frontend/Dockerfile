# ── Stage 1: Build React app ──────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app
# Copy package files first (layer caching)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the React app
# Output goes to /app/dist
RUN npm run build


# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:alpine


# Copy built React files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
