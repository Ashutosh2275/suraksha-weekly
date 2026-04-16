# Multi-stage Dockerfile for Worker Web (Next.js)
# Development target for hot-reload

FROM node:20-alpine as base

WORKDIR /app

# Development target
FROM base as development

# Install dependencies for the entire workspace
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/worker-web/package.json ./apps/worker-web/

RUN npm ci

# Copy source code (will be mounted as volume for hot-reload)
COPY packages/shared-types ./packages/shared-types
COPY apps/worker-web ./apps/worker-web

# Build shared types
WORKDIR /packages/shared-types
RUN npm run build

WORKDIR /app/apps/worker-web

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "run", "dev"]

# Production target
FROM base as production

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/worker-web/package.json ./apps/worker-web/

RUN npm ci --production

COPY packages/shared-types ./packages/shared-types
COPY apps/worker-web ./apps/worker-web

WORKDIR /packages/shared-types
RUN npm run build

WORKDIR /app/apps/worker-web
RUN npm run build

EXPOSE 3000

ENV NODE_ENV production
ENV PORT 3000

CMD ["npm", "start"]
