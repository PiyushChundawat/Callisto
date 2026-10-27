function Box(props: { x: number; y: number; w: number; h: number; title: string; sub: string }) {
    return (
      <g>
        <rect
          x={props.x}
          y={props.y}
          width={props.w}
          height={props.h}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.5"
        />
        <text
          x={props.x + props.w / 2}
          y={props.y + props.h / 2 - 4}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="currentColor"
        >
          {props.title}
        </text>
        <text
          x={props.x + props.w / 2}
          y={props.y + props.h / 2 + 14}
          textAnchor="middle"
          fontSize="10.5"
          fill="currentColor"
          fillOpacity="0.65"
        >
          {props.sub}
        </text>
      </g>
    );
  }
  
  function Arrow(props: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
    lx: number;
    ly: number;
  }) {
    return (
      <g>
        <line
          x1={props.x1}
          y1={props.y1}
          x2={props.x2}
          y2={props.y2}
          stroke="currentColor"
          strokeOpacity="0.7"
          markerEnd="url(#arrowhead)"
        />
        <text
          x={props.lx}
          y={props.ly}
          textAnchor="middle"
          fontSize="10.5"
          fill="currentColor"
          fillOpacity="0.85"
        >
          {props.label}
        </text>
      </g>
    );
  }
  
  export default function ArchitectureDiagram() {
    return (
      <div className="overflow-x-auto border border-[var(--line)] p-3">
        <svg
          viewBox="0 0 900 400"
          className="min-w-[760px] w-full"
          role="img"
          aria-label="Callisto architecture: Finnhub feeds a fetch loop, which writes to Redis and publishes to Socket.io, which pushes to the browser. A snapshot job copies Redis data to Postgres. The Next.js app reads Redis and Postgres."
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="currentColor" fillOpacity="0.7" />
            </marker>
          </defs>
  
          <Box x={10} y={160} w={125} h={70} title="Finnhub API" sub="quotes, 60 calls/min" />
          <Box x={185} y={70} w={140} h={64} title="Fetch loop" sub="every 60 s, 32 stocks" />
          <Box x={185} y={290} w={140} h={64} title="Snapshot job" sub="every 2 min, new trades" />
          <Box x={395} y={70} w={140} h={64} title="Redis" sub="quotes, cache, pub/sub" />
          <Box x={395} y={290} w={140} h={64} title="PostgreSQL" sub="source of truth (Neon)" />
          <Box x={605} y={70} w={140} h={64} title="server.js + Socket.io" sub="subscribe, then push" />
          <Box x={605} y={290} w={140} h={64} title="Next.js app + API" sub="pages, trades, auth" />
          <Box x={795} y={160} w={95} h={70} title="Browser" sub="React, charts" />
  
          <Arrow x1={135} y1={185} x2={185} y2={110} label="poll" lx={140} ly={140} />
          <Arrow x1={325} y1={102} x2={395} y2={102} label="SET + PUB" lx={360} ly={92} />
          <Arrow x1={535} y1={102} x2={605} y2={102} label="SUB" lx={570} ly={92} />
          <Arrow x1={745} y1={102} x2={795} y2={175} label="WebSocket" lx={792} ly={125} />
          <Arrow x1={420} y1={134} x2={300} y2={290} label="mGET" lx={345} ly={215} />
          <Arrow x1={325} y1={322} x2={395} y2={322} label="INSERT" lx={360} ly={312} />
          <Arrow x1={640} y1={290} x2={510} y2={134} label="GET" lx={580} ly={215} />
          <Arrow x1={605} y1={322} x2={535} y2={322} label="SQL" lx={570} ly={312} />
          <Arrow x1={820} y1={230} x2={745} y2={300} label="HTTPS" lx={806} ly={275} />
        </svg>
      </div>
    );
  }