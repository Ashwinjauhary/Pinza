# Pingza - Production Ready Chat App

**Pingza** is a modern, privacy-focused real-time messaging application featuring a beautiful glassmorphism UI.

## Features
- 🚀 **Real-time Messaging**: Instant delivery via WebSockets.
- 🔒 **Private & Global Chat**: 1-on-1 secure conversations and public rooms.
- 📸 **Media Sharing**: Image upload support.
- 💅 **Premium UI**: Glassmorphism design, smooth animations, and responsive layout.
- 💾 **Persistence**: SQLite database for messages and LocalStorage for sessions.
- ⌨️ **Typing Indicators**: Live feedback when others are typing.

## Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)

### 1. Setup Server
```bash
cd server
npm install
npm run dev
```

### 2. Setup Client
```bash
cd client
npm install
npm run dev
```

Visit `http://localhost:5173` to start chatting!

## Production Deployment (Docker)

Pingza is container-ready. 

```bash
docker build -t pingza .
docker run -p 4000:4000 pingza
```

The app will be available at `http://localhost:4000`.

## Repository
[https://github.com/Ashwinjauhary/Pinza](https://github.com/Ashwinjauhary/Pinza)

## Tech Stack
- **Frontend**: React, TypeScript, TailwindCSS, Framer Motion
- **Backend**: Node.js, Express, Socket.IO, WebRTC
- **Database**: SQLite (easy to swap for PostgreSQL)
- **Deployment**: Docker, Docker Compose

## Deployment Guide

### Using Docker Compose (Recommended)
You can bring up the entire stack with a single command:

```bash
docker compose up --build
```
> Note: If you have an older Docker version, use `docker-compose up --build`.

### Manual Push to GitHub
If you need to update the repository code manually:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```
