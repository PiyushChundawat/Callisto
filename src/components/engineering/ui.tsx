import type { ReactNode } from "react";

export type SectionDef = {
  id: string;
  number: string;
  title: string;
  render: () => ReactNode;
};

export function Section(props: { id: string; number: string; title: string; children: ReactNode }) {
  return (
    <section id={props.id} className="scroll-mt-24 border-t border-[var(--line)] pt-10">
      <p className="num muted text-xs">{props.number}</p>
      <h2 className="mt-1 text-2xl font-bold">{props.title}</h2>
      <div className="mt-5 flex flex-col gap-4">{props.children}</div>
    </section>
  );
}

export function H3(props: { children: ReactNode }) {
  return <h3 className="mt-4 text-lg font-bold">{props.children}</h3>;
}

export function P(props: { children: ReactNode }) {
  return <p className="leading-relaxed">{props.children}</p>;
}

export function Mono(props: { children: ReactNode }) {
  return <code className="num rounded bg-black/5 px-1 py-0.5 text-[0.85em]">{props.children}</code>;
}

export function Bullets(props: { items: ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5 leading-relaxed">
      {props.items.map(function (item, index) {
        return <li key={index}>{item}</li>;
      })}
    </ul>
  );
}

export function Steps(props: { items: ReactNode[] }) {
  return (
    <ol className="ml-5 list-decimal space-y-1.5 leading-relaxed">
      {props.items.map(function (item, index) {
        return <li key={index}>{item}</li>;
      })}
    </ol>
  );
}

export function Callout(props: {
  title: string;
  tone?: "note" | "honest";
  children: ReactNode;
}) {
  const border = props.tone === "honest" ? "border-[#C43D30]" : "border-[#A9782E]";
  return (
    <div className={"flex flex-col gap-2 border-l-4 bg-black/[0.03] p-4 " + border}>
      <p className="font-bold">{props.title}</p>
      {props.children}
    </div>
  );
}

export function Table(props: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto border border-[var(--line)]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="muted border-b border-[var(--line)]">
            {props.head.map(function (cell) {
              return (
                <th key={cell} className="p-2.5 font-bold">
                  {cell}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {props.rows.map(function (row, rowIndex) {
            return (
              <tr key={rowIndex} className="border-b border-[var(--line)] align-top last:border-b-0">
                {row.map(function (cell, cellIndex) {
                  return (
                    <td key={cellIndex} className="p-2.5 leading-relaxed">
                      {cell}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Code(props: { children: string }) {
  return (
    <pre className="num overflow-x-auto border border-[var(--line)] bg-black/[0.03] p-3 text-xs leading-relaxed">
      {props.children}
    </pre>
  );
}

// One card per technology choice. Used heavily in Part 2.
export function Decision(props: {
    title: string;
    chosen: string;
    why: ReactNode;
    alternatives: { name: string; verdict: ReactNode }[];
    industry: ReactNode;
    tradeoff: ReactNode;
  }) {
    return (
      <div className="flex flex-col gap-2 border border-[var(--line)] p-4">
        <div>
          <p className="muted text-xs uppercase tracking-wide">{props.title}</p>
          <p className="text-lg font-bold">{props.chosen}</p>
        </div>
        <div className="leading-relaxed">{props.why}</div>
        <div className="text-sm leading-relaxed">
          <b>Gave up:</b> {props.tradeoff}
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-bold">Alternatives and industry practice</summary>
          <ul className="ml-5 mt-2 list-disc space-y-1 leading-relaxed">
            {props.alternatives.map(function (alt) {
              return (
                <li key={alt.name}>
                  <b>{alt.name}:</b> {alt.verdict}
                </li>
              );
            })}
          </ul>
          <div className="mt-2 leading-relaxed">
            <b>Industry:</b> {props.industry}
          </div>
        </details>
      </div>
    );
}