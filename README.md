# Callisto

A simulated real-time stock trading platform. Live prices for 32 US stocks are pushed to every open browser, charts are candlesticks, and orders are paper-money trades that cannot be executed twice. Selling needs a TPIN and a one-time password.

Live demo: https://callisto-807u.onrender.com
Engineering write-up: `/engineering` in the app.

## Features

- Live prices over Socket.io, fed by one server-side producer (Finnhub, every 60 seconds)
- Candlestick charts with 1D, 1W, 1M and full-history views, summarized in SQL
- Buy and sell with a review step and a receipt
- Positions (bought today) and Holdings (earlier), with Add and Exit
- Order history that is also the ledger
- Idempotent orders: retries and double clicks create one trade
- Sell authorization: a TPIN chosen at signup, then an emailed OTP bound to the exact order
- Watchlist, password reset by emailed one-time link

## Architecture

```
Finnhub --poll 60s--> fetch loop --SET + PUBLISH--> Redis --SUBSCRIBE--> server.js --WebSocket--> browsers
                                                      |
                                                      +--> snapshot job (2 min, new trades only) --> Postgres
Next.js app + API routes <--> Redis (quotes, cache) and Postgres (users, money, orders, history)
```

- Redis holds data that can be rebuilt (latest quotes, chart cache, pub/sub).
- Postgres holds data that cannot (users, balances, holdings, orders, security state).

## Tech stack

Next.js (App Router), React, TypeScript, Tailwind CSS, Socket.io, Redis, PostgreSQL with Prisma, Auth.js (credentials, JWT sessions), bcrypt, lightweight-charts, Docker.

## Run it locally

Requirements: Node 22, Docker, a free Finnhub API key.

```bash
git clone <this repo>
cd callisto
npm install

# databases (adjust names and passwords to taste)
docker run -d --name callisto-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=callisto -p 5433:5432 postgres:16
docker run -d --name callisto-redis -p 6379:6379 redis:7-alpine

# environment
cp .env.example .env.local   # or create .env.local with the variables below

npx prisma migrate dev
npm run dev
```

Open http://localhost:3000.

Without email configured, TPIN-related OTPs and reset links are printed in the server terminal.

## Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Postgres URL used by the app (pooled in production) |
| `DIRECT_URL` | Direct Postgres URL used by migrations |
| `REDIS_URL` | Redis address, for example `redis://localhost:6379` |
| `FINNHUB_API_KEY` | Market data |
| `NEXTAUTH_SECRET` | Signs sessions |
| `AUTH_URL` | Public site address |
| `AUTH_TRUST_HOST` | Set to `true` behind a proxy such as Render |
| `TPIN_PEPPER` | Secret used when hashing TPINs and OTPs. Do not change it after users exist |
| `MAIL_RELAY_URL`, `MAIL_RELAY_SECRET` | Google Apps Script web app used to send email over HTTPS |

## Useful commands

```bash
npx tsc --noEmit                          # type check
npm run build                             # production build
NODE_ENV=production node server.js        # run the production server locally
node scripts/idem-test.mjs same           # duplicate-order test (needs a session cookie)
CLIENTS=200 SECONDS=120 node scripts/socket-load.mjs
node scripts/metrics-chart.mjs
```

## Deployment

Render free web service (Docker) plus Neon Postgres.

- `Dockerfile` builds the app and installs Redis in the same image.
- `start.sh` starts Redis, waits for it, runs `prisma migrate deploy`, then starts `server.js`.
- An uptime monitor calls `/api/health` so the free service does not idle.

## Edge cases analysed

### 1. Double clicks, retries, and simultaneous orders

- **Risk:** a user clicks Confirm twice, or the network drops after the server executed the order and the client retries. Two parallel orders could also both read the same balance and overspend.
- **Handling:**
  - Each order intent gets one idempotency key. The server stores it in the Postgres order table with a unique constraint on (user, key).
  - The order and its key are written in the same transaction as the balance and holding changes.
  - The server locks the user's portfolio row inside the transaction, so orders by one user run one after another.
  - The key is checked again after taking the lock, so a duplicate that was waiting finds the finished order.
  - A key reused with different details returns HTTP 422.
- **Where:** `src/app/api/trade/route.ts`, `src/components/stock/TradeDialog.tsx` (one key per dialog).
- **How to check:** `node scripts/idem-test.mjs same` sends 10 identical requests and should create one order. `different` sends 10 parallel buys against a small balance and the balance must never go negative. Wipe Redis and replay the same key to see the original receipt returned.
- **Remaining limits:** money is stored as floating-point numbers, and a user clicking in two different browsers creates two different intents, which is correct behavior.

### 2. Bad, missing, or stale market data

- **Risk:** Finnhub rate-limits or fails, the US market is closed, or Redis is empty after a restart. A failed response could be stored as a price and shown or traded on.
- **Handling:**
  - Every quote is validated before it is stored. A response without a numeric current price is skipped and the last good price stays.
  - Fetches go out in batches of 5 with a pause, which keeps bursts small and stays under the rate limit.
  - When the market is closed, Finnhub returns the last close, so prices stay still but trades and charts keep working. Snapshots are written only when a stock's trade timestamp changes.
  - The trade route reads the price on the server. If Redis has no price, the order is rejected before anything is written.
  - After a restart Redis is empty, and prices refill on the first fetch (a few seconds).
- **Where:** `instrumentation.ts`, `src/lib/redis.ts`, `src/app/api/trade/route.ts`.
- **How to check:** stop the app, run it again and watch `Fetch cycle: N ok, M failed` in the logs. Place a trade right after a restart and confirm it fails cleanly if the price is not loaded yet.
- **Remaining limits:** prices can be up to a minute old, and the free data tier has its own terms.

### 3. Failures during sell authorization

- **Risk:** a wrong, expired, reused, or stolen OTP; an OTP issued for one sell used on a bigger one; a sell that fails after the OTP was checked; guessing the TPIN.
- **Handling:**
  - The TPIN is a 6-digit code hashed with HMAC and a secret pepper. Five wrong tries lock it for 15 minutes.
  - The OTP lasts 5 minutes, allows 3 tries, and is tied to a hash of the symbol, quantity, and source of that exact sell.
  - The OTP is marked used inside the same database transaction that executes the order. If the order fails (for example too few shares), the transaction rolls back and the OTP stays valid.
  - If the network drops after a successful sell and the client retries with the same key, the server returns the original receipt without asking for the OTP again.
  - Two simultaneous sells with one OTP: the row lock serializes them and only the first consumes the OTP.
- **Where:** `src/lib/security.ts`, `src/app/api/sell/tpin/route.ts`, `src/app/api/trade/route.ts`.
- **How to check:** try a wrong OTP three times, then a correct one (should be refused). Request an OTP for 1 share and try to use it for 5 (refused). Sell more shares than you own with a valid OTP and confirm the OTP still works afterwards.
- **Remaining limits:** email is the second factor, so mailbox access plus the TPIN is enough to sell. Sessions are JWTs and cannot be revoked before they expire.

## Known limitations

- A simulator: no real money, no order book, market orders only.
- Prices are polled once a minute.
- Free hosting: the service idles without traffic, Redis resets on every restart, and email goes through a personal Gmail with a daily quota.
- No automated test suite. Verification is by type checks, a production build, and the scripts in `scripts/`.

## Credits

Market data from [Finnhub](https://finnhub.io). Charts by [TradingView Lightweight Charts](https://www.tradingview.com/) (see the library's licence for attribution requirements).