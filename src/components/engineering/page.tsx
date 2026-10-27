import Toc from "@/components/engineering/Toc";
import { Section } from "@/components/engineering/ui";
import type { SectionDef } from "@/components/engineering/ui";
import { part1 } from "@/components/engineering/part1";
import { part2 } from "@/components/engineering/part2";
import { part3 } from "@/components/engineering/part3";

export const metadata = {
  title: "Engineering | Callisto",
  description: "How Callisto is built: design, decisions, trade-offs, and results.",
};

const sections: SectionDef[] = [...part1, ...part2, ...part3];

export default function EngineeringPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <Toc sections={sections} />
      <article className="flex min-w-0 flex-col gap-12">
        <header>
          <p className="muted text-sm">Engineering notes</p>
          <h1 className="mt-1 text-4xl font-bold">How Callisto is built</h1>
          <p className="muted mt-3 max-w-2xl">
            Design decisions, alternatives, trade-offs, and results for a real-time simulated
            trading platform.
          </p>
        </header>
        {sections.map(function (section) {
          return (
            <Section key={section.id} id={section.id} number={section.number} title={section.title}>
              {section.render()}
            </Section>
          );
        })}
      </article>
    </div>
  );
}