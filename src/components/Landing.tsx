import { ArrowRight, Check, FileSearch, MessageSquare, Upload } from "lucide-react";
import { clsx } from "clsx";

interface LandingProps {
  onTryNow: () => void;
  onSignIn?: () => void;
  isDark?: boolean;
}

// Landing page for the app. For now this is the only screen in the flow
// (login + pricing pages come later); the primary CTA hands off to the main
// application via `onTryNow`.
export function Landing({ onTryNow, onSignIn, isDark = false }: LandingProps) {
  const bg = isDark ? "bg-[#161b27]" : "bg-[#ede8e0]";
  const card = isDark ? "bg-[#1e2433] border-[#2d3548]" : "bg-white border-[#e0d8cc]";
  const text = isDark ? "text-[#e8eaf0]" : "text-[#2c2416]";
  const subtext = isDark ? "text-[#6b7a99]" : "text-[#8a7d6b]";
  const btn = isDark
    ? "bg-[#2979ff] text-white hover:bg-[#1f6fef]"
    : "bg-[#b5651d] text-white hover:bg-[#9c5616]";

  const fadeUp = (delay = 0) =>
    ({
      animation: "lpFadeUp 0.7s ease both",
      animationDelay: `${delay}ms`,
    }) as React.CSSProperties;

  const features = [
    {
      title: "Semantic search",
      desc: "Questions are understood by meaning, not just keywords, so paraphrases and synonyms find the right passage.",
    },
    {
      title: "Streaming answers",
      desc: "Responses stream in token by token over SSE, with automatic retries on rate limits or network hiccups.",
    },
    {
      title: "Cited sources",
      desc: "Every answer cites the exact chunks used, and clicking a citation jumps the PDF viewer to the page and highlights the sentence.",
    },
    {
      title: "Summaries & follow-ups",
      desc: "One-click document summaries and AI-generated follow-up questions that stay grounded in the file.",
    },
  ];

  const steps = [
    {
      icon: Upload,
      title: "Upload your PDF",
      desc: "Drop in a document. Text is extracted, chunked, and indexed automatically — no manual steps.",
    },
    {
      icon: MessageSquare,
      title: "Ask anything",
      desc: "Type a question in plain language and the app retrieves the most relevant content for it.",
    },
    {
      icon: FileSearch,
      title: "Get cited answers",
      desc: "Receive a streaming answer grounded in your document, with citations you can click into.",
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      tagline: "Get started for free",
      cta: "Get Started Free",
      featured: true,
      features: [
        "Upload up to a few documents",
        "Ask questions with cited answers",
        "Email support",
      ],
      onCta: onTryNow,
    },
    {
      name: "Pro",
      price: "$9",
      tagline: "For heavy research workflows",
      cta: "Coming soon",
      featured: false,
      features: [
        "Multiple document libraries",
        "Higher rate limits for AI calls",
        "Priority support",
      ],
      onCta: () => {},
    },
  ];

  const stats = [
    { value: "3×", label: "deeper context per answer" },
    { value: "4.9/5", label: "average user rating" },
    { value: "5", label: "cited sources per answer" },
    { value: "100%", label: "answers grounded in your file" },
  ];

  const menu = [
    { label: "Product", href: "#product" },
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <div className={clsx("relative min-h-dvh font-sans", bg)}>
      <style>{`
        @keyframes lpFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lpFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes lpGradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ── Ambient animated background ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: isDark
              ? "linear-gradient(135deg, rgba(37,99,235,0.35), rgba(139,92,246,0.25))"
              : "linear-gradient(135deg, rgba(181,101,29,0.28), rgba(41,121,255,0.22))",
            animation: "lpFloat 12s ease-in-out infinite",
          }}
        />
        <div
          aria-hidden
          className="absolute top-1/3 -left-40 h-72 w-72 rounded-full blur-2xl opacity-40"
          style={{ background: isDark ? "rgba(91,156,246,0.18)" : "rgba(181,101,29,0.16)", animation: "lpFloat 9s ease-in-out infinite reverse" }}
        />
        <div
          aria-hidden
          className="absolute bottom-0 -right-40 h-72 w-72 rounded-full blur-2xl opacity-40"
          style={{ background: isDark ? "rgba(139,92,246,0.18)" : "rgba(41,121,255,0.16)", animation: "lpFloat 11s ease-in-out infinite" }}
        />
      </div>

      {/* ── Nav ── */}
      <header
        className="sticky top-0 z-20 border-b"
        style={{ borderColor: isDark ? "#2d3548" : "#d8d0c4", background: isDark ? "#161b27" : "#ede8e0" }}
      >
        <nav className="relative max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <a href="#product" className="flex items-center gap-2">
            <span
              className={clsx(
                "inline-flex items-center justify-center w-8 h-8 rounded-lg",
                isDark ? "bg-[#252d40] text-[#5b9cf6]" : "bg-[#f0e5d8] text-[#b5651d]",
              )}
            >
              <FileSearch className="w-4 h-4" />
            </span>
            <span className={clsx("font-semibold", text)}>PDFChat</span>
          </a>

          {/* Menu */}
          <div className="hidden md:flex items-center gap-6">
            {menu.map((m) => (
              <a
                key={m.href}
                href={m.href}
                className={clsx("text-sm", isDark ? "text-[#6b7a99]" : "text-[#8a7d6b]", "hover:text-current transition-colors")}
                style={isDark ? { color: "#6b7a99" } : { color: "#8a7d6b" }}
              >
                {m.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className={clsx(
                "hidden md:inline-block rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                isDark ? "text-[#e8eaf0] hover:bg-[#252d40]" : "text-[#2c2416] hover:bg-[#f0e5d8]",
              )}
            >
              Sign In
            </button>
            <button
              onClick={onTryNow}
              className={clsx(
                "rounded-lg px-4 py-2 text-sm font-semibold transition-transform hover:scale-105",
                btn,
              )}
            >
              Start Free
            </button>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section id="product" className="relative max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-12 md:pb-16 text-center">
        {/* Animated badge */}
        <div style={fadeUp(0)}>
          <span
            className={clsx(
              "inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border",
              isDark ? "bg-[#252d40] text-[#5b9cf6] border-[#2d3548]" : "bg-[#f0e5d8] text-[#b5651d] border-[#e0d8cc]",
            )}
          >
            AI-powered PDF chat
          </span>
        </div>

        <h1 className={clsx("mt-5 text-4xl md:text-6xl font-semibold tracking-tight", text)} style={fadeUp(120)}>
          Chat with your PDFs
        </h1>
        <p className={clsx("mt-5 text-base md:text-lg max-w-2xl mx-auto leading-relaxed", subtext)} style={fadeUp(240)}>
          Ask questions in plain language and get answers grounded in your documents — with streaming responses, citations, and sources that jump straight to the right page.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3" style={fadeUp(360)}>
          <button
            onClick={onTryNow}
            className={clsx(
              "inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-transform hover:scale-105",
              btn,
            )}
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#how-it-works"
            className={clsx(
              "hidden sm:inline-flex items-center rounded-lg px-6 py-3 text-sm font-semibold border transition-colors",
              isDark ? "border-[#2d3548] text-[#e8eaf0] hover:bg-[#252d40]" : "border-[#d8d0c4] text-[#2c2416] hover:bg-[#f0e5d8]",
            )}
          >
            How it works
          </a>
        </div>
        <p className={clsx("mt-4 text-xs", subtext)} style={fadeUp(440)}>
          Free to start · no credit card required
        </p>

        {/* Animated hero visual: floating mock chat card */}
        <div className="mt-14" style={fadeUp(560)}>
          <div className="relative mx-auto max-w-2xl">
            <div
              className="absolute -inset-8 rounded-3xl opacity-50 blur-3xl"
              style={{ background: isDark ? "linear-gradient(135deg, rgba(37,99,235,0.35), rgba(139,92,246,0.25))" : "linear-gradient(135deg, rgba(181,101,29,0.28), rgba(41,121,255,0.22))" }}
            />
            <div
              className="relative rounded-2xl border p-5 shadow-2xl"
              style={{ background: isDark ? "#161b27" : "#ffffff", borderColor: isDark ? "#2d3548" : "#e0d8cc" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full" style={{ background: isDark ? "#3b4a63" : "#d8d0c4" }} />
                <span className="w-2 h-2 rounded-full" style={{ background: isDark ? "#3b4a63" : "#d8d0c4" }} />
                <span className="w-2 h-2 rounded-full" style={{ background: isDark ? "#3b4a63" : "#d8d0c4" }} />
                <span className={clsx("ml-2 text-[11px]", subtext)}>PDFChat — chat</span>
              </div>
              <div className="space-y-3">
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md px-3 py-2 text-xs" style={{ background: isDark ? "#252d40" : "#f0e5d8", color: isDark ? "#e8eaf0" : "#2c2416" }}>
                  What does the contract say about termination?
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2 text-xs leading-relaxed" style={{ background: isDark ? "#1e2433" : "#faf8f5", color: isDark ? "#e8eaf0" : "#2c2416", border: isDark ? "1px solid #2d3548" : "1px solid #e0d8cc" }}>
                  Based on the contract, termination requires written notice… <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>[1]</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4" style={fadeUp(680)}>
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border p-5" style={{ background: isDark ? "#1e2433" : "#faf8f5", borderColor: isDark ? "#2d3548" : "#e0d8cc" }}>
              <p className={clsx("text-2xl md:text-3xl font-bold", text)}>{s.value}</p>
              <p className={clsx("mt-1 text-[11px] leading-tight", subtext)}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative border-t py-16 md:py-20" style={{ borderColor: isDark ? "#2d3548" : "#d8d0c4" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center" style={fadeUp(0)}>
            <h2 className={clsx("text-2xl md:text-3xl font-semibold", text)}>How it works</h2>
            <p className={clsx("mt-3 text-sm max-w-xl mx-auto", subtext)}>From a stack of PDFs to an answer in three steps.</p>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {steps.map((s, i) => (
              <div key={s.title} className={clsx("rounded-2xl border p-6", card)} style={fadeUp(140 * (i + 1))}>
                <span className={clsx("inline-flex items-center justify-center w-9 h-9 rounded-lg", isDark ? "bg-[#252d40] text-[#5b9cf6]" : "bg-[#f0e5d8] text-[#b5651d]")}>
                  <s.icon className="w-4 h-4" />
                </span>
                <h3 className={clsx("mt-4 text-sm font-semibold", text)}>{s.title}</h3>
                <p className={clsx("mt-2 text-xs leading-relaxed", subtext)}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features / what is this ── */}
      <section id="features" className="relative border-t py-16 md:py-20" style={{ borderColor: isDark ? "#2d3548" : "#d8d0c4" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center" style={fadeUp(0)}>
            <h2 className={clsx("text-2xl md:text-3xl font-semibold", text)}>What is PDFChat?</h2>
            <p className={clsx("mt-3 text-sm max-w-xl mx-auto", subtext)}>An AI assistant that reads your documents and answers from them.</p>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={f.title} className={clsx("rounded-2xl border p-6", card)} style={fadeUp(140 * (i + 1))}>
                <h3 className={clsx("text-sm font-semibold", text)}>{f.title}</h3>
                <p className={clsx("mt-2 text-xs leading-relaxed", subtext)}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative border-t py-16 md:py-20" style={{ borderColor: isDark ? "#2d3548" : "#d8d0c4" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center" style={fadeUp(0)}>
            <h2 className={clsx("text-2xl md:text-3xl font-semibold", text)}>Pricing</h2>
            <p className={clsx("mt-3 text-sm max-w-xl mx-auto", subtext)}>Start free and upgrade when you grow.</p>
          </div>
          <div className="mt-10 grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {plans.map((p, i) => (
              <div key={p.name} className={clsx("rounded-2xl border p-6", card, p.featured && "ring-2")} style={fadeUp(140 * (i + 1))}>
                {p.featured && (
                  <span className={clsx("inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full", isDark ? "bg-[#2979ff]/20 text-[#5b9cf6]" : "bg-[#f0e5d8] text-[#b5651d]")}>Most popular</span>
                )}
                <h3 className={clsx("mt-3 text-lg font-semibold", text)}>{p.name}</h3>
                <p className={clsx("mt-1 text-3xl font-bold", text)}>{p.price}</p>
                <p className={clsx("mt-1 text-xs", subtext)}>{p.tagline}</p>
                <ul className="mt-5 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: text }}>
                      <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={p.onCta}
                  disabled={p.name === "Pro"}
                  className={clsx(
                    "mt-6 w-full rounded-lg py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100",
                    p.featured ? clsx(btn) : isDark ? "bg-[#252d40] text-[#e8eaf0] hover:bg-[#2d3548]" : "bg-[#f0e5d8] text-[#2c2416] hover:bg-[#e7dccd]",
                  )}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative border-t py-16 md:py-20 text-center" style={{ borderColor: isDark ? "#2d3548" : "#d8d0c4" }}>
        <div className="max-w-6xl mx-auto px-6" style={fadeUp(0)}>
          <h2 className={clsx("text-2xl md:text-3xl font-semibold", text)}>Ready to chat with your PDFs?</h2>
          <p className={clsx("mt-3 text-sm max-w-xl mx-auto", subtext)}>Upload your first document and ask your first question.</p>
          <button
            onClick={onTryNow}
            className={clsx("mt-8 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-transform hover:scale-105", btn)}
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative border-t py-6" style={{ borderColor: isDark ? "#2d3548" : "#d8d0c4" }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className={clsx("text-xs font-semibold", text)}>PDFChat</span>
          <nav className="flex items-center gap-6">
            {menu.map((m) => (
              <a
                key={m.href}
                href={m.href}
                className={clsx("text-xs", isDark ? "text-[#6b7a99]" : "text-[#8a7d6b]", "hover:text-current transition-colors")}
              >
                {m.label}
              </a>
            ))}
          </nav>
          <span className={clsx("text-[11px]", subtext)}>Chat with your documents using AI</span>
        </div>
      </footer>
    </div>
  );
}
