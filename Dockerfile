FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl redis-server && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN export DATABASE_URL="postgresql://build:build@localhost:5432/build" \
DIRECT_URL="postgresql://build:build@localhost:5432/build" \
&& npx prisma generate \
&& npm run build
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=320
CMD ["sh", "start.sh"]