# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend ./
RUN npm run build

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
# It expects:
# - ./uploads
# - ../../../frontend/dist/client/...
# - ../../../emoji

# Copy binary to the expected location
WORKDIR /app/backend/cmd/server
COPY --from=backend /app/server .

# Copy uploads to the expected location
COPY --from=backend /app/uploads ./uploads

# Copy frontend assets to the expected location
WORKDIR /app/frontend/dist
COPY --from=frontend /app/dist .

# Copy emoji directory to the expected location
WORKDIR /app/emoji
COPY emoji .

# Set WORKDIR back to where the binary is
WORKDIR /app/backend/cmd/server

# Environment setup
ENV PORT=8080
ENV GIN_MODE=release

# Expose port
EXPOSE 8080

# Run the server
CMD ["./server"]
