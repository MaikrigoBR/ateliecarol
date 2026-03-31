import type { ReactNode } from 'react';

export function SectionShell({
  title,
  eyebrow,
  children
}: Readonly<{ title: string; eyebrow?: string; children: ReactNode }>) {
  return (
    <section className="panel">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      <div className="stack">{children}</div>
    </section>
  );
}
