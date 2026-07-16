# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install --global pnpm@11.13.1
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM dependencies AS build
COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY src ./src
COPY server ./server
RUN pnpm build

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

FROM node:24-bookworm-slim AS runtime
ARG VERSION=dev
ARG REVISION=unknown
ARG CREATED=unknown
ENV NODE_ENV=production
ENV PORT=8787
ENV DB_PATH=/app/data/scene-map.db
ENV APP_VERSION=$VERSION
ENV APP_REVISION=$REVISION
WORKDIR /app

LABEL org.opencontainers.image.title="Scene Map" \
      org.opencontainers.image.description="A local-first K-drama and Korean film journal" \
      org.opencontainers.image.source="https://github.com/swilcox/kdrama-graph" \
      org.opencontainers.image.url="https://github.com/swilcox/kdrama-graph" \
      org.opencontainers.image.documentation="https://github.com/swilcox/kdrama-graph#readme" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.revision=$REVISION \
      org.opencontainers.image.created=$CREATED

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
COPY --chown=node:node scripts ./scripts
COPY --from=build --chown=node:node /app/dist ./dist

RUN mkdir -p /app/data /app/backups && chown node:node /app/data /app/backups
USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8787/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "--import", "tsx", "server/index.ts"]
