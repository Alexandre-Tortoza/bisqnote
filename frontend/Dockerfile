FROM node:22-alpine AS build

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# NOTE: --no-frozen-lockfile because the lockfile has stale overrides from
# an old beta Vue setup; run `pnpm install` locally to regenerate cleanly.
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm build

# ---

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
