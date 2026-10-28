import ErDiagram from "./ErDiagram";
import { FlowDiagram, SequenceDiagram } from "./Diagrams";
import { Bullets, Callout, Code, H3, Mono, P, Steps, Table } from "./ui";
import type { SectionDef } from "./ui";

function LowLevel() {
  return (
    <>
      <H3>Data model</H3>
      <ErDiagram />
      <Bullets
        items={[
          "Tables are linked by a userId column. The schema declares no foreign keys, so the application keeps the link.",
          "Money lives in UserPortfolio and PortfolioHolding.",
          "Order is the ledger and also the idempotency record.",
          "TpinCredential, OtpChallenge and PasswordResetToken hold security state.",
          "PriceHistory has one row per stock per snapshot, indexed on stockId and timestamp.",
        ]}
      />

      <H3>API endpoints</H3>
      <Table
        head={["Endpoint", "Method", "Purpose"]}
        rows={[
          [<Mono key="1">/api/signup</Mono>, "POST", "Create an account and email the TPIN"],
          [<Mono key="2">/api/auth/*</Mono>, "GET, POST", "Auth.js login and session"],
          [<Mono key="3">/api/stocks/current</Mono>, "GET", "Latest quotes, read from Redis"],
          [<Mono key="4">/api/stock/[symbol]/history</Mono>, "GET", "Candles for ?range=1D, 1W or 1M"],
          [<Mono key="5">/api/trade/preview</Mono>, "GET", "Price, balance and shares owned for the review step"],
          [<Mono key="6">/api/trade</Mono>, "POST", "Place an order (idempotent)"],
          [<Mono key="7">/api/watchlist</Mono>, "GET, POST, DELETE", "Read, add to, and remove from the watchlist"],
          [<Mono key="8">/api/sell/tpin</Mono>, "POST", "Check the TPIN, email an OTP"],
          [<Mono key="9">/api/tpin/resend</Mono>, "POST", "Email a new TPIN"],
          [<Mono key="10">/api/password/forgot</Mono>, "POST", "Email a reset link"],
          [<Mono key="11">/api/password/reset</Mono>, "POST", "Set a new password"],
          [<Mono key="12">/api/health</Mono>, "GET", "Liveness check for the uptime monitor"],
        ]}
      />

      <H3>Placing a buy</H3>
      <SequenceDiagram
        label="Sequence of a buy order between the browser, the API route, Redis and Postgres"
        actors={["Browser", "API route", "Redis", "Postgres"]}
        messages={[
          { from: 0, to: 1, text: "POST /api/trade + key" },
          { from: 1, to: 3, text: "key already used?" },
          { from: 1, to: 2, text: "get latest price" },
          { from: 1, to: 3, text: "BEGIN, lock user row" },
          { from: 1, to: 3, text: "re-check key, trade, insert order" },
          { from: 1, to: 3, text: "COMMIT" },
          { from: 1, to: 0, text: "receipt", dashed: true },
        ]}
      />
      <Bullets
        items={[
          "The price comes from Redis on the server. The browser never sends one.",
          "Quantity must be a whole number from 1 to 100,000.",
          "The receipt has the order ID, executed price, total and new balance.",
        ]}
      />

      <H3>Stopping duplicates and races</H3>
      <FlowDiagram
        label="Flow of the trade route: replay check, price, lock, re-check, update, insert order, commit"
        steps={[
          { text: "Request arrives with an idempotency key" },
          {
            text: "Is this key already in the order table?",
            branch: { label: "yes", text: "Return the saved receipt (replayed)" },
          },
          {
            text: "Read the latest price from Redis",
            branch: { label: "none", text: "Reject: price unavailable, nothing saved" },
          },
          { text: "Begin transaction, lock the user row" },
          {
            text: "Check the key again, now under the lock",
            branch: { label: "yes", text: "Return the saved receipt (replayed)" },
          },
          {
            text: "Check balance (buy) or shares (sell)",
            branch: { label: "not enough", text: "Roll back and return an error" },
          },
          { text: "Update cash and holding" },
          { text: "Insert the order row with the key" },
          { text: "Commit and return the receipt" },
        ]}
      />
      <Bullets
        items={[
          "Same request twice: the second one finds the saved order and returns it.",
          "Two different orders at once: the row lock makes them run one after the other.",
          "A key reused with different details is rejected (HTTP 422).",
          "If anything fails, the whole transaction rolls back, key included.",
        ]}
      />

      <H3>Positions and holdings</H3>
      <Table
        head={["When", "Action", "Total quantity", "Position (today)", "Holdings"]}
        rows={[
          ["Monday", "buy 5", "5", "5", "0"],
          ["Monday", "buy 3", "8", "8", "0"],
          ["Tuesday", "nothing", "8", "0", "8"],
          ["Tuesday", "buy 2", "10", "2", "8"],
          ["Tuesday", "sell 4 (no source given)", "6", "0", "6"],
        ]}
      />
      <Bullets
        items={[
          <>
            Each holding row stores the total quantity plus <Mono>todayQty</Mono> and{" "}
            <Mono>todayDate</Mono>.
          </>,
          "If todayDate is today (New York date), todayQty is the position.",
          "Holdings are the total minus the position. No job runs at midnight.",
          "A sell with no source takes from the position first, then from holdings.",
          "Exit on the Positions tab sells only today’s shares. Exit on Holdings sells only older ones.",
        ]}
      />

      <H3>Authorizing a sell</H3>
      <SequenceDiagram
        label="Sequence of a sell: TPIN check, OTP email, then the order"
        actors={["Browser", "API route", "Postgres", "Email"]}
        messages={[
          { from: 0, to: 1, text: "sell + TPIN" },
          { from: 1, to: 2, text: "check TPIN (hash, tries)" },
          { from: 1, to: 2, text: "create OTP for this order" },
          { from: 1, to: 3, text: "send OTP" },
          { from: 1, to: 0, text: "challengeId", dashed: true },
          { from: 0, to: 1, text: "order + OTP + key" },
          { from: 1, to: 2, text: "verify OTP (bound to order)" },
          { from: 1, to: 2, text: "use OTP + trade in one tx" },
          { from: 1, to: 0, text: "receipt", dashed: true },
        ]}
      />
      <Table
        head={["Rule", "Limit"]}
        rows={[
          ["TPIN", "6 digits, emailed at signup, can be resent once a minute"],
          ["Wrong TPIN", "5 tries, then locked for 15 minutes"],
          ["OTP lifetime", "5 minutes, single use"],
          ["Wrong OTP", "3 tries, then it is dead"],
          ["OTP requests", "At most 5 per 10 minutes"],
          ["OTP binding", "Tied to the symbol, quantity and source of one sell"],
          ["Storage", "HMAC with a secret pepper, never plain text"],
        ]}
      />
      <Callout title="If the sell fails">
        <P>
          The OTP is consumed inside the same transaction as the trade. If the trade fails (for
          example, too few shares), everything rolls back and the OTP is still valid.
        </P>
      </Callout>

      <H3>Password reset</H3>
      <Steps
        items={[
          "The user enters an email. The page always answers “if the account exists, a link is on its way”.",
          "The server makes a random token and stores only its SHA-256 hash. It is valid for 30 minutes, with one email per minute per account.",
          "The email contains a link with the token.",
          "The user sets a new password (8 to 72 characters). The token is marked used and the new bcrypt hash is saved in one transaction.",
        ]}
      />

      <H3>Charts</H3>
      <Table
        head={["Range", "Bucket", "Max candles", "Cache"]}
        rows={[
          ["1D", "5 minutes", "288", "60 seconds"],
          ["1W", "30 minutes", "336", "300 seconds"],
          ["1M", "2 hours", "360", "900 seconds"],
        ]}
      />
      <Code>{`-- simplified
SELECT date_bin('5 minutes', timestamp, '1970-01-01') AS bucket,
       first price AS open, MAX(price) AS high,
       MIN(price) AS low,  last price  AS close
FROM "PriceHistory"
WHERE "stockId" = $1 AND timestamp >= newest - window
GROUP BY bucket ORDER BY bucket`}</Code>
      <Bullets
        items={[
          "The window ends at the newest data point, so a closed market still shows the last session.",
          "Snapshots are written only when a stock’s trade timestamp changes.",
          "Data is 2-minute snapshots, so a short candle’s high and low are approximate and there is no volume.",
        ]}
      />

      <H3>Redis keys</H3>
      <Table
        head={["Key or channel", "Holds", "Lifetime"]}
        rows={[
          [<Mono key="a">stock:SYMBOL</Mono>, "Latest quote as JSON", "Until the next fetch replaces it"],
          [<Mono key="b">price-updates</Mono>, "Channel: each new quote", "Not stored"],
          [<Mono key="c">history:v2:SYMBOL:RANGE</Mono>, "Cached candles", "60 s (1D), 300 s (1W), 900 s (1M)"],
        ]}
      />
    </>
  );
}

export const part3: SectionDef[] = [
  { id: "low-level-design", number: "05", title: "Low-level design", render: LowLevel },
];