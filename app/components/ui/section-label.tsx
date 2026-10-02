/** "A  GEOMETRY" — a mono accent code, then an 11/800 tracked label. Every
 *  section in the panels and the inspector opens with one. */
export default function SectionLabel({
  code,
  children,
  right,
}: {
  code: string;
  children: React.ReactNode;
  /** Pushed to the right edge (a readout or an add button). */
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 min-h-[16px]">
      <span className="font-mono text-[10.5px] font-medium text-accent">{code}</span>
      <span className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-text-primary">{children}</span>
      {right !== undefined && (
        <>
          <span className="flex-1" />
          {right}
        </>
      )}
    </div>
  );
}
