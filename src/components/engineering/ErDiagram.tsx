type TableBox = { x: number; y: number; title: string; fields: string[] };

const W = 200;

const tables: TableBox[] = [
  { x: 10, y: 10, title: "UserPortfolio", fields: ["userId (PK)", "currentBalance"] },
  {
    x: 350,
    y: 10,
    title: "PortfolioHolding",
    fields: ["unique: userId + stockId", "quantity", "avgBuyPrice", "todayQty", "todayDate"],
  },
  {
    x: 690,
    y: 10,
    title: "Order (ledger)",
    fields: [
      "id (PK)",
      "userId",
      "stockId",
      "side",
      "quantity",
      "executedPrice",
      "total",
      "balanceAfter",
      "unique: userId + key",
    ],
  },
  { x: 350, y: 190, title: "User", fields: ["id (PK)", "email (unique)", "name", "passwordHash"] },
  { x: 10, y: 190, title: "Watchlist", fields: ["userId (PK)", "stockIds (list)"] },
  {
    x: 690,
    y: 210,
    title: "TpinCredential",
    fields: ["userId (PK)", "tpinHash", "failedAttempts", "lockedUntil", "issuedAt"],
  },
  {
    x: 10,
    y: 390,
    title: "PasswordResetToken",
    fields: ["id (PK)", "userId", "tokenHash (unique)", "expiresAt", "usedAt"],
  },
  {
    x: 350,
    y: 390,
    title: "OtpChallenge",
    fields: ["id (PK)", "userId", "requestHash", "otpHash", "attempts", "expiresAt", "usedAt"],
  },
  { x: 690, y: 390, title: "PriceHistory", fields: ["id (PK)", "stockId", "price", "timestamp"] },
];

const links = [
  { x1: 350, y1: 205, x2: 210, y2: 50 },
  { x1: 450, y1: 190, x2: 450, y2: 122 },
  { x1: 550, y1: 205, x2: 690, y2: 100 },
  { x1: 350, y1: 230, x2: 210, y2: 225 },
  { x1: 550, y1: 250, x2: 690, y2: 250 },
  { x1: 370, y1: 286, x2: 210, y2: 420 },
  { x1: 450, y1: 286, x2: 450, y2: 390 },
];

export default function ErDiagram() {
  return (
    <div className="overflow-x-auto border border-[var(--line)] p-3">
      <svg
        viewBox="0 0 900 560"
        className="w-full min-w-[720px]"
        role="img"
        aria-label="Database tables. User is linked by userId to portfolio, holdings, orders, watchlist, TPIN, OTP and password reset tables. PriceHistory stands alone."
      >
        {links.map(function (link, index) {
          return (
            <line
              key={index}
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
              stroke="currentColor"
              strokeOpacity="0.4"
            />
          );
        })}
        {tables.map(function (table) {
          const height = 24 + table.fields.length * 16 + 8;
          return (
            <g key={table.title}>
              <rect x={table.x} y={table.y} width={W} height={height} fill="var(--bg, #F5F6F1)" stroke="currentColor" strokeOpacity="0.55" />
              <text x={table.x + 10} y={table.y + 17} fontSize="12.5" fontWeight="700" fill="currentColor">
                {table.title}
              </text>
              <line
                x1={table.x}
                y1={table.y + 24}
                x2={table.x + W}
                y2={table.y + 24}
                stroke="currentColor"
                strokeOpacity="0.3"
              />
              {table.fields.map(function (field, index) {
                return (
                  <text
                    key={field}
                    x={table.x + 10}
                    y={table.y + 24 + 15 + index * 16}
                    fontSize="11.5"
                    fill="currentColor"
                    fillOpacity="0.85"
                  >
                    {field}
                  </text>
                );
              })}
            </g>
          );
        })}
        <text x={690} y={512} fontSize="11" fill="currentColor" fillOpacity="0.6">
          not linked to a user
        </text>
      </svg>
    </div>
  );
}