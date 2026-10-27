type FlowStep = { text: string; branch?: { label: string; text: string } };

export function FlowDiagram(props: { steps: FlowStep[]; label: string }) {
  const boxW = 300;
  const boxH = 36;
  const gap = 26;
  const x = 10;
  const height = props.steps.length * (boxH + gap) - gap + 20;

  return (
    <div className="overflow-x-auto border border-[var(--line)] p-3">
      <svg
        viewBox={"0 0 760 " + height}
        className="w-full min-w-[640px]"
        role="img"
        aria-label={props.label}
      >
        <defs>
          <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="currentColor" fillOpacity="0.75" />
          </marker>
        </defs>
        {props.steps.map(function (step, index) {
          const y = 10 + index * (boxH + gap);
          const midY = y + boxH / 2;
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={boxW}
                height={boxH}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.55"
              />
              <text x={x + 12} y={midY + 4} fontSize="12.5" fill="currentColor">
                {index + 1 + ". " + step.text}
              </text>
              {index < props.steps.length - 1 ? (
                <line
                  x1={x + boxW / 2}
                  y1={y + boxH}
                  x2={x + boxW / 2}
                  y2={y + boxH + gap}
                  stroke="currentColor"
                  strokeOpacity="0.75"
                  markerEnd="url(#flow-arrow)"
                />
              ) : null}
              {step.branch ? (
                <g>
                  <line
                    x1={x + boxW}
                    y1={midY}
                    x2={x + boxW + 70}
                    y2={midY}
                    stroke="currentColor"
                    strokeOpacity="0.75"
                    markerEnd="url(#flow-arrow)"
                  />
                  <text
                    x={x + boxW + 35}
                    y={midY - 5}
                    textAnchor="middle"
                    fontSize="11"
                    fill="currentColor"
                  >
                    {step.branch.label}
                  </text>
                  <rect
                    x={x + boxW + 72}
                    y={y}
                    width={340}
                    height={boxH}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.55"
                    strokeDasharray="4 3"
                  />
                  <text x={x + boxW + 84} y={midY + 4} fontSize="12" fill="currentColor">
                    {step.branch.text}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

type SeqMessage = { from: number; to: number; text: string; dashed?: boolean };

export function SequenceDiagram(props: {
  actors: string[];
  messages: SeqMessage[];
  label: string;
}) {
  const width = 760;
  const colW = width / props.actors.length;
  const top = 46;
  const rowH = 34;
  const height = top + props.messages.length * rowH + 16;

  function cx(index: number) {
    return colW * index + colW / 2;
  }

  return (
    <div className="overflow-x-auto border border-[var(--line)] p-3">
      <svg
        viewBox={"0 0 " + width + " " + height}
        className="w-full min-w-[640px]"
        role="img"
        aria-label={props.label}
      >
        <defs>
          <marker id="seq-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="currentColor" fillOpacity="0.75" />
          </marker>
        </defs>
        {props.actors.map(function (actor, index) {
          return (
            <g key={actor}>
              <rect
                x={cx(index) - 55}
                y={6}
                width={110}
                height={26}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.55"
              />
              <text
                x={cx(index)}
                y={23}
                textAnchor="middle"
                fontSize="12.5"
                fontWeight="700"
                fill="currentColor"
              >
                {actor}
              </text>
              <line
                x1={cx(index)}
                y1={32}
                x2={cx(index)}
                y2={height - 6}
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeDasharray="4 4"
              />
            </g>
          );
        })}
        {props.messages.map(function (message, index) {
          const y = top + 14 + index * rowH;
          const direction = message.to > message.from ? 1 : -1;
          const x1 = cx(message.from) + direction * 3;
          const x2 = cx(message.to) - direction * 3;
          return (
            <g key={index}>
              <line
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.8"
                strokeDasharray={message.dashed ? "5 3" : undefined}
                markerEnd="url(#seq-arrow)"
              />
              <text
                x={(x1 + x2) / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="11.5"
                fill="currentColor"
              >
                {index + 1 + ". " + message.text}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}