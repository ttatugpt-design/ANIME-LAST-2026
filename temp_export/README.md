# Enterprise SaaS Starter (React 19 + Go)

A production-ready SaaS template featuring a React 19 frontend and Golang backend with Clean Architecture, RBAC, and strict Enterprise Design System.

## Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Language**: TypeScript (Strict)
- **Styling**: Tailwind CSS + shadcn/ui (Inter font, Monochrome theme)
- **State Management**: Zustand (Auth), TanStack Query (Data)
- **Routing**: React Router v7

### Backend
- **Language**: Golang 1.22+
- **Framework**: Gin
- **Database**: PostgreSQL (GORM)
- **Auth**: JWT (Access + Refresh Tokens) + BCrypt

## Getting Started

### Prerequisites
- Node.js 20+
- Go 1.22+
- PostgreSQL Running

### Setup

1. **Clone & Install**
   ```bash
   # Frontend
   cd frontend
   npm install

   # Backend
   cd backend
   go mod tidy
   ```

2. **Configuration**
   - Copy `backend/.env.example` to `backend/.env` and update DB credentials.
   ```bash
   cp backend/.env.example backend/.env
   ```

3. **Run Locally**
   - **Backend**:
     ```bash
     cd backend
     go run cmd/server/main.go
     # Server: http://localhost:8080
     ```
   - **Frontend**:
     ```bash
     cd frontend
     npm run dev
     # Client: http://localhost:5173
     ```

## Features

- **Authentication**: Login, Token Rotation, HttpOnly Cookies.
- **RBAC**: Role-Based Access Control (Admin, User, Viewer).
- **Dashboard**: Stats widgets.
- **User Management**: Add/Edit Users.

## Project Structure

- `frontend/`: Vite App
- `backend/internal/core`: Domain Logic (Ports & Services)
- `backend/internal/adapters`: Handlers & Repositories
