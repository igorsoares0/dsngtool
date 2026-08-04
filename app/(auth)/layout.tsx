import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // `body { overflow: hidden }` is global for the editor's sake — this shell
  // owns its own scroll so a tall form is still reachable.
  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 mb-7 group"
          aria-label="Modo home"
        >
          <span className="w-[26px] h-[26px] rounded-md bg-accent text-accent-fg text-[12px] font-semibold flex items-center justify-center">
            M
          </span>
          <span className="text-[15px] font-semibold text-text-primary group-hover:text-accent transition-colors duration-150 ease-standard">
            Modo
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
