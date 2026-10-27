import type { SectionDef } from "./ui";

export default function Toc(props: { sections: SectionDef[] }) {
  const list = (
    <ol className="flex flex-col gap-1.5 text-sm">
      {props.sections.map(function (section) {
        return (
          <li key={section.id}>
            <a href={"#" + section.id} className="hover:text-[var(--accent)]">
              <span className="num muted mr-2">{section.number}</span>
              {section.title}
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      <details className="border border-[var(--line)] p-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-bold">Contents</summary>
        <div className="mt-3">{list}</div>
      </details>
      <aside className="sticky top-20 hidden self-start lg:block">
        <p className="muted mb-3 text-xs uppercase tracking-wide">Contents</p>
        {list}
      </aside>
    </>
  );
}