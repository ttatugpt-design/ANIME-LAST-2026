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

# 1. Copy Backend Binary to /app/backend/ so the server binary location
#    allows os.Getwd() == /app (the project root)
COPY --from=backend /app/backend/server ./backend/server

# 2. Copy Backend Uploads
COPY --from=backend /app/backend/uploads ./backend/uploads

# 3. Copy Frontend Assets & SSR Sidecar
COPY --from=frontend /app/frontend/dist ./frontend/dist
COPY --from=frontend /app/frontend/server.js ./frontend/server.js
COPY --from=frontend /app/frontend/package.json ./frontend/package.json
# Install only production dependencies (express) for the sidecar
WORKDIR /app/frontend
RUN npm install --production --legacy-peer-deps

# 4. Copy Emoji Directory
WORKDIR /app
COPY emoji ./emoji

# Set WORKDIR to project root so os.Getwd() returns /app
WORKDIR /app

ENV PORT=8080
ENV GIN_MODE=release
EXPOSE 8080

# Run server from project root - os.Getwd() will be /app
CMD ["./backend/server"]
