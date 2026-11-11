import { ArrowRight, FileSearch } from "lucide-react";
import { clsx } from "clsx";

interface LandingProps {
  onTryNow: () => void;
  isDark?: boolean;
}

// Landing page for the app. For now this is the only screen in the flow
// (login + pricing pages come later); the primary CTA hands off to the main
// application via `onTryNow`.
export function Landing({ onTryNow, isDark = false }: LandingProps) {
  const bg = isDark ? "bg-[#161b27]" : "bg-[#ede8e0]";
  const card = isDark ? "bg-[#1e2433] border-[#2d3548]" : "bg-white border-[#e0d8cc]";
  const text = isDark ? "text-[#e8eaf0]" : "text-[#2c2416]";
  const subtext = isDark ? "text-[#6b7a99]" : "text-[#8a7d6b]";
  const btn = isDark
    ? "bg-[#2979ff] text-white hover:bg-[#1f6fef]"
    : "bg-[#b5651d] text-white hover:bg-[#9c5616]";

  return (
    <div
      className={clsx(
        "min-h-dvh flex items-center justify-center px-6 font-sans",
        bg,
      )}
    >
      <div className={clsx("w-full max-w-xl rounded-2xl border p-10 text-center shadow-xl", card)}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <span
            className={clsx(
              "inline-flex items-center justify-center w-9 h-9 rounded-lg",
              isDark ? "bg-[#252d40] text-[#5b9cf6]" : "bg-[#f0e5d8] text-[#b5651d]",
            )}
          >
            <FileSearch className="w-4 h-4" />
          </span>
          <h1 className={clsx("text-base font-semibold", text)}>PDFChat</h1>
        </div>

        <h2 className={clsx("text-3xl font-semibold tracking-tight", text)}>
          Chat with your PDFs
        </h2>
        <p className={clsx("mt-3 text-sm leading-relaxed", subtext)}>
          Upload a document and ask questions in plain language. Get streaming
          answers grounded in your file, with citations that jump straight to the
          source page.
        </p>

        <button
          onClick={onTryNow}
          className={clsx(
            "mt-8 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors",
            btn,
          )}
        >
          Try Now
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className={clsx("mt-4 text-[11px]", subtext)}>
          Free to start · no credit card required
        </p>
      </div>
    </div>
  );
}
