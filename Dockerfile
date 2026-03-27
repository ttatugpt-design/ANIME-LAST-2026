# Stage 1: Build React Frontend
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend ./
# User's local workflow: build client then build SSR
RUN npm run build && npm run build:ssr

# Stage 2: Build Go Backend
FROM golang:1.24-alpine AS backend
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend ./
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server/main.go

# Stage 3: Final Production Image
FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache sqlite-libs ca-certificates

# We must maintain the directory structure for the relative paths in main.go
# main.go is in backend/cmd/server/

# Copy binary
WORKDIR /app/backend/cmd/server
COPY --from=backend /app/server .

# Copy uploads
COPY --from=backend /app/uploads ./uploads

# Copy frontend client and server builds (preserving structure)
WORKDIR /app/frontend/dist
COPY --from=frontend /app/dist/client ./client
COPY --from=frontend /app/dist/server ./server

# Copy index.html to client (if not already there)
# Note: relative paths in main.go: ../../../frontend/dist/client/index.html

# Copy emoji directory
WORKDIR /app/emoji
COPY emoji .

# Set WORKDIR back to binary location
WORKDIR /app/backend/cmd/server

ENV PORT=8080
ENV GIN_MODE=release
EXPOSE 8080
CMD ["./server"]
