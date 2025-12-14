# Stage 1: Build Client
FROM node:20-alpine as client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client ./
# Build with prod config (API_URL is empty for relative path or set via ARG)
RUN npm run build

# Stage 2: Build Server
FROM node:20-alpine as server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server ./
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine
WORKDIR /app

# Create data directory for SQLite persistence
RUN mkdir -p /app/data && chown node:node /app/data

# Copy built server
COPY --from=server-build /app/server/package*.json ./
COPY --from=server-build /app/server/dist ./dist
# Install ONLY production dependencies
RUN npm ci --only=production

# Copy built client to public folder (server logic serves this)
COPY --from=client-build /app/client/dist ./public
# Copy uploads dir structure
RUN mkdir -p /app/uploads && chown node:node /app/uploads

# Env defaults
ENV NODE_ENV=production
ENV PORT=4000
ENV DB_PATH=/app/data/database.sqlite

# Expose port
EXPOSE 4000

# Use non-root user for security
USER node

# Start
CMD ["node", "dist/server.js"]
