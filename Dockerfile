# Stage 1: Build React Frontend
FROM node:22-alpine AS frontend
WORKDIR /app
# Copy the frontend folder into /app/frontend to maintain structure
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN rm -rf dist && npm run build && npm run build:ssr

# Stage 2: Build Go Backend
FROM golang:1.24-alpine AS backend
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
# Copy the backend folder into /app/backend to maintain structure
COPY backend ./backend
WORKDIR /app/backend
RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server/main.go

# Stage 3: Final Production Image
# Using node image to have Node.js available for SSR sidecar
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache sqlite-libs ca-certificates

# We recreate the exact structure Go expects via runtime.Caller and relative paths
# Binary location: /app/backend/cmd/server/server
# backendRoot (3 levels up): /app/backend
# From backendRoot:
#   - uploads: ./uploads -> /app/backend/uploads
#   - assets: ../frontend/dist/client/assets -> /app/frontend/dist/client/assets
#   - custom-emojis: ../emoji -> /app/emoji

# 1. Copy Backend Binary
WORKDIR /app/backend/cmd/server
COPY --from=backend /app/backend/server .

# 2. Copy Backend Uploads (structure)
WORKDIR /app/backend/uploads
COPY --from=backend /app/backend/uploads .

# 3. Copy Frontend Assets & SSR Sidecar
WORKDIR /app/frontend
COPY --from=frontend /app/frontend/dist ./dist
COPY --from=frontend /app/frontend/server.js .
COPY --from=frontend /app/frontend/package.json .
# Install only production dependencies (express) for the sidecar
RUN npm install --production --legacy-peer-deps

# 4. Copy Emoji Directory
WORKDIR /app/emoji
COPY emoji .

# Set WORKDIR back to binary location for start
WORKDIR /app/backend/cmd/server

ENV PORT=8080
ENV GIN_MODE=release
EXPOSE 8080

# This CMD will be used if startCommand is not set or overridden
CMD ["./server"]
