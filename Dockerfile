# ---------- build ----------
FROM --platform=linux/amd64 node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --ignore-scripts
COPY tsconfig.json tsdown.config.ts ./
COPY src ./src
RUN npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package.json ./
# лише runtime deps (у нас немає prod-deps, але лишимо інсталяцію пустою для чистоти)
RUN adduser -D -H app && chown -R app:app /app
USER app
ENTRYPOINT ["node","/app/dist/cli.js"]
