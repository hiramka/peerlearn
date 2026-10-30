# Multi-stage Dockerfile for PeerLearn Production Server / School Local Appliance
# Stage 1: Build Web and Server
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY web/package*.json ./web/

RUN npm ci

COPY shared/ ./shared/
COPY server/ ./server/
COPY web/ ./web/

# Build Web PWA bundle
RUN npm run build --workspace web

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci --omit=dev

COPY --from=builder /app/shared/ ./shared/
COPY --from=builder /app/server/ ./server/
COPY --from=builder /app/web/dist/ ./web/dist/

EXPOSE 3001

CMD ["npm", "run", "dev:server"]
