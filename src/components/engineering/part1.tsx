import ArchitectureDiagram from "./ArchitectureDiagram";
import { Bullets, Callout, H3, Mono, P, Steps, Table } from "./ui";
import type { SectionDef } from "./ui";

function Glance() {
  return (
    <>
      <P>
        Callisto is a simulated real-time stock trading platform. It shows live US stock prices
        pushed to every open browser, candlestick charts, and a paper-money trading engine whose
        orders cannot be executed twice, with bank-style authorization (a TPIN and a one-time
        password) before any sell.
      </P>

      <Table
        head={["Topic", "Detail"]}
        rows={[
          ["Stocks tracked", "32 US-listed stocks"],
          ["Price source", "Finnhub quote API, free tier (60 calls per minute limit)"],
          [
            "Price update path",
            "One server job polls Finnhub every 60 seconds, stores quotes in Redis, and pushes them to all browsers over Socket.io",
          ],
          [
            "Trading",
            "Simulated. Every user starts with $10,000 of virtual cash. Orders fill instantly at the latest price known to the server",
          ],
          ["Source of truth", "PostgreSQL: users, balances, holdings, orders, price history, security tokens"],
          ["Live data store", "Redis: latest quotes, chart cache, publish/subscribe channel"],
          ["Frontend", "Next.js (App Router), React, TypeScript, Tailwind CSS, lightweight-charts for candles"],
          ["Realtime", "Socket.io (WebSocket, with HTTP long-polling as the fallback transport)"],
          ["Authentication", "Auth.js credentials login, bcrypt password hashes, JWT sessions"],
          ["Hosting", "Render free web service (Docker) plus Neon Postgres. Total cost: zero"],
        ]}
      />

      <Callout title="Five ideas that shape everything">
        <Steps
          items={[
            <>
              <b>One producer, many consumers.</b> The server polls the data provider once and fans
              the result out to everyone. The number of users never changes the number of upstream
              calls.
            </>,
            <>
              <b>Redis for data you can rebuild, Postgres for data you cannot.</b> A lost price
              refills in a minute. A lost order is lost money.
            </>,
            <>
              <b>Every order is one atomic transaction that also records its own idempotency key.</b>{" "}
              A double click or a retry can never create a second trade.
            </>,
            <>
              <b>Charts are summarized in SQL.</b> The browser receives a bounded number of candles
              however much history exists.
            </>,
            <>
              <b>Every decision was made under real limits</b> (free tiers, API quotas, no credit
              card) and the trade-offs are written down here instead of hidden.
            </>,
          ]}
        />
      </Callout>

      <Callout title="What this project is not" tone="honest">
        <P>
          It is a simulator, not a brokerage. No real money moves, there is no order book or
          matching engine, and prices come from a free data feed. The section on how real brokers
          work explains exactly where Callisto matches industry practice and where it simplifies.
        </P>
      </Callout>

      <H3>How to read this page</H3>
      <P>
        The page goes from the big picture to the details. Sections 01 to 03 explain what was built
        and the overall shape of the system. Later sections cover each technology choice with the
        alternatives that were rejected, the low-level design, the problems that were hit and fixed,
        how the system would scale, and the measured results.
      </P>
    </>
  );
}

function Problem() {
  return (
    <>
      <H3>The problem</H3>
      <P>
        Trading apps look simple on the surface: a list of prices, a buy button, a portfolio. Under
        the surface they combine three hard problems in one small product.
      </P>
      <Bullets
        items={[
          <>
            <b>Data that changes constantly and must reach many people.</b> Prices move every
            second, and every open screen should update without each screen hammering the data
            provider.
          </>,
          <>
            <b>Money.</b> A bug here has a cost. An order must never run twice, a balance must never
            go negative, and two simultaneous actions must never corrupt each other.
          </>,
          <>
            <b>History that grows forever.</b> Charts must stay fast when there are a million rows
            behind them, not just a hundred.
          </>,
        ]}
      />
      <P>
        Callisto exists to solve these three problems at small scale using the same patterns that
        production systems use, and to be honest about where it simplifies.
      </P>

      <H3>Goals and how success is judged</H3>
      <Table
        head={["ID", "Goal", "Success criterion"]}
        rows={[
          [
            "G1",
            "Live prices on every screen without each browser calling the data provider",
            "Upstream calls stay at 32 per minute whether 1 or 1,000 users are online",
          ],
          [
            "G2",
            "An order is never executed twice, even with retries or double clicks",
            "A repeated request with the same key returns the original receipt and creates no new order",
          ],
          [
            "G3",
            "Balance and holdings stay consistent under simultaneous orders",
            "Parallel orders are serialized per user and the balance never goes below zero",
          ],
          [
            "G4",
            "Price history that stays fast as data grows",
            "Each chart request returns a bounded number of candles regardless of history size",
          ],
          [
            "G5",
            "Sensitive actions need extra proof",
            "A sell needs a TPIN and an OTP that is bound to that exact order",
          ],
          [
            "G6",
            "Run for free and survive free-tier limits",
            "Deployed at zero cost, with each limit and its workaround documented",
          ],
        ]}
      />

      <H3>Scope: what is deliberately left out</H3>
      <Bullets
        items={[
          "Real money, real brokerage connectivity, KYC. These need regulatory licences.",
          "An order book and matching engine. Orders fill against a single reference price.",
          "Limit, stop, and good-till-triggered orders. Only market orders exist.",
          "Margin, short selling, dividends, splits, and other corporate actions.",
          "Multiple currencies. Rupee amounts shown are an approximate display using a fixed rate.",
          "A native mobile app. The web app is responsive.",
        ]}
      />

      <H3>Typical scenarios the design must support</H3>
      <Steps
        items={[
          "A learner opens the dashboard and sees prices update live.",
          "They open a stock, look at a one-day candle chart, and add it to their watchlist.",
          "They place a buy: review the total, confirm, and receive a receipt.",
          "The shares appear under Positions today and move to Holdings on the next trading day.",
          "They sell: enter the TPIN emailed at signup, then an emailed one-time password, then confirm.",
          "They forget their password and reset it through an emailed one-time link.",
        ]}
      />

      <H3>Why a simulator</H3>
      <P>
        A real brokerage needs licences, identity verification, and a connection to an exchange or
        clearing member. A simulator removes that legal weight while keeping every engineering
        problem that matters: live data distribution, transactional correctness, and security
        around sensitive actions.
      </P>
    </>
  );
}

function Requirements() {
  return (
    <>
      <H3>Functional requirements</H3>
      <Table
        head={["ID", "Requirement", "Implemented by"]}
        rows={[
          ["F1", "Sign up, log in, reset a forgotten password", "Auth.js credentials provider, API routes, emailed one-time tokens"],
          ["F2", "See live prices for 32 stocks", "Fetch loop, Redis, Socket.io, dashboard"],
          ["F3", "Stock page with 1D, 1W, 1M candlestick chart", "History API with SQL bucketing, lightweight-charts"],
          ["F4", "Personal watchlist", "Watchlist table and API"],
          ["F5", "Buy and sell with a review step and a receipt", "Trade preview API, trade API, trade dialog"],
          ["F6", "Positions (bought today) and Holdings (earlier), with Add and Exit", "Holding rows with a today-quantity and trading date, split on read"],
          ["F7", "Order history", "Order table, which is also the ledger"],
          ["F8", "Extra authorization for sells", "Emailed TPIN, then emailed OTP"],
          ["F9", "Public engineering write-up", "This page"],
        ]}
      />

      <H3>Non-functional requirements</H3>
      <Table
        head={["Quality", "Target", "Mechanism"]}
        rows={[
          ["Correctness", "No duplicate orders, no negative balance", "One database transaction per order, per-user row lock, unique idempotency key"],
          ["Freshness", "Prices at most about one minute old, plus propagation time", "60 second poll interval, immediate push on update"],
          ["Resilience to bad upstream data", "A failed or rate-limited quote never overwrites a good price", "Validate each quote before storing; skip invalid ones"],
          ["Availability on a free tier", "Reachable when someone opens it", "Health endpoint plus an external uptime pinger to prevent idling"],
          ["Performance", "Bounded response sizes", "SQL candle bucketing, cache lifetimes matched to bucket size"],
          ["Security", "Secrets never stored in plain text; guessing is expensive", "bcrypt passwords, HMAC with a secret pepper for TPIN and OTP, lockouts, one-time hashed tokens"],
          ["Cost", "Zero", "Free tiers only"],
          ["Operability", "Problems can be found quickly", "Structured log lines per job, health route, deploy logs"],
        ]}
      />

      <H3>Hard constraints and what each one forced</H3>
      <Table
        head={["Constraint", "Consequence", "Decision"]}
        rows={[
          [
            "Finnhub free tier allows about 60 calls per minute",
            "Two users each polling 32 stocks would already exceed the limit",
            "A single server-side producer polls for everyone; requests are sent in batches of 5 with short pauses",
          ],
          [
            "No credit card available",
            "Free tiers that require a card (several cloud VM and container hosts) were not an option",
            "Render free web service plus Neon free Postgres",
          ],
          [
            "Render free: about 512 MB RAM, a fraction of a CPU, idles after 15 minutes, outbound SMTP blocked",
            "No always-on VM, no separate Redis service, no SMTP email",
            "One Docker image that runs Redis alongside the app, an uptime pinger, and an HTTPS email relay instead of SMTP",
          ],
          [
            "Managed free Redis allows roughly 500 thousand commands a month",
            "The fetch loop alone writes about 1.4 million times a month",
            "Redis runs inside the application container, where there is no command quota",
          ],
          [
            "Neon free Postgres scales to zero and has a monthly compute budget",
            "Writing a row every two minutes around the clock keeps the database awake all month",
            "Snapshots are written only when a stock has a new trade timestamp; connections use the pooled endpoint",
          ],
          [
            "A few days to build and polish",
            "Breadth would come at the cost of depth",
            "Features were cut (good-till-triggered orders, alerts) in favour of correctness and design depth",
          ],
        ]}
      />

      <H3>Back-of-the-envelope capacity</H3>
      <P>These are estimates from the design, not measurements. Measured numbers appear in the metrics section.</P>
      <Table
        head={["Quantity", "Estimate", "Calculation"]}
        rows={[
          ["Finnhub calls per minute", "32 (about 53% of the limit)", "32 stocks, one call each, once per minute"],
          ["Per-user polling alternative", "Exceeds the limit at 2 users", "2 users x 32 calls = 64 per minute"],
          ["Socket messages per minute per open browser", "About 32", "One update per stock per poll"],
          ["Price snapshot rows per day, upper bound", "About 23,000", "32 stocks x 720 snapshots per day, before skipping unchanged prices"],
          ["Redis keys", "About 32 plus a few chart caches", "One key per stock, plus cached candle sets"],
        ]}
      />
    </>
  );
}

function HighLevel() {
  return (
    <>
      <H3>System diagram</H3>
      <ArchitectureDiagram />
      <Bullets
        items={[
          <>
            <b>Poll:</b> the fetch loop calls Finnhub once a minute.
          </>,
          <>
            <b>SET + PUB:</b> each valid quote is stored in Redis and published on a channel.
          </>,
          <>
            <b>SUB and WebSocket:</b> the server process subscribes to that channel and pushes each
            update to every connected browser.
          </>,
          <>
            <b>mGET and INSERT:</b> every two minutes the snapshot job copies the latest quotes into
            Postgres, only for stocks that had a new trade.
          </>,
          <>
            <b>GET and SQL:</b> the Next.js app reads quotes from Redis and everything durable from
            Postgres.
          </>,
        ]}
      />

      <H3>Components</H3>
      <Table
        head={["Component", "Responsibility", "Key files"]}
        rows={[
          [
            "Browser client",
            "Renders pages, receives pushed prices, draws charts, runs the trade dialog",
            <>
              <Mono>src/components</Mono>, <Mono>src/lib/useSocket.ts</Mono>
            </>,
          ],
          [
            "Next.js app",
            "Server-rendered pages and JSON API routes for trades, history, watchlist, signup, and password flows",
            <Mono>src/app</Mono>,
          ],
          [
            "Route gate",
            "Sends logged-out visitors away from portfolio, watchlist, and profile pages",
            <>
              <Mono>auth.config.ts</Mono>, the Next.js proxy
            </>,
          ],
          [
            "Realtime server",
            "Hosts HTTP and Socket.io on one port; subscribes to the Redis channel and broadcasts",
            <Mono>server.js</Mono>,
          ],
          [
            "Background jobs",
            "The 60 second fetch loop and the 2 minute snapshot job, started once at boot",
            <Mono>instrumentation.ts</Mono>,
          ],
          [
            "Redis",
            "Latest quotes, cached chart responses, and the publish/subscribe channel",
            <Mono>src/lib/redis.ts</Mono>,
          ],
          [
            "PostgreSQL via Prisma",
            "Users, balances, holdings, the order ledger, price history, TPIN and OTP state, reset tokens",
            <>
              <Mono>prisma/schema.prisma</Mono>, <Mono>src/lib/prisma.ts</Mono>
            </>,
          ],
          [
            "Email relay",
            "Delivers TPIN, OTP, and reset emails over HTTPS",
            <Mono>src/lib/email.ts</Mono>,
          ],
        ]}
      />

      <H3>Process model</H3>
      <P>
        Everything runs in one Docker container. A start script launches the Redis server, waits
        until it answers, applies pending database migrations, and then starts{" "}
        <Mono>server.js</Mono>. That process boots Next.js and Socket.io on a single HTTP port.
        Next.js calls the <Mono>register</Mono> hook once at startup, and that hook starts the two
        background loops.
      </P>
      <Callout title="Trade-off accepted">
        <P>
          Putting the web server, realtime server, background jobs, and Redis in one container is
          cheap and simple, and it fits free hosting. It also means Redis restarts with the app and
          the jobs cannot scale independently. The scaling section explains how this is split apart
          when more than one instance is needed.
        </P>
      </Callout>

      <H3>Main data flows</H3>
      <P>
        <b>A. Live price pipeline</b>
      </P>
      <Steps
        items={[
          "A timer in the instrumentation hook fires every 60 seconds.",
          "The 32 symbols are split into batches of 5. Each batch is fetched in parallel, with a 500 millisecond pause before the next batch, so requests never arrive as one large burst.",
          "Each response is checked. A response without a numeric current price (for example a rate-limit error) is skipped and the last good price stays in Redis.",
          "A valid quote is stored under a per-stock Redis key and published on the price-updates channel.",
          "The realtime server is subscribed to that channel. For each message it emits a price-update event through Socket.io.",
          "Every browser that is connected receives the event and updates the dashboard.",
          "Every two minutes the snapshot job reads all quotes and inserts a history row only for stocks whose trade timestamp changed since the last snapshot.",
        ]}
      />
      <P>
        <b>B. Opening the dashboard.</b> The page first loads current prices from the quotes API,
        which reads Redis, then switches to live updates from the socket.
      </P>
      <P>
        <b>C. Opening a chart.</b> The browser asks the history API for a range. The API checks the
        Redis cache, and on a miss runs one SQL query that groups snapshots into time buckets,
        caches the result for a lifetime matched to the bucket size, and returns the candles.
      </P>
      <P>
        <b>D. Placing a buy.</b> The dialog loads a preview (price and balance), and on confirm sends
        the order with a unique idempotency key. The server returns a stored result if the key was
        used before; otherwise it reads the price from Redis and runs one transaction that locks the
        user, updates cash and holdings, and writes the order row.
      </P>
      <P>
        <b>E. Placing a sell.</b> Same as a buy, with two extra steps before the order: the user
        proves the TPIN, then proves an OTP that was emailed for that exact order. The OTP is
        consumed inside the same transaction that executes the order.
      </P>
      <P>The low-level design section walks through D and E step by step.</P>

      <H3>Who owns which data</H3>
      <Table
        head={["Data", "Stored in", "Why there", "If it is lost"]}
        rows={[
          ["Latest quotes", "Redis", "Hot, read constantly, rebuilt every minute", "Refilled by the next fetch"],
          ["Publish/subscribe messages", "Redis", "Ephemeral by nature", "Next update replaces it"],
          ["Cached candle responses", "Redis", "Derived from Postgres", "Recomputed on demand"],
          ["Users and password hashes", "Postgres", "Durable identity", "Severe"],
          ["Cash balances and holdings", "Postgres", "Money must be transactional", "Severe"],
          ["Orders and idempotency keys", "Postgres", "The ledger; the key must commit atomically with the money", "Severe"],
          ["Price snapshots", "Postgres", "Durable history for charts", "Gaps in charts"],
          ["TPIN hashes, OTP challenges, reset tokens", "Postgres", "Security state must survive restarts and stay consistent with orders", "Users must reset"],
          ["Watchlists", "Postgres", "User data", "User must rebuild"],
        ]}
      />

      <H3>Push and pull: what is actually used</H3>
      <P>
        The server <b>pulls</b> from Finnhub on a schedule and <b>pushes</b> to browsers. That is
        not long-polling toward the browser. Socket.io may begin a connection with HTTP long-polling
        and then upgrades to a WebSocket when it can, which is why the scaling section talks about
        sticky sessions.
      </P>

      <H3>Trust boundaries</H3>
      <Bullets
        items={[
          "The browser is untrusted. It never sends a price; the server reads the price from Redis at execution time.",
          "Every API route that touches an account checks the session on the server.",
          "Secrets (database URL, API keys, pepper, email relay secret) exist only in server environment variables.",
          "Orders carry a hash of their own parameters, so an OTP issued for one order cannot authorize a different one.",
        ]}
      />
    </>
  );
}

export const part1: SectionDef[] = [
  { id: "glance", number: "00", title: "At a glance", render: Glance },
  { id: "problem", number: "01", title: "Problem, goals and scope", render: Problem },
  { id: "requirements", number: "02", title: "Requirements and constraints", render: Requirements },
  { id: "high-level-design", number: "03", title: "High-level design", render: HighLevel },
];