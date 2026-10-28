import ScaleDiagram from "./ScaleDiagram";
import { FlowDiagram } from "./Diagrams";
import { Bullets, Callout, H3, Mono, P, Table } from "./ui";
import type { SectionDef } from "./ui";

function Problems() {
  return (
    <>
      <P>Real problems hit while building, in the order they mattered.</P>
      <Table
        head={["Problem", "What happened", "Fix"]}
        rows={[
          [
            "Rate-limit errors shown as prices",
            "Two copies shared one Finnhub key. Finnhub answered “Too many requests”, the error was stored and broadcast like a price, and the ticker strip crashed on a missing price.",
            "Check each quote before storing it, skip bad ones, and make the strip ignore items without a price.",
          ],
          [
            "Free hosts needed a card",
            "Free VM and container hosts wanted an international credit card, and student cloud credits could not be activated.",
            "Render free web service plus Neon Postgres.",
          ],
          [
            "Free Redis too small",
            "A managed free plan allows about 500 thousand commands a month. The fetch loop writes about 1.4 million.",
            "Run Redis inside the app container.",
          ],
          [
            "Database never slept",
            "A snapshot every 2 minutes kept the free database awake all month.",
            "Write a snapshot row only when a stock’s trade timestamp changes.",
          ],
          [
            "Docker build failed",
            "prisma generate refused to run without DATABASE_URL.",
            "Placeholder URLs during the build step only. Real values arrive at runtime.",
          ],
          [
            "Next.js build failed on login",
            "useSearchParams() needs a Suspense boundary.",
            "Wrapped the login form in Suspense.",
          ],
          [
            "Login failed in production mode",
            "Auth.js raised UntrustedHost.",
            <>
              Set <Mono>AUTH_TRUST_HOST=true</Mono>.
            </>,
          ],
          [
            "Database URL rejected on Render",
            "Quotes pasted into the environment value became part of the URL.",
            "Removed the quotes. Environment values are exact strings.",
          ],
          [
            "Prices never moved live",
            "The socket client was hardcoded to localhost.",
            <>
              Connect with <Mono>io()</Mono> to the same origin.
            </>,
          ],
          [
            "A retry could trade twice",
            "Dedupe lived in Redis, which a restart wipes, and the form made a new key on every click.",
            "Idempotency key moved into the Postgres order ledger. The form keeps one key per order.",
          ],
          [
            "Two orders could corrupt a balance",
            "Both read the same balance, then both wrote.",
            "Lock the user row inside the transaction.",
          ],
          [
            "Emails never arrived",
            "Render blocks SMTP, and Brevo flagged the Gmail sender as non-compliant.",
            "Send through a Google Apps Script relay over HTTPS.",
          ],
          [
            "Type errors after a schema change",
            "The migration did not run because the database container was off, so the Prisma client lacked the new tables.",
            "Start the database, then run the migration, which also regenerates the client.",
          ],
          [
            "Login felt broken",
            "No loading state, no signup link, unstyled signup page.",
            "Loading states, links between login and signup, a styled signup form.",
          ],
          [
            "Chart too basic and too heavy",
            "A line chart fed by every raw row.",
            "Candlestick chart with SQL bucketing and a cache.",
          ],
          [
            "Free host goes to sleep",
            "Render idles the service after 15 minutes.",
            "An uptime monitor pings the health route.",
          ],
        ]}
      />
      <Callout title="Lessons">
        <Bullets
          items={[
            "Run the production build locally before deploying. It catches errors that dev mode hides.",
            "Treat environment variables as exact strings.",
            "Check data from outside before storing it.",
          ]}
        />
      </Callout>
    </>
  );
}

function Scaling() {
  return (
    <>
      <P>How this would run on more than one server, and what is already ready.</P>
      <ScaleDiagram />

      <H3>What already works across instances</H3>
      <Bullets
        items={[
          "Each instance subscribes to the same Redis channel and pushes to its own browsers, so adding instances adds capacity.",
          "Orders are safe: the row lock and the unique key live in Postgres, not in an instance.",
          "Sessions are JWTs, so no shared session store is needed.",
          "Positions and holdings are computed on read, so no scheduled job is involved.",
        ]}
      />

      <H3>What breaks with two instances</H3>
      <Table
        head={["Problem", "Why", "Fix"]}
        rows={[
          [
            "Double upstream calls",
            "Both instances run the fetch loop: 64 calls a minute against a 60 limit. Snapshots would also duplicate.",
            "Only one instance runs the jobs (a leader lock in Redis), or a separate worker process.",
          ],
          [
            "Redis not shared",
            "Redis lives inside each container.",
            "One managed Redis. Only the connection URL changes.",
          ],
          [
            "Socket long-polling",
            "Long-polling sends several requests per connection and they must reach the same instance.",
            "Sticky sessions on the load balancer, or WebSocket-only transport.",
          ],
          [
            "Per-user push",
            "A message for one user must reach the instance holding that socket.",
            "The Socket.io Redis adapter. Not needed today, because every update goes to everyone.",
          ],
          [
            "Database connections",
            "Many instances means many connections.",
            "Use the pooled connection URL (already in use).",
          ],
        ]}
      />

      <H3>Status</H3>
      <Table
        head={["Item", "Status"]}
        rows={[
          ["Fan-out through Redis subscribe on each instance", "Built"],
          ["Idempotent, lock-protected orders across instances", "Built"],
          ["Leader lock for the jobs", "Designed, not built"],
          ["Shared managed Redis", "Designed, not built"],
          ["Sticky sessions or WebSocket-only", "Designed, not built"],
          ["Socket.io Redis adapter", "Designed, not needed yet"],
        ]}
      />
    </>
  );
}

function Security() {
  return (
    <>
      <Table
        head={["Risk", "What is done"]}
        rows={[
          ["Stolen password database", "Passwords stored as bcrypt hashes. Login says only “invalid email or password”."],
          ["Stolen TPIN or OTP database", "Stored as HMAC with a secret pepper kept outside the database."],
          ["Guessing a TPIN", "5 wrong tries lock it for 15 minutes."],
          ["Guessing an OTP", "3 tries, 5 minute life, single use, at most 5 requests per 10 minutes."],
          ["Reusing an OTP for another sell", "The OTP is bound to the symbol, quantity and source of one order."],
          ["Reset link abuse", "Random token, only its hash stored, one use, 30 minutes, one email a minute per account, same answer whether or not the account exists."],
          ["Fake prices from the client", "The server reads the price from Redis. The browser sends none."],
          ["Accessing someone else’s account", "Each API route checks the session on the server and uses the session’s user ID."],
          ["Bad input", "Whole-number quantity from 1 to 100,000, key length limit, password 8 to 72 characters. Database queries use parameters."],
          ["Leaked secrets", "Keys, URLs and the pepper live only in server environment variables. Env files are git-ignored and excluded from the Docker image."],
        ]}
      />
      <H3>Known gaps</H3>
      <Bullets
        items={[
          "No limit on login attempts.",
          "A stolen JWT works until it expires, because sessions cannot be revoked.",
          "Email is a weak second factor: whoever reads the mailbox gets both the TPIN and the OTP.",
          "Money is stored as floating-point numbers. A real system uses integer minor units or decimals.",
          "Email goes out from a personal Gmail account with a daily quota.",
        ]}
      />
    </>
  );
}

function Testing() {
  return (
    <>
      <H3>Checks used</H3>
      <Table
        head={["Check", "How", "What it caught"]}
        rows={[
          ["Type check", <Mono key="1">npx tsc --noEmit</Mono>, "A dead comparison in the trade dialog, and missing Prisma models"],
          ["Production build with the databases stopped", <Mono key="2">npm run build</Mono>, "The login Suspense error and pages that touched the database at build time"],
          ["Production run on the laptop", <Mono key="3">NODE_ENV=production node server.js</Mono>, "The UntrustedHost login error"],
          ["Manual click-through", "Sign up, log in, watchlist, trade, history", "UI and flow problems"],
          [
            "Concurrency script",
            <>
              <Mono>scripts/idem-test.mjs</Mono>: 10 parallel requests with one key, 10 parallel orders against a small balance, a replay after wiping Redis
            </>,
            "Result: to be recorded",
          ],
        ]}
      />
      <Callout title="Not built" tone="honest">
        <Bullets
          items={[
            "No automated unit or integration test suite.",
            "No alerting or metrics dashboard.",
          ]}
        />
      </Callout>

      <H3>What the logs say</H3>
      <Table
        head={["Log line", "Meaning"]}
        rows={[
          [<Mono key="a">Fetched and stored all stocks</Mono>, "One fetch cycle finished"],
          [<Mono key="b">Skipping SYMBOL</Mono>, "A quote was rejected, the last good price stays"],
          [<Mono key="c">Broadcasting</Mono>, "An update was pushed to browsers"],
          [<Mono key="d">Snapshot: wrote N rows</Mono>, "History saved"],
          [<Mono key="e">Snapshot skipped</Mono>, "No stock had a new trade"],
          [<Mono key="f">Client connected / disconnected</Mono>, "A browser joined or left the socket"],
          [<Mono key="g">email failed</Mono>, "A TPIN, OTP or reset email did not go out"],
        ]}
      />
      <Bullets
        items={[
          <>
            <Mono>/api/health</Mono> returns <Mono>{"{ ok: true }"}</Mono>. The uptime monitor calls it.
          </>,
          "Render’s Logs and Metrics tabs show errors and memory.",
        ]}
      />
    </>
  );
}

function Deployment() {
  return (
    <>
      <H3>What happens on every push</H3>
      <FlowDiagram
        label="Deploy steps from git push to a live service"
        steps={[
          { text: "git push to main" },
          { text: "Render builds the Docker image" },
          { text: "Container starts start.sh" },
          { text: "Redis starts, the script waits for it" },
          { text: "prisma migrate deploy runs on Neon" },
          { text: "node server.js starts web, sockets, jobs" },
          { text: "Health check /api/health passes: live" },
        ]}
      />

      <H3>Local versus production</H3>
      <Table
        head={["", "Local", "Production"]}
        rows={[
          ["App", "npm run dev, or node server.js", "Docker container on Render (Singapore)"],
          ["Postgres", "Docker container", "Neon (Singapore), pooled URL"],
          ["Redis", "Docker container", "Inside the app container"],
          ["Email", "Printed in the terminal", "Google Apps Script relay"],
          ["Keep-awake", "Not needed", "Uptime monitor on the health route"],
        ]}
      />

      <H3>Environment variables</H3>
      <Table
        head={["Name", "Purpose"]}
        rows={[
          [<Mono key="1">DATABASE_URL</Mono>, "Pooled Postgres URL for the app"],
          [<Mono key="2">DIRECT_URL</Mono>, "Direct Postgres URL for migrations"],
          [<Mono key="3">REDIS_URL</Mono>, "Redis address (the local one in production)"],
          [<Mono key="4">FINNHUB_API_KEY</Mono>, "Market data"],
          [<Mono key="5">NEXTAUTH_SECRET</Mono>, "Signs sessions"],
          [<Mono key="6">AUTH_URL</Mono>, "Public site address"],
          [<Mono key="7">AUTH_TRUST_HOST</Mono>, "Lets Auth.js run behind Render’s proxy"],
          [<Mono key="8">TPIN_PEPPER</Mono>, "Secret for hashing TPIN and OTP"],
          [<Mono key="9">MAIL_RELAY_URL / MAIL_RELAY_SECRET</Mono>, "Email relay"],
        ]}
      />

      <H3>Build details</H3>
      <Bullets
        items={[
          "Placeholder database URLs are set only during the build step. Real values arrive at runtime.",
          "A Node memory limit keeps the process inside the 512 MB free allowance.",
          ".dockerignore keeps node_modules, build output and env files out of the image.",
          "Migration files are committed to git and applied at startup.",
        ]}
      />

      <H3>Free-tier limits</H3>
      <Table
        head={["Service", "Limit that mattered"]}
        rows={[
          ["Render", "About 512 MB RAM, idles after 15 minutes, no shell, SMTP blocked"],
          ["Neon", "Scales to zero when idle, monthly compute budget"],
          ["Finnhub", "About 60 calls a minute"],
          ["Gmail relay", "About 100 emails a day"],
        ]}
      />

      <H3>Deploy process</H3>
      <Bullets
        items={[
          "Auto-deploy on push. There is no separate CI pipeline, and the type check is run by hand.",
          "To go back, redeploy the previous build in Render. Database migrations only go forward.",
        ]}
      />
    </>
  );
}

export const part4: SectionDef[] = [
  { id: "problems", number: "06", title: "Problems and fixes", render: Problems },
  { id: "scaling", number: "07", title: "Scaling beyond one server", render: Scaling },
  { id: "security", number: "08", title: "Security", render: Security },
  { id: "testing", number: "09", title: "Testing and observability", render: Testing },
  { id: "deployment", number: "10", title: "Deployment", render: Deployment },
];