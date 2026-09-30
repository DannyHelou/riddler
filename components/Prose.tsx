export function Prose({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 py-10 text-[20px] leading-[1.35] md:py-16 md:text-[22px]">
      <h1 className="pixel m-0 text-[14px] leading-[1.6] md:text-[16px]">{title}</h1>
      {children}
    </article>
  );
}
