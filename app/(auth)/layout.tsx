import Link from "next/link";
import AuthCollage from "../components/auth/collage";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // `body { overflow: hidden }` is global for the editor's sake — this shell
  // owns its own scroll so a tall form is still reachable.
  return (
    <div className="h-full overflow-y-auto bg-surface-0 text-text-primary">
      <div className="min-h-full grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_560px]">
        {/* Left: wordmark, a collage of two real templates, a caption. */}
        <div className="hidden md:flex flex-col justify-between px-12 py-10 border-r border-border-default overflow-hidden">
          <Link href="/" aria-label="Modo home" className="self-start text-[22px] font-black font-wide tracking-[-0.02em]">
            modo<span className="text-accent">.</span>
          </Link>
          <AuthCollage />
          <span className="font-mono text-[11px] text-text-tertiary">FIG. 2 — TWO OF 53 STARTING POINTS</span>
        </div>

        {/* Right: the form column. */}
        <div className="bg-surface-1 flex flex-col justify-center px-6 sm:px-[72px] py-10">
          <Link href="/" aria-label="Modo home" className="md:hidden mb-8 text-[22px] font-black font-wide tracking-[-0.02em]">
            modo<span className="text-accent">.</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
