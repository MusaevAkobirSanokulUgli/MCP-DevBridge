# ============================================================
# MCP DevBridge - Node.js MCP Server
# Parameterized build for github-server, database-server, filesystem-server
# ============================================================

FROM node:20-alpine AS builder

ARG SERVER_NAME
ENV SERVER_NAME=${SERVER_NAME}

WORKDIR /app

# Install native build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install ALL dependencies (dev included for tsc)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY shared/ ./shared/
COPY ${SERVER_NAME}/ ./${SERVER_NAME}/

# Compile TypeScript, then prune dev deps
RUN npx tsc && npm prune --omit=dev

# Runtime stage - minimal image
FROM node:20-alpine AS runner

ARG SERVER_NAME
ENV SERVER_NAME=${SERVER_NAME}
ENV NODE_ENV=production

WORKDIR /app

# Install runtime native libraries needed by better-sqlite3
RUN apk add --no-cache libstdc++

# Copy only production artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create data directories and non-root user
RUN mkdir -p /data /sandbox \
    && addgroup -S appgroup && adduser -S -G appgroup -u 1001 appuser \
    && chown -R appuser:appgroup /app /data /sandbox

USER appuser

CMD node dist/${SERVER_NAME}/index.js
