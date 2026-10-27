import type { ReactNode } from "react";
import { Callout, Decision, H3, Mono, P, Table } from "./ui";
import type { SectionDef } from "./ui";

type Card = {
  title: string;
  chosen: string;
  why: ReactNode;
  alternatives: { name: string; verdict: ReactNode }[];
  industry: ReactNode;
  tradeoff: ReactNode;
};

type Group = { heading: string; cards: Card[] };

const groups: Group[] = [
  {
    heading: "Language and application framework",
    cards: [
      {
        title: "Language",
        chosen: "TypeScript on Node.js, front to back",
        why: "One language across the browser, the API routes, the background jobs, and the realtime server, so the shape of an order or a quote is written once and checked everywhere. The compiler caught real mistakes during this project, including a dead comparison in the trade dialog that would otherwise have shipped.",
        alternatives: [
          { name: "Plain JavaScript", verdict: "Same runtime with no compile-time checks. Code that moves money benefits from the checks." },
          { name: "Python (FastAPI or Django)", verdict: "Excellent for APIs and data work, but it would add a second language for the UI and give up shared types." },
          { name: "Go or Java/Kotlin", verdict: "Strong, common choices for high-throughput backends. They would split the codebase into two languages and slow a build measured in days." },
        ],
        industry: "Core trading systems such as matching and risk engines are usually written in C++ or Java for predictable latency. Product-facing web and API layers commonly use TypeScript or Java/Kotlin.",
        tradeoff: "A single-threaded Node process is a poor fit for CPU-heavy work. Here the work is mostly waiting on the network and the database. Password hashing is the one CPU-heavy task, and it is limited to one hash per login.",
      },
      {
        title: "Application framework",
        chosen: "Next.js (App Router) with React",
        why: "Pages render on the server for a fast first paint, API routes live in the same repository as the screens, and one deploy ships both. Its routing layer lets protected pages be gated in one place.",
        alternatives: [
          { name: "React single-page app plus a separate Express API", verdict: "Two projects, two deploys, and cross-origin configuration. More flexible, but more moving parts for the same result." },
          { name: "Remix or SvelteKit", verdict: "Comparable full-stack frameworks. Passed over for familiarity with React and Next.js." },
          { name: "Server-rendered templates (Django, Rails)", verdict: "Simple and robust, but a live-updating UI needs a JavaScript layer anyway." },
        ],
        industry: "React front ends talking to a separate API tier are very common in fintech products. Full-stack frameworks suit product web apps where speed of iteration matters.",
        tradeoff: "Next.js assumes a particular hosting model. It had to run with a custom server for sockets, and production builds are heavy on a small free machine (about ten minutes on Render).",
      },
      {
        title: "Server process",
        chosen: "A custom Node server (server.js) that hosts Next.js and Socket.io together",
        why: "Socket.io needs a long-lived HTTP server to attach to, and Next.js does not include a WebSocket server. So server.js creates the HTTP server, hands ordinary requests to Next.js, and attaches Socket.io to the same port. The Redis subscriber lives here too.",
        alternatives: [
          { name: "A separate realtime service", verdict: "Cleaner and independently scalable, which is how larger systems do it. It would mean a second free-tier service that idles separately, plus cross-service configuration." },
          { name: "Server-sent events from a Next.js route", verdict: "One-way push over plain HTTP. For a price-only feed this would genuinely have been enough. It was passed over because later features need per-user events and Socket.io’s reconnection handling." },
          { name: "A hosted realtime service (Pusher, Ably)", verdict: "No server code, but it adds a vendor, quotas, and an external dependency for the core feature." },
          { name: "Serverless hosting (Vercel, Netlify)", verdict: "Cannot hold persistent connections or run timers, so the architecture itself would have had to change." },
        ],
        industry: "A dedicated WebSocket or streaming gateway in front of the main API, behind a load balancer, is the standard shape.",
        tradeoff: "A custom server opts out of some platform-specific Next.js optimizations and ties deployment to a long-running Node host.",
      },
    ],
  },
  {
    heading: "The live data pipeline",
    cards: [
      {
        title: "Market data provider",
        chosen: "Finnhub quote API (REST, free tier)",
        why: "The free tier allows about 60 calls per minute, enough to refresh 32 stocks every minute with headroom. One simple endpoint returns current price, change, percent change, day high and low, open, previous close, and the time of the last trade. That timestamp is what lets the snapshot job skip unchanged prices.",
        alternatives: [
          { name: "Alpha Vantage", verdict: "Free quotas are far smaller, so refreshing a watchlist every minute would not be possible." },
          { name: "Polygon.io", verdict: "High quality, but free plans are heavily limited." },
          { name: "IEX Cloud", verdict: "Was a popular choice and was retired in 2024." },
          { name: "Unofficial Yahoo Finance endpoints", verdict: "No official API or support, and terms-of-use risk." },
          { name: "Mock data only", verdict: "No risk, but no real-time story, which defeats the purpose." },
        ],
        industry: "Exchanges publish through consolidated feeds (in the US, the SIP) and licensed vendors redistribute them over streaming protocols. Brokers pay licence fees, and display and redistribution rules apply.",
        tradeoff: "Prices are polled, so they can be up to a minute old. Free-tier data terms may restrict commercial redistribution. That is acceptable for a non-commercial demo and must be rechecked before any real launch.",
      },
      {
        title: "How prices are fetched",
        chosen: "One scheduled server-side producer: every 60 seconds, 32 stocks, in batches of 5",
        why: "Upstream calls become a fixed cost that does not depend on how many users are online. Batches of 5 with a 500 millisecond pause avoid sending 32 requests in one burst, which is what tends to trigger rate limiting. Sixty seconds uses about half the quota and leaves headroom.",
        alternatives: [
          { name: "Each browser calls Finnhub", verdict: "Calls grow with users, two users already exceed the quota, and the API key would be exposed in the browser." },
          { name: "Fetch on demand when a page opens, with a cache", verdict: "Cheaper when idle, but the first visitor after a quiet period waits, and live pushes to open pages would still need a producer." },
          { name: "An upstream streaming connection", verdict: "Lowest latency and the production-grade choice. It needs a long-lived upstream connection with reconnection logic, and free-tier streaming limits need checking." },
        ],
        industry: "A market data gateway ingests the vendor feed once and distributes it internally through messaging systems. Clients never talk to the vendor.",
        tradeoff: "The producer runs even with zero viewers, which wastes calls. Prices lag by up to a minute. Responses that fail validation are skipped, so the previous good price stays.",
      },
      {
        title: "Pushing prices to browsers",
        chosen: "Socket.io",
        why: "It handles reconnection and heartbeats, falls back to HTTP long-polling when a WebSocket is blocked, and provides a simple event API. It also has a Redis adapter for the multi-instance case, which gives the scaling design a direct path.",
        alternatives: [
          { name: "Raw WebSocket (the ws library)", verdict: "Lighter, standard protocol. Reconnection and heartbeat logic would have to be written and tested by hand." },
          { name: "Server-sent events", verdict: "Simplest for a one-way feed and a legitimate choice here. Passed over for bidirectional and per-user needs later." },
          { name: "Browsers polling an API", verdict: "Every user generates constant requests, and updates are never instant." },
          { name: "MQTT", verdict: "A good fit for devices and brokers, but it needs a broker and a different client stack." },
        ],
        industry: "Brokers push market data to apps over WebSockets or similar streaming protocols, fed internally by a message bus.",
        tradeoff: "Socket.io is not plain WebSocket, so clients must use its client library. Its long-polling fallback needs sticky sessions once there is more than one server.",
      },
      {
        title: "Redis",
        chosen: "Redis for latest quotes, cached chart responses, and publish/subscribe",
        why: "Reading the latest price is the hottest path in the system, and Redis answers in well under a millisecond. Publish/subscribe gives the realtime server a clean way to hear about each update, and key expiry makes cache lifetimes trivial.",
        alternatives: [
          { name: "An in-process Map", verdict: "Would work for exactly one process and is the simplest option. Passed over because state is lost on restart, cannot be shared by a second instance, and offers no publish/subscribe path for scaling." },
          { name: "Postgres LISTEN/NOTIFY", verdict: "A viable way to broadcast that would remove one component. But serving every price read from the primary database adds load and keeps the free database awake." },
          { name: "Memcached", verdict: "A fast cache with no publish/subscribe." },
          { name: "Kafka or another message broker", verdict: "Right for durable, replayable event streams at scale. Far heavier than 32 messages a minute." },
        ],
        industry: "Redis is widely used for caches, rate limiting, and publish/subscribe. Large market-data systems use specialised low-latency messaging.",
        tradeoff: "Redis pub/sub does not store messages, so a subscriber that is briefly disconnected misses updates until the next poll. That is fine for prices and unacceptable for orders, which is why orders never touch Redis.",
      },
      {
        title: "Where Redis runs",
        chosen: "Redis running inside the application container",
        why: "Managed free Redis plans limit the number of commands per month. The fetch loop alone does 32 writes a minute, about 1.4 million a month (32 x 1,440 x 30), which would use a 500 thousand command allowance in roughly eleven days. Inside the container there is no quota and latency is local. Data that is rebuilt every minute does not need durability.",
        alternatives: [
          { name: "A managed free Redis (for example Upstash)", verdict: "The command quota is exceeded in about eleven days by writes alone." },
          { name: "A separate Redis service on the same host", verdict: "Possible where a free one exists. Adds a second idle-prone service and cross-service networking." },
          { name: "No Redis", verdict: "See the Redis card above." },
        ],
        industry: "Managed Redis with replicas in a private network, separate from the application tier, so instances scale independently.",
        tradeoff: "Redis data resets on every restart or deploy, and only one app instance can share it. Acceptable for rebuildable quotes. This is documented as a free-tier shortcut: moving to a managed Redis changes only the connection URL.",
      },
    ],
  },
  {
    heading: "Data and correctness",
    cards: [
      {
        title: "Primary database",
        chosen: "PostgreSQL",
        why: "The data is relational: users own portfolios, holdings, and orders. Orders need real transactions, unique constraints, and row locks. Charts need SQL aggregation, and Postgres has a built-in time-bucketing function (date_bin) for exactly that.",
        alternatives: [
          { name: "MongoDB", verdict: "Flexible documents, and it has multi-document transactions now. But the relationships, constraints, and aggregation here fit a relational model more naturally." },
          { name: "MySQL", verdict: "A fine alternative. Postgres was chosen for date_bin, richer constraints, and the free managed options available." },
          { name: "SQLite", verdict: "Great for a single local process. It does not suit a hosted app with an ephemeral disk or more than one instance." },
          { name: "DynamoDB or Firestore", verdict: "Key-value style stores with limited transactions and no ad hoc aggregation for candles." },
          { name: "TimescaleDB or ClickHouse", verdict: "The right tools for large volumes of ticks. Overkill for 32 stocks and not available on a free tier here." },
        ],
        industry: "Brokers and banks keep ledgers in relational databases and use time-series databases for market data.",
        tradeoff: "One primary database. Reads can later move to replicas, and the price history table could move to a time-series database as it grows.",
      },
      {
        title: "Database access layer",
        chosen: "Prisma (v6)",
        why: "A typed client is generated from the schema, so a misspelled column or a wrong type fails at compile time. Migrations are versioned files that the deploy applies automatically at startup.",
        alternatives: [
          { name: "Raw SQL with a driver (pg)", verdict: "Maximum control and no generation step. More code and no compile-time checking of queries." },
          { name: "Drizzle or Knex", verdict: "Lighter alternatives. Prisma was chosen for its migration workflow and typed client." },
          { name: "TypeORM", verdict: "A heavier, decorator-based ORM with a less predictable migration story." },
        ],
        industry: "Both ORMs and hand-written SQL are common. Performance-critical trading cores tend toward hand-tuned SQL or custom storage.",
        tradeoff: "The query builder cannot express time bucketing or row locks, so those two queries use raw SQL. The generate step must run at build time, which is why the Docker build needs placeholder database variables.",
      },
      {
        title: "Where idempotency keys live",
        chosen: "Postgres: a unique (user, key) on the order ledger, committed in the same transaction as the money movement",
        why: "The key and the trade either both exist or neither does, because they commit atomically. Postgres survives restarts, and a retry minutes or days later still finds the original order. The key never expires because it is part of the ledger.",
        alternatives: [
          { name: "Redis SET NX with an expiry (the first version)", verdict: "Replaced. A restart wipes it, it lives in a separate system so the key and the money cannot commit together, and expiry makes the system forget keys." },
          { name: "Disable the button only", verdict: "Stops accidental double clicks, not retries after a timeout or a second tab." },
          { name: "Database advisory locks alone", verdict: "Serialize work but do not remember the result, so a repeat cannot be answered with the original receipt." },
        ],
        industry: "Payment systems use Stripe-style idempotency keys stored on the server. In trading protocols, a client order ID on each order lets an exchange or broker detect duplicates.",
        tradeoff: "Every order carries an extra key column and a hash of its parameters. A key reused with different parameters is rejected.",
      },
      {
        title: "Positions versus holdings",
        chosen: "Computed when read, from a today-quantity and a trading date stored with each holding",
        why: "Shares bought on the current US trading date are the position. Anything older is a holding. Because the split is derived from a date at read time, nothing has to run at midnight, nothing can be missed when a free host sleeps, and several app instances would agree automatically.",
        alternatives: [
          { name: "A nightly job that moves positions into holdings", verdict: "A scheduler that must run exactly once, and would silently fail whenever the free server is asleep at the scheduled time." },
          { name: "A table of purchase lots", verdict: "More accurate for per-lot cost basis. More schema and code than the problem needs." },
        ],
        industry: "US equities settle one business day after the trade (T+1). Indian brokers show intraday positions separately from holdings that settle into the depository account.",
        tradeoff: "One average buy price per stock, so profit and loss on a position uses the combined average. The trading date is the New York date because the market is American.",
      },
      {
        title: "Chart data",
        chosen: "SQL bucketing into candles at read time, with a Redis cache",
        why: "One query groups snapshots into time buckets and returns open, high, low, and close per bucket, with the bucket size chosen from the range. Every range returns a bounded number of candles, so payload and render cost stay constant as history grows. The cache lifetime grows with the bucket size.",
        alternatives: [
          { name: "Send raw rows and aggregate in the browser", verdict: "Payload grows with history and slows every page." },
          { name: "Precomputed candle tables", verdict: "The production approach for long ranges. More writes and a rollup job. Noted as the next step." },
          { name: "A time-series database", verdict: "Built for this, but unnecessary at this size and not on the free tier." },
        ],
        industry: "Tick data is rolled up into bars by stream processors or time-series databases, and long ranges are served from precomputed bars.",
        tradeoff: "The source is 2-minute snapshots of the latest price, not every trade. A short candle’s high and low are therefore approximate, and there is no volume.",
      },
    ],
  },
  {
    heading: "Authentication and security",
    cards: [
      {
        title: "Authentication",
        chosen: "Auth.js credentials login with JWT sessions",
        why: "No vendor dependency or cost, and full control over the TPIN and OTP flows that sit on top of login. JWT sessions need no session table and work across several instances with no shared session store.",
        alternatives: [
          { name: "A hosted service (Clerk, Auth0, Firebase Auth)", verdict: "Faster to start and has built-in account recovery and multi-factor options. Adds a vendor, free-tier limits, and less control over custom sell authorization." },
          { name: "Database-backed sessions", verdict: "Allows instant revocation. Needs a session lookup on every request." },
          { name: "Passport.js", verdict: "A solid option for Express apps. Auth.js integrates with Next.js routing more directly." },
        ],
        industry: "Brokers and banks use single sign-on or OIDC, multi-factor authentication, device binding, and server-side sessions that can be revoked.",
        tradeoff: "A JWT cannot be revoked before it expires, so a stolen session works until then. The credentials provider has no built-in recovery, so the password reset flow was built by hand.",
      },
      {
        title: "Password hashing",
        chosen: "bcrypt (bcryptjs), cost factor 10",
        why: "A slow, salted, adaptive hash that is widely trusted. The pure JavaScript package needs no native build step on a minimal Docker image. A cost of 10 keeps each hash short enough for a very small CPU.",
        alternatives: [
          { name: "argon2id", verdict: "The current first recommendation from OWASP because it is memory-hard. Needs a native module, which complicates a small free host." },
          { name: "scrypt or PBKDF2", verdict: "Acceptable. Less commonly used in Node apps." },
          { name: "Plain SHA-256", verdict: "Far too fast to resist guessing. Never appropriate for passwords." },
        ],
        industry: "argon2id, scrypt, or bcrypt, with per-user salts and rising cost factors over time.",
        tradeoff: "bcrypt only considers the first 72 bytes of input, which is why password length is capped at 72. Hashing is slow on a free CPU, so signup and login take a visible moment.",
      },
      {
        title: "Hashing the TPIN and OTP",
        chosen: "HMAC-SHA256 with a secret pepper stored in the environment, plus lockouts",
        why: "A six-digit code has only a million possibilities, so any hash of it can be reversed in moments if the database leaks. Making the hash slower would not fix that. A secret pepper that never lives in the database means a leaked database alone is not enough, and attempt limits stop online guessing.",
        alternatives: [
          { name: "bcrypt", verdict: "Slower, but the tiny keyspace still falls quickly offline, and it burns scarce CPU." },
          { name: "Plain SHA-256", verdict: "Reversible by brute force in milliseconds for six digits." },
          { name: "Storing the TPIN in plain text", verdict: "Would make a leaked database an immediate account takeover." },
        ],
        industry: "Banks verify PINs inside hardware security modules, so the key never sits next to the data.",
        tradeoff: "If the pepper is lost or changed, every TPIN must be reissued. The pepper must be protected exactly like the database password.",
      },
      {
        title: "Authorizing a sell",
        chosen: "An emailed TPIN, then an emailed one-time password bound to the exact order",
        why: "Selling is the sensitive action, so it needs more than a logged-in session. The OTP is tied to a hash of the symbol, quantity, and source, so a code issued for one sell cannot approve a different one. It is single-use, expires in five minutes, and is consumed inside the same transaction that executes the order.",
        alternatives: [
          { name: "Re-enter the password", verdict: "Better than nothing, but it proves nothing new to someone who already has the session and password." },
          { name: "SMS OTP", verdict: "A common channel. SMS gateways cost money, and in India they require sender registration." },
          { name: "An authenticator app (TOTP) or passkeys", verdict: "Stronger than email. More setup and enrollment work than fits a short build." },
        ],
        industry: "Indian depositories authorize sales of holdings with a TPIN plus a one-time password, and Callisto copies that shape. European payment rules require authentication to be linked to the amount and payee, which is the same idea as binding the OTP to the order.",
        tradeoff: "Email is a weaker second factor than an authenticator app: someone with access to the mailbox gets both the TPIN and the OTP.",
      },
      {
        title: "Sending email",
        chosen: "A Google Apps Script web app that sends through the project’s Gmail account, called over HTTPS",
        why: "Render’s free tier blocks the SMTP ports, so classic SMTP is out. Email providers want a sender domain with DKIM and DMARC alignment, which a Gmail address cannot provide through a third party. The first attempt with Brevo ran into exactly that. Sending through Google’s own servers keeps the mail signed by Google, so it reaches inboxes, with no domain or card needed.",
        alternatives: [
          { name: "SMTP (Gmail or any provider)", verdict: "Blocked on the free host." },
          { name: "Brevo with a Gmail sender", verdict: "Tried first. Brevo flags freemail senders as not compliant with the Google, Yahoo and Microsoft sender rules." },
          { name: "Resend, SendGrid, or SES", verdict: "Need a verified domain, and SES additionally needs an account with a payment method." },
        ],
        industry: "A transactional email service with an authenticated domain (SPF, DKIM, DMARC), a dedicated sender address, bounce handling, and monitoring. High-stakes codes often go by SMS or an authenticator app instead.",
        tradeoff: "About a hundred recipients a day for a free Gmail account, mail from a personal address, and a single point of failure. Fine for a demo and the first thing to replace in production.",
      },
    ],
  },
  {
    heading: "Frontend",
    cards: [
      {
        title: "Styling",
        chosen: "Tailwind CSS with CSS variables for the colour tokens",
        why: "Fast to build and consistent, with a small CSS output because unused classes are dropped. Colours and borders come from shared variables, so the whole look can change in one place.",
        alternatives: [
          { name: "CSS modules or plain CSS", verdict: "No dependency, but more files and naming discipline." },
          { name: "styled-components or Emotion", verdict: "Runtime styling that adds cost and complicates server rendering." },
          { name: "A component library (MUI, Chakra)", verdict: "Fast to start. Hard to make look unlike every other app built with it." },
        ],
        industry: "Design systems with tokens (colour, spacing, type) are the norm, implemented with whichever styling tool the team prefers.",
        tradeoff: "Long class strings in markup, and a convention (not a type system) holding the design together.",
      },
      {
        title: "Charts",
        chosen: "lightweight-charts (TradingView’s open-source library)",
        why: "It is built for financial data: native candlestick series, a time axis, crosshair, and smooth drawing on a canvas even with hundreds of candles. It is small, and its look matches what traders expect.",
        alternatives: [
          { name: "Recharts (used for the first version)", verdict: "Line charts only out of the box, SVG-based so it slows with many points. Candles would need custom shapes. Replaced." },
          { name: "Chart.js or ECharts", verdict: "Capable general charting. Candlesticks need plugins or configuration, and the financial look takes more work." },
          { name: "The full TradingView widget", verdict: "Feature-rich, but it embeds third-party code and data, which hides the work this project is meant to show." },
          { name: "D3", verdict: "Total control and total effort." },
        ],
        industry: "Brokers use TradingView widgets or in-house canvas and WebGL charts.",
        tradeoff: "A narrower library than a full charting suite, with no built-in indicators. Its licence asks for an attribution notice, so a credit line must be added to the page.",
      },
    ],
  },
  {
    heading: "Delivery and hosting",
    cards: [
      {
        title: "Packaging",
        chosen: "Docker",
        why: "The image contains Node, the Redis binary, and the start script, so the same artifact runs locally and in production. It was the only way to ship Redis alongside the app on a host with no separate Redis service.",
        alternatives: [
          { name: "The host’s native Node build", verdict: "Simpler and faster to build, but there is nowhere to put the Redis server." },
          { name: "A virtual machine with manual setup", verdict: "Maximum control, no reproducibility, and no free option available without a card." },
        ],
        industry: "Containers orchestrated by Kubernetes or ECS, with images built in CI and promoted through environments.",
        tradeoff: "Builds take longer on a small builder, and the start script has to manage two processes in one container.",
      },
      {
        title: "Application hosting",
        chosen: "Render free web service (Singapore)",
        why: "It runs a Docker image, supports WebSockets and long-running processes, gives HTTPS automatically, deploys from GitHub, and needs no credit card.",
        alternatives: [
          { name: "Vercel or Netlify", verdict: "Serverless, so they cannot hold sockets or run the background timers the design depends on." },
          { name: "Oracle Cloud, Fly.io, Koyeb", verdict: "Free tiers that require a credit card." },
          { name: "Student cloud credits", verdict: "Pursued, but the offer could not be activated for this account." },
          { name: "An always-on virtual machine", verdict: "The ideal fit. No free one was available without a card." },
        ],
        industry: "Containers on Kubernetes or ECS across availability zones behind a load balancer, with autoscaling, rolling deploys, and managed databases.",
        tradeoff: "The service idles after 15 minutes without traffic, so an external uptime monitor pings its health route. It has about 512 MB of RAM and a fraction of a CPU, an ephemeral disk, no shell, and outbound SMTP blocked.",
      },
      {
        title: "Database hosting",
        chosen: "Neon (serverless Postgres, Singapore)",
        why: "Free managed Postgres with a pooled connection endpoint suited to short-lived app connections, scale-to-zero when idle, and no card needed to sign up.",
        alternatives: [
          { name: "Render’s free Postgres", verdict: "Expires after a trial period, which is unsuitable for data that must persist." },
          { name: "Another managed Postgres (Supabase and similar)", verdict: "A comparable option. Neon’s pooled endpoint and scale-to-zero fit this workload." },
          { name: "Docker Postgres only", verdict: "Perfect for development, not a hosted database." },
        ],
        industry: "Managed Postgres (RDS, Cloud SQL, Aurora) with automated backups, read replicas, and failover across zones.",
        tradeoff: "The first query after an idle period is slower while the database wakes, so the connection timeout is raised. There is a monthly compute budget, which is one reason snapshots skip unchanged prices.",
      },
    ],
  },
];

function Tech() {
  return (
    <>
      <P>
        This section records every technology choice as a card. Each card answers the same five
        questions: what was chosen, why, what else was considered, what industry practice looks
        like, and what was given up. Where an alternative would also have been a reasonable choice,
        the card says so.
      </P>
      <Callout title="One principle behind most choices">
        <P>
          If losing the data is harmless, it goes in Redis. If losing it would cost money or trust,
          it goes in Postgres. Most of the cards below are that rule applied.
        </P>
      </Callout>

      {groups.map(function (group) {
        return (
          <div key={group.heading} className="flex flex-col gap-4">
            <H3>{group.heading}</H3>
            {group.cards.map(function (card) {
              return (
                <Decision
                  key={card.title}
                  title={card.title}
                  chosen={card.chosen}
                  why={card.why}
                  alternatives={card.alternatives}
                  industry={card.industry}
                  tradeoff={card.tradeoff}
                />
              );
            })}
          </div>
        );
      })}

      <H3>Smaller libraries and tools</H3>
      <Table
        head={["Tool", "Role", "Why it was chosen", "Alternative"]}
        rows={[
          [<Mono key="a">redis (node-redis)</Mono>, "Redis client", "The official client, with a dedicated connection for subscribing", "ioredis, which is also solid"],
          [<Mono key="b">tsx</Mono>, "Runs TypeScript at startup", "Lets the custom server load TypeScript files without a separate build step", "Compile ahead of time with tsc"],
          [<Mono key="c">Node crypto</Mono>, "HMAC, random digits, constant-time compare", "Built in, so no extra dependency for security-critical code", "A third-party crypto library"],
          [<Mono key="d">Intl.DateTimeFormat</Mono>, "New York trading date", "Built in and correct for time zones and daylight saving time", "date-fns-tz or Luxon"],
          [<Mono key="e">UptimeRobot</Mono>, "Pings the health route to keep the free host awake", "Free, needs no card", "A cron service, or a paid always-on plan"],
          [<Mono key="f">GitHub</Mono>, "Source control and the deploy trigger", "Render deploys from it on every push", "GitLab or Bitbucket"],
        ]}
      />
    </>
  );
}

export const part2: SectionDef[] = [
  { id: "technology-choices", number: "04", title: "Technology choices", render: Tech },
];