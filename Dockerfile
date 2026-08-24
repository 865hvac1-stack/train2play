FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time placeholders — overridden at runtime by the host (Railway, Render, etc.)
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ARG AUTH_SECRET=build-time-placeholder-secret-minimum-32-chars
ARG AUTH_URL=http://localhost:43123
ARG NEXT_PUBLIC_APP_URL=http://localhost:43123
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV AUTH_URL=$AUTH_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NODE_ENV=production

RUN npm run build

ENV PORT=43123
EXPOSE 43123

CMD ["sh", "scripts/start-production.sh"]
