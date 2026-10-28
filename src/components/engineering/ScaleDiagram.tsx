function Box(props: { x: number; y: number; w: number; h: number; title: string; sub: string }) {
    return (
      <g>
        <rect x={props.x} y={props.y} width={props.w} height={props.h} fill="none" stroke="currentColor" strokeOpacity="0.55" />
        <text x={props.x + props.w / 2} y={props.y + props.h / 2 - 3} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="currentColor">
          {props.title}
        </text>
        <text x={props.x + props.w / 2} y={props.y + props.h / 2 + 13} textAnchor="middle" fontSize="10.5" fill="currentColor" fillOpacity="0.7">
          {props.sub}
        </text>
      </g>
    );
  }
  
  function Arrow(props: { x1: number; y1: number; x2: number; y2: number; label?: string; lx?: number; ly?: number }) {
    return (
      <g>
        <line x1={props.x1} y1={props.y1} x2={props.x2} y2={props.y2} stroke="currentColor" strokeOpacity="0.7" markerEnd="url(#scale-arrow)" />
        {props.label ? (
          <text x={props.lx} y={props.ly} textAnchor="middle" fontSize="10.5" fill="currentColor">
            {props.label}
          </text>
        ) : null}
      </g>
    );
  }
  
  export default function ScaleDiagram() {
    return (
      <div className="overflow-x-auto border border-[var(--line)] p-3">
        <svg
          viewBox="0 0 760 300"
          className="w-full min-w-[680px]"
          role="img"
          aria-label="Scaled design: browsers reach a load balancer, which spreads them over three app instances. All instances share Redis and Postgres. Only one instance, the leader, polls Finnhub."
        >
          <defs>
            <marker id="scale-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="currentColor" fillOpacity="0.75" />
            </marker>
          </defs>
  
          <Box x={5} y={115} w={90} h={56} title="Browsers" sub="sockets + HTTP" />
          <Box x={125} y={115} w={100} h={56} title="Load balancer" sub="sticky sessions" />
          <Box x={265} y={15} w={150} h={56} title="App instance 1" sub="leader: runs the jobs" />
          <Box x={265} y={115} w={150} h={56} title="App instance 2" sub="web + sockets" />
          <Box x={265} y={215} w={150} h={56} title="App instance 3" sub="web + sockets" />
          <Box x={475} y={105} w={125} h={56} title="Redis" sub="shared, managed" />
          <Box x={475} y={215} w={125} h={56} title="PostgreSQL" sub="orders, users, history" />
          <Box x={635} y={15} w={115} h={56} title="Finnhub" sub="32 calls/min total" />
  
          <Arrow x1={95} y1={143} x2={125} y2={143} />
          <Arrow x1={225} y1={143} x2={265} y2={43} />
          <Arrow x1={225} y1={143} x2={265} y2={143} />
          <Arrow x1={225} y1={143} x2={265} y2={243} />
          <Arrow x1={415} y1={43} x2={635} y2={43} label="polls" lx={525} ly={34} />
          <Arrow x1={415} y1={60} x2={475} y2={125} />
          <Arrow x1={415} y1={143} x2={475} y2={143} />
          <Arrow x1={415} y1={160} x2={475} y2={228} />
          <Arrow x1={415} y1={243} x2={475} y2={243} />
        </svg>
      </div>
    );
  }