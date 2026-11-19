import {
  ArrowRight,
  Check,
  FileSearch,
  MessageSquare,
  Upload,
  Zap,
  Shield,
  Brain,
  Layers,
  BarChart2,
  Star,
  ChevronRight,
  Users,
  Globe,
  Lock,
  Sparkles,
  TestTube2,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";

interface LandingProps {
  onTryNow: () => void;
  onSignIn?: () => void;
  isDark?: boolean;
}

export function Landing({ onTryNow, onSignIn, isDark = false }: LandingProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const bg = isDark ? "bg-[#161b27]" : "bg-[#ede8e0]";
  const card = isDark ? "bg-[#1e2433] border-[#2d3548]" : "bg-white border-[#e0d8cc]";
  const text = isDark ? "text-[#e8eaf0]" : "text-[#2c2416]";
  const subtext = isDark ? "text-[#6b7a99]" : "text-[#8a7d6b]";
  const btn = isDark
    ? "bg-[#2979ff] text-white hover:bg-[#1f6fef]"
    : "bg-[#b5651d] text-white hover:bg-[#9c5616]";
  const btnSecondary = isDark
    ? "bg-[#252d40] text-[#e8eaf0] hover:bg-[#2d3548] border-[#2d3548]"
    : "bg-[#f0e5d8] text-[#2c2416] hover:bg-[#e7dccd] border-[#e0d8cc]";

  const fadeUp = (delay = 0) =>
    ({
      animation: "lpFadeUp 0.6s ease-out both",
      animationDelay: `${delay}ms`,
    }) as React.CSSProperties;

  const fadeIn = (delay = 0) =>
    ({
      animation: "lpFadeIn 0.5s ease-out both",
      animationDelay: `${delay}ms`,
    }) as React.CSSProperties;

  // Data
  const menu = [
    { label: "Product", href: "#product" },
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
  ];

  const stats = [
    { value: "3×", label: "deeper context per answer", icon: Brain },
    { value: "4.9/5", label: "average user rating", icon: Star },
    { value: "5+", label: "cited sources per answer", icon: Layers },
    { value: "100%", label: "answers grounded in your file", icon: Shield },
  ];

  const features = [
    {
      icon: Brain,
      title: "Semantic Understanding",
      desc: "Questions are understood by meaning, not just keywords. Paraphrases and synonyms find the right passage every time.",
      highlight: "Hybrid retrieval: 45% cosine + 55% keyword with MMR diversification",
    },
    {
      icon: Zap,
      title: "Streaming Answers",
      desc: "Responses stream token-by-token over SSE with automatic retries on rate limits and network hiccups.",
      highlight: "Retry-After handling + 120s stream timeout",
    },
    {
      icon: Layers,
      title: "Precision Citations",
      desc: "Every answer cites exact chunks used. Click a citation to jump the PDF viewer to the page and highlight the sentence.",
      highlight: "Page-level + sentence-level grounding",
    },
    {
      icon: Sparkles,
      title: "Summaries & Follow-ups",
      desc: "One-click document summaries and AI-generated follow-up questions validated against the document.",
      highlight: "Context-aware, no dead-end suggestions",
    },
    {
      icon: BarChart2,
      title: "Multi-Doc Intelligence",
      desc: "Scope questions to a single PDF or query across your entire library. Model flexibility: Flash (fast) or Pro (deep).",
      highlight: "Per-document & cross-library modes",
    },
    {
      icon: Globe,
      title: "Resilient by Design",
      desc: "Lexical fallback keeps search working if Gemini embeddings are down. Uploads retry with backoff. Offline-first rendering.",
      highlight: "Zero-downtime ingestion",
    },
  ];

  const steps = [
    {
      icon: Upload,
      number: "01",
      title: "Upload your PDF",
      desc: "Drop in a document. Text is extracted per page, chunked at sentence boundaries (~1000 chars, 100 overlap), and indexed automatically.",
      visual: (
        <div className="relative h-32 rounded-xl overflow-hidden" style={{ background: isDark ? "#1e2433" : "#faf8f5" }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs" style={{ color: isDark ? "#6b7a99" : "#8a7d6b" }}>
              <Upload className="w-4 h-4" />
              <span>Drag & drop or click to upload</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-2" style={{ background: "linear-gradient(90deg, #b5651d, #2979ff)" }} />
        </div>
      ),
    },
    {
      icon: MessageSquare,
      number: "02",
      title: "Ask anything",
      desc: "Type a question in plain language. Hybrid retrieval fetches top-5 chunks (cosine + keyword, MMR diversified) and feeds them to the model.",
      visual: (
        <div className="relative h-32 rounded-xl overflow-hidden" style={{ background: isDark ? "#1e2433" : "#faf8f5" }}>
          <div className="p-4 space-y-2">
            <div className="ml-auto max-w-[75%] rounded-2xl rounded-br-md px-3 py-2 text-xs" style={{ background: isDark ? "#252d40" : "#f0e5d8", color: isDark ? "#e8eaf0" : "#2c2416" }}>
              What are the termination clauses?
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-md px-3 py-2 text-xs leading-relaxed" style={{ background: isDark ? "#1e2433" : "#faf8f5", color: isDark ? "#e8eaf0" : "#2c2416", border: isDark ? "1px solid #2d3548" : "1px solid #e0d8cc" }}>
              The contract specifies 30 days written notice… <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>[1][2]</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: FileSearch,
      number: "03",
      title: "Get cited answers",
      desc: "Receive a streaming answer grounded in your document, with numbered citations. Click any citation to jump to the source page with highlighted text.",
      visual: (
        <div className="relative h-32 rounded-xl overflow-hidden" style={{ background: isDark ? "#1e2433" : "#faf8f5" }}>
          <div className="p-4 space-y-2">
            <div className="text-xs leading-relaxed" style={{ color: isDark ? "#e8eaf0" : "#2c2416" }}>
              Based on the contract, termination requires <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>written notice of 30 days</span> <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>[1]</span>. The notice must be delivered via <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>certified mail or email</span> <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>[2]</span>.
            </div>
            <div className="flex items-center gap-2 text-[11px]" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>
              <span>Sources: [1] p.3 ¶2</span>
              <span>·</span>
              <span>[2] p.4 ¶1</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      tagline: "Perfect for getting started",
      cta: "Get Started Free",
      featured: true,
      features: [
        "Upload up to 10 documents",
        "Unlimited questions with citations",
        "Gemini 2.5 Flash model",
        "Email support",
        "PDF viewer with highlighting",
      ],
      onCta: onTryNow,
    },
    {
      name: "Pro",
      price: "$9",
      period: "/month",
      tagline: "For power users & researchers",
      cta: "Coming Soon",
      featured: false,
      features: [
        "Unlimited documents",
        "Gemini 2.5 Pro model access",
        "Priority processing queue",
        "Advanced search filters",
        "Export conversations (PDF/MD)",
        "API access (coming soon)",
      ],
      onCta: undefined,
    },
    // {
    //   name: "Team",
    //   price: "$29",
    //   period: "/month",
    //   tagline: "For collaborative workspaces",
    //   cta: "Contact Sales",
    //   featured: false,
    //   features: [
    //     "Everything in Pro",
    //     "Shared workspaces & libraries",
    //     "Role-based access control",
    //     "Audit logs & compliance",
    //     "SSO/SAML authentication",
    //     "Dedicated support channel",
    //   ],
    //   onCta: () => {},
    // },
  ];

  return (
    <div id="top" className={clsx("relative min-h-dvh font-sans", bg)}>
      <style>{`
        @keyframes lpFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lpFloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 33% { transform: translateY(-12px) rotate(0.5deg); } 66% { transform: translateY(4px) rotate(-0.5deg); } }
        @keyframes lpPulse { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.03); } }
        @keyframes lpShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes lpGradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        html { scroll-behavior: smooth; }
        .animate-float { animation: lpFloat 12s ease-in-out infinite; }
        .animate-pulse-slow { animation: lpPulse 4s ease-in-out infinite; }
        .animate-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); background-size: 200% 100%; animation: lpShimmer 2s infinite; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── Ambient animated background ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full blur-3xl animate-float animate-pulse-slow"
          style={{
            background: isDark
              ? "linear-gradient(135deg, rgba(37,99,235,0.35), rgba(139,92,246,0.25), rgba(236,72,153,0.15))"
              : "linear-gradient(135deg, rgba(181,101,29,0.3), rgba(41,121,255,0.25), rgba(236,72,153,0.2))",
          }}
        />
        <div
          aria-hidden
          className="absolute top-1/3 -left-40 h-80 w-80 rounded-full blur-2xl opacity-40 animate-float"
          style={{ background: isDark ? "rgba(91,156,246,0.15)" : "rgba(181,101,29,0.14)", animationDelay: "-2s", animationDuration: "10s" }}
        />
        <div
          aria-hidden
          className="absolute bottom-0 -right-40 h-80 w-80 rounded-full blur-2xl opacity-40 animate-float"
          style={{ background: isDark ? "rgba(139,92,246,0.15)" : "rgba(41,121,255,0.14)", animationDelay: "-4s", animationDuration: "14s" }}
        />
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-10"
          style={{
            background: isDark
              ? "radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(181,101,29,0.35) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Sticky Nav ── */}
      <header
        className="sticky top-0 z-50 border-b transition-all duration-300"
        style={{
          borderColor: isDark ? "#2d3548" : "#d8d0c4",
          background: scrolled
            ? (isDark ? "rgba(22,27,39,0.92)" : "rgba(237,232,224,0.92)")
            : (isDark ? "#161b27" : "#ede8e0"),
          backdropFilter: scrolled ? "blur(20px)" : "none",
        }}
      >
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6 relative">
          {/* Logo */}
          <a href="#top" className="flex items-center gap-2 flex-shrink-0" aria-label="PDFChat Home">
            <span
              className={clsx(
                "inline-flex items-center justify-center w-9 h-9 rounded-xl",
                isDark ? "bg-gradient-to-br from-[#2979ff] to-[#8b5cf6]" : "bg-gradient-to-br from-[#b5651d] to-[#d48525]",
              )}
            >
              <FileSearch className="w-5 h-5 text-white" />
            </span>
            <span className={clsx("font-semibold text-lg", text)}>PDFChat</span>
          </a>

          {/* Desktop Menu */}
          <div className="hidden lg:flex lg:items-center lg:gap-8">
            {menu.map((m) => (
              <a
                key={m.href}
                href={m.href}
                className={clsx("text-sm font-medium transition-all duration-200 relative", subtext, "hover:text-current after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-current after:transition-all after:duration-300 hover:after:w-full")}
              >
                {m.label}
              </a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex lg:items-center lg:gap-3">
            <button
              onClick={onSignIn}
              className={clsx(
                "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 border",
                btnSecondary,
              )}
            >
              Sign In
            </button>
            <button
              onClick={onTryNow}
              className={clsx(
                "inline-flex items-center rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-lg whitespace-nowrap",
                btn,
                "shadow-[#b5651d]/30",
              )}
            >
              Start Free
              <ArrowRight className="w-4 h-4 ml-2 flex-shrink-0" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: isDark ? "#e8eaf0" : "#2c2416", background: isDark ? "rgba(37,45,64,0.5)" : "rgba(224,216,196,0.5)" }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t" style={{ borderColor: isDark ? "#2d3548" : "#d8d0c4", background: isDark ? "#161b27" : "#ede8e0" }}>
            <div className="flex flex-col gap-2 px-6">
              {menu.map((m) => (
                <a key={m.href} href={m.href} className={clsx("py-3 text-base font-medium", subtext, "hover:text-current transition-colors")} onClick={() => setMobileMenuOpen(false)}>
                  {m.label}
                </a>
              ))}
              <div className="pt-2 flex flex-col gap-2">
                <button onClick={() => { setMobileMenuOpen(false); onSignIn?.(); }} className={clsx("w-full rounded-xl px-5 py-2.5 text-sm font-semibold border text-left", btnSecondary)}>Sign In</button>
                <button onClick={() => { setMobileMenuOpen(false); onTryNow(); }} className={clsx("w-full rounded-xl px-6 py-3 text-sm font-semibold whitespace-nowrap", btn)}>Start Free <ArrowRight className="w-4 h-4 inline ml-2 flex-shrink-0" /></button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section id="product" className="relative max-w-7xl mx-auto px-6 pt-24 md:pt-32 pb-16 md:py-24 scroll-mt-20">
        {/* Badge */}
        <div style={fadeUp(0)}>
          <span
            className={clsx(
              "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full border",
              isDark ? "bg-[#252d40] text-[#5b9cf6] border-[#2d3548]" : "bg-[#f0e5d8] text-[#b5651d] border-[#e0d8cc]",
            )}
          >
            <Sparkles className="w-3 h-3" />
            AI-powered PDF chat
          </span>
        </div>

        {/* Headline */}
        <h1 className={clsx("mt-6 text-center text-4xl md:text-6xl lg:text-6xl font-bold tracking-tight leading-[1.1]", text)} style={fadeUp(100)}>
          Chat with your PDFs
          <br />
          <span className="relative" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>
            <span className="relative z-10">Get answers, not just search results</span>
            <span className="absolute bottom-2 left-0 right-0 h-3 -z-10 rounded-full"  />
          </span>
        </h1>

        {/* Subheadline */}
        <p className={clsx("mt-5 text-base md:text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed", subtext)} style={fadeUp(200)}>
          Ask questions in plain language and get streaming answers grounded in your documents — with precise citations that jump straight to the source page.
        </p>

        {/* Primary CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4" style={fadeUp(300)}>
          <button
            onClick={onTryNow}
            className={clsx(
              "inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold transition-all duration-200 hover:scale-105 shadow-xl whitespace-nowrap",
              btn,
              "shadow-[#b5651d]/40",
            )}
          >
            Start Free — No Credit Card
            <ArrowRight className="w-5 h-5 flex-shrink-0" />
          </button>
          <a
            href="#how-it-works"
            className={clsx(
              "inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold border transition-all duration-200 hover:scale-[1.02] whitespace-nowrap",
              isDark ? "border-[#2d3548] text-[#e8eaf0] hover:bg-[#252d40]" : "border-[#d8d0c4] text-[#2c2416] hover:bg-[#f0e5d8]",
            )}
          >
            See How It Works
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          </a>
        </div>

        {/* Trust line */}
        <p className={clsx("mt-5 text-xs", subtext)} style={fadeUp(380)}>
          Free to start · no credit card required · runs on your infrastructure
        </p>

        {/* Hero Visual: Floating Interactive Demo */}
        <div className="mt-12 relative" style={fadeUp(460)}>
          <div className="relative mx-auto max-w-4xl">
            {/* Glow background */}
            <div
              className="absolute -inset-10 rounded-3xl opacity-50 blur-3xl animate-pulse-slow"
              style={{
                background: isDark
                  ? "linear-gradient(135deg, rgba(37,99,235,0.35), rgba(139,92,246,0.25))"
                  : "linear-gradient(135deg, rgba(181,101,29,0.3), rgba(41,121,255,0.25))",
              }}
            />
            
            {/* Main Demo Card */}
            <div
              className="relative rounded-3xl border shadow-2xl overflow-hidden"
              style={{ background: isDark ? "#161b27" : "#ffffff", borderColor: isDark ? "#2d3548" : "#e0d8cc" }}
            >
              {/* Window Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: isDark ? "#2d3548" : "#e0d8cc", background: isDark ? "#1e2433" : "#f7f4f0" }}>
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: "#28ca42" }} />
                </div>
                <div className="ml-4 flex-1 text-center text-[11px] font-mono" style={{ color: isDark ? "#6b7a99" : "#8a7d6b" }}>PDFChat — chat.pdfchat.app</div>
                <div className="flex items-center gap-1 text-[11px]" style={{ color: isDark ? "#6b7a99" : "#8a7d6b" }}>
                  <Lock className="w-3 h-3" />
                  <span>Encrypted</span>
                </div>
              </div>

              {/* Chat Content */}
              <div className="p-4 sm:p-6 md:p-8 h-[500px] md:h-[420px] flex flex-col">
                {/* Welcome Message */}
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isDark ? "rgba(37,99,235,0.2)" : "rgba(181,101,29,0.15)" }}>
                    <FileSearch className="w-4 h-4" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: isDark ? "#e8eaf0" : "#2c2416" }}>
                      <span className="font-semibold">PDFChat</span> is ready. Upload a PDF and start asking questions.
                    </p>
                    <p className="text-xs mt-1" style={{ color: isDark ? "#6b7a99" : "#8a7d6b" }}>
                      Try: "Summarize the key risks" · "What are the termination terms?" · "Compare pricing tiers"
                    </p>
                  </div>
                </div>

                {/* Sample Conversation */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-3 text-sm" style={{ background: isDark ? "#2563eb" : "#b5651d", color: "white" }}>
                      What does the contract say about liability caps and indemnification?
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isDark ? "rgba(37,99,235,0.2)" : "rgba(181,101,29,0.15)" }}>
                      <FileSearch className="w-3.5 h-3.5" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }} />
                    </div>
                    <div className="flex-1 min-w-0" style={{ background: isDark ? "#1e2433" : "#faf8f5", border: isDark ? "1px solid #2d3548" : "1px solid #e0d8cc" }}>
                      <div className="p-4 text-sm leading-relaxed" style={{ color: isDark ? "#e8eaf0" : "#2c2416" }}>
                        Based on the contract, liability is <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>capped at the total fees paid</span> <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>[1]</span>. Indemnification requires <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>mutual defense</span> for IP claims and <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>breach of confidentiality</span> <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>[2][3]</span>.
                      </div>
                      <div className="px-4 pb-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium" style={{ background: isDark ? "#252d40" : "#f0e5d8", color: isDark ? "#5b9cf6" : "#b5651d", border: isDark ? "1px solid #2d3548" : "1px solid #e0d8cc" }}>
                          <FileSearch className="w-3 h-3" /> Source 1 — p.12
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium" style={{ background: isDark ? "#252d40" : "#f0e5d8", color: isDark ? "#5b9cf6" : "#b5651d", border: isDark ? "1px solid #2d3548" : "1px solid #e0d8cc" }}>
                          <FileSearch className="w-3 h-3" /> Source 2 — p.14
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium" style={{ background: isDark ? "#252d40" : "#f0e5d8", color: isDark ? "#5b9cf6" : "#b5651d", border: isDark ? "1px solid #2d3548" : "1px solid #e0d8cc" }}>
                          <FileSearch className="w-3 h-3" /> Source 3 — p.15
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Streaming indicator */}
                  <div className="flex items-center gap-2 text-[11px] ml-10" style={{ color: isDark ? "#6b7a99" : "#8a7d6b" }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: isDark ? "#2979ff" : "#b5651d" }} />
                    <span>Streaming…</span>
                    <span className="w-16 h-1.5 rounded-full overflow-hidden animate-shimmer" style={{ background: isDark ? "#252d40" : "#f0e5d8" }} />
                  </div>
                </div>

                {/* Input Area */}
                <div className="border-t pt-4" style={{ borderColor: isDark ? "#2d3548" : "#e0d8cc" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: isDark ? "#252d40" : "#f0e5d8" }}>
                      <Upload className="w-4 h-4" style={{ color: isDark ? "#6b7a99" : "#8a7d6b" }} />
                    </div>
                    <div className="flex-1 rounded-xl border px-4 py-3 text-sm" style={{ background: isDark ? "#161b27" : "#ffffff", borderColor: isDark ? "#2d3548" : "#e0d8cc", color: isDark ? "#e8eaf0" : "#2c2416" }}>
                      Ask a follow-up question…
                    </div>
                    <button className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ background: isDark ? "#2979ff" : "#b5651d" }}>
                      <ArrowRight className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating stat badges */}
            <div className="hidden sm:flex absolute -top-4 -right-4 flex-col gap-2">
              <div className="rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5" style={{ background: isDark ? "rgba(37,99,235,0.9)" : "rgba(181,101,29,0.9)", color: "white", backdropFilter: "blur(10px)" }}>
                <Zap className="w-3 h-3" /> <span>Streaming</span>
              </div>
              <div className="rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5" style={{ background: isDark ? "rgba(40,167,69,0.9)" : "rgba(40,167,69,0.9)", color: "white", backdropFilter: "blur(10px)" }}>
                <Shield className="w-3 h-3" /> <span>Cited</span>
              </div>
              <div className="rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5" style={{ background: isDark ? "rgba(139,92,246,0.9)" : "rgba(139,92,246,0.9)", color: "white", backdropFilter: "blur(10px)" }}>
                <Brain className="w-3 h-3" /> <span>Semantic</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4" style={fadeUp(560)}>
          {stats.map((s, _i) => (
            <div key={s.label} className="relative overflow-hidden rounded-2xl border p-5 group" style={{ background: isDark ? "rgba(30,36,51,0.7)" : "rgba(250,248,245,0.7)", borderColor: isDark ? "#2d3548" : "#e0d8cc", backdropFilter: "blur(10px)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: isDark ? "rgba(37,99,235,0.2)" : "rgba(181,101,29,0.15)" }}>
                  <s.icon className="w-4 h-4" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }} />
                </div>
                <p className={clsx("text-2xl md:text-3xl font-bold", text)}>{s.value}</p>
              </div>
              <p className={clsx("text-[11px] leading-tight", subtext)}>{s.label}</p>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: isDark ? "linear-gradient(90deg, #2979ff, #8b5cf6)" : "linear-gradient(90deg, #b5651d, #d48525)" }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative py-16 md:py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto" style={fadeUp(0)}>
            <span className={clsx("inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border mb-4", isDark ? "bg-[#252d40] text-[#5b9cf6] border-[#2d3548]" : "bg-[#f0e5d8] text-[#b5651d] border-[#e0d8cc]")}>
              How it works
            </span>
            <h2 className={clsx("text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight", text)}>
              From PDF to answer in <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>three steps</span>
            </h2>
            <p className={clsx("mt-4 text-lg", subtext)}>
              No complex setup. Upload, ask, verify — all in one seamless flow.
            </p>
          </div>

          <div className="mt-12 grid lg:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <article key={s.title} className="relative group" style={fadeUp(120 * (i + 1))}>
                {/* Number badge */}
                <div className="absolute -top-3 left-0 w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg" style={{ background: isDark ? "linear-gradient(135deg, #2979ff, #8b5cf6)" : "linear-gradient(135deg, #b5651d, #d48525)", color: "white", boxShadow: isDark ? "0 8px 24px rgba(37,99,235,0.25)" : "0 8px 24px rgba(181,101,29,0.25)" }}>
                  {s.number}
                </div>

                {/* Visual */}
                <div className="pt-12 mb-5">
                  {s.visual}
                </div>

                {/* Content */}
                <div className={clsx("rounded-2xl border p-5 h-[260px] flex flex-col", card)}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: isDark ? "rgba(37,99,235,0.2)" : "rgba(181,101,29,0.15)" }}>
                      <s.icon className="w-5 h-5" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }} />
                    </div>
                    <h3 className={clsx("text-base font-semibold", text)}>{s.title}</h3>
                  </div>
                  <p className={clsx("flex-1 text-sm leading-relaxed", subtext)}>{s.desc}</p>
                  <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: isDark ? "#2d3548" : "#e0d8cc" }}>
                    <span className="text-[11px] font-medium" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>Step {i + 1}</span>
                    <ChevronRight className="w-4 h-4" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Technical Details */}
          <div className="mt-12 rounded-2xl border p-5 md:p-7" style={{ background: isDark ? "rgba(30,36,51,0.4)" : "rgba(250,248,245,0.4)", borderColor: isDark ? "#2d3548" : "#e0d8cc" }}>
            <h3 className={clsx("text-base font-semibold mb-3 flex items-center gap-2", text)}>
              <TestTube2 className="w-5 h-5" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }} />
              Under the hood
            </h3>
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: isDark ? "rgba(22,27,39,0.5)" : "rgba(255,255,255,0.5)" }}>
                <Brain className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }} />
                <div>
                  <p className={clsx("font-medium", text)}>Hybrid Retrieval</p>
                  <p className={clsx("text-xs mt-1", subtext)}>45% cosine similarity + 55% keyword matching with MMR (λ=0.7) diversification</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: isDark ? "rgba(22,27,39,0.5)" : "rgba(255,255,255,0.5)" }}>
                <Layers className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }} />
                <div>
                  <p className={clsx("font-medium", text)}>Smart Chunking</p>
                  <p className={clsx("text-xs mt-1", subtext)}>~1000 chars, 100 overlap, snapped to sentence boundaries with character offsets</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: isDark ? "rgba(22,27,39,0.5)" : "rgba(255,255,255,0.5)" }}>
                <Zap className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }} />
                <div>
                  <p className={clsx("font-medium", text)}>Streaming + Retry</p>
                  <p className={clsx("text-xs mt-1", subtext)}>SSE with Retry-After handling, 5-attempt backoff, 120s stream timeout</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-16 md:py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto" style={fadeUp(0)}>
            <span className={clsx("inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border mb-4", isDark ? "bg-[#252d40] text-[#5b9cf6] border-[#2d3548]" : "bg-[#f0e5d8] text-[#b5651d] border-[#e0d8cc]")}>
              Features
            </span>
            <h2 className={clsx("text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight", text)}>
              Everything you need to <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>chat with documents</span>
            </h2>
            <p className={clsx("mt-4 text-lg", subtext)}>
              Built for researchers, lawyers, analysts, and anyone who needs answers from documents.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <article key={f.title} className="group relative" style={fadeUp(80 * (i + 1))}>
                <div className={clsx("rounded-2xl border p-5 h-full transition-all duration-300 hover:shadow-xl relative overflow-hidden", card)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: isDark ? "rgba(37,99,235,0.2)" : "rgba(181,101,29,0.15)" }}>
                    <f.icon className="w-5 h-5" style={{ color: isDark ? "#5b9cf6" : "#b5651d" }} />
                  </div>
                  <h3 className={clsx("text-base font-semibold mb-2", text)}>{f.title}</h3>
                  <p className={clsx("text-sm leading-relaxed mb-3", subtext)}>{f.desc}</p>
                  <p className={clsx("text-[11px] font-medium mb-4", isDark ? "text-[#5b9cf6]/80" : "text-[#b5651d]/80")}>{f.highlight}</p>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: isDark ? "linear-gradient(90deg, #2979ff, #8b5cf6)" : "linear-gradient(90deg, #b5651d, #d48525)" }} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Demo CTA ── */}
      <section className="relative py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl overflow-hidden" style={{ background: isDark ? "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(139,92,246,0.08))" : "linear-gradient(135deg, rgba(181,101,29,0.1), rgba(41,121,255,0.08))", border: isDark ? "1px solid #2d3548" : "1px solid #e0d8cc" }}>
            <div className="p-8 md:p-10 lg:p-14 text-center" style={fadeUp(0)}>
              <span className={clsx("inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border mb-4", isDark ? "bg-[#252d40] text-[#5b9cf6] border-[#2d3548]" : "bg-[#f0e5d8] text-[#b5651d] border-[#e0d8cc]")}>
                Try it live
              </span>
              <h2 className={clsx("text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3", text)}>
                Experience PDFChat in action
              </h2>
              <p className={clsx("text-lg max-w-2xl mx-auto mb-6", subtext)}>
                No signup required. Upload a PDF and see cited answers stream in real-time.
              </p>
              <button
                onClick={onTryNow}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold transition-all duration-200 hover:scale-105 shadow-xl whitespace-nowrap",
                  btn,
                  "shadow-[#b5651d]/40",
                )}
              >
                Try PDFChat Free
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </button>
              <p className={clsx("mt-4 text-sm", subtext)}>
                Your documents stay on your server. Only embeddings & chat calls hit Gemini.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative py-16 md:py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto" style={fadeUp(0)}>
            <span className={clsx("inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border mb-4", isDark ? "bg-[#252d40] text-[#5b9cf6] border-[#2d3548]" : "bg-[#f0e5d8] text-[#b5651d] border-[#e0d8cc]")}>
              Pricing
            </span>
            <h2 className={clsx("text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight", text)}>
              Simple, transparent <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>pricing</span>
            </h2>
            <p className={clsx("mt-4 text-lg", subtext)}>
              Start free. Upgrade when you need more power. No hidden fees.
            </p>
          </div>

          <div className="mt-10 grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {plans.map((p, i) => (
              <article key={p.name} className="relative group" style={fadeUp(100 * (i + 1))}>
                <div className={clsx(
                  "rounded-2xl border flex flex-col transition-all duration-300",
                  card,
                  p.featured && "ring-2 relative",
                  p.featured ? "p-5 md:p-7 pt-10 md:pt-12" : "p-5 md:p-7"
                )} style={{ borderColor: p.featured ? (isDark ? "#2979ff" : "#b5651d") : undefined }}>
                  {p.featured && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2">
                      <span className={clsx("inline-block text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full", isDark ? "bg-[#2979ff]/20 text-[#5b9cf6]" : "bg-[#b5651d]/20 text-[#b5651d]")}>
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-5">
                    <h3 className={clsx("text-base font-semibold", text)}>{p.name}</h3>
                    <p className={clsx("mt-1 text-[11px]", subtext)}>{p.tagline}</p>
                  </div>
                  <div className="mb-5">
                    <span className={clsx("text-3xl md:text-4xl font-bold", text)}>{p.price}</span>
                    <span className={clsx("text-base font-medium", subtext)}>{p.period}</span>
                  </div>
                  <ul className="flex-1 space-y-2.5 mb-7">
                    {p.features.map((f) => (
                      <li key={f} className={clsx("flex items-start gap-2.5 text-sm", text)}>
                        <div className="w-4 h-4 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: isDark ? "rgba(40,167,69,0.2)" : "rgba(40,167,69,0.15)" }}>
                          <Check className="w-3 h-3" style={{ color: "#28a745" }} />
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={p.onCta}
                    disabled={p.name === "Pro" || p.name === "Team"}
                    className={clsx(
                      "inline-flex items-center gap-2 justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
                      p.featured
                        ? clsx(btn, "shadow-lg", "shadow-[#b5651d]/40")
                        : btnSecondary,
                    )}
                  >
                    {p.cta}
                    {p.name !== "Team" && p.name !== "Pro" && <ArrowRight className="w-4 h-4 ml-2 flex-shrink-0" />}
                  </button>
                  {p.name === "Team" && (
                    <p className={clsx("mt-3 text-center text-[11px]", subtext)}>Custom pricing for your organization</p>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 text-center" style={fadeIn(300)}>
            <p className={clsx("text-sm mb-3", subtext)}>Need a custom plan? Enterprise features available.</p>
            <button onClick={onSignIn} className={clsx("inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold border transition-colors whitespace-nowrap", btnSecondary)}>
              Contact Sales
              <ArrowRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-16 md:py-24 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative rounded-2xl overflow-hidden" style={{ background: isDark ? "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(139,92,246,0.12))" : "linear-gradient(135deg, rgba(181,101,29,0.12), rgba(41,121,255,0.08))", border: isDark ? "1px solid #2d3548" : "1px solid #e0d8cc" }}>
            <div className="p-8 md:p-10 lg:p-14" style={fadeUp(0)}>
              <span className={clsx("inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border mb-4", isDark ? "bg-[#252d40] text-[#5b9cf6] border-[#2d3548]" : "bg-[#f0e5d8] text-[#b5651d] border-[#e0d8cc]")}>
                Ready to start?
              </span>
              <h2 className={clsx("text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3", text)}>
                Stop searching. <br />Start <span style={{ color: isDark ? "#5b9cf6" : "#b5651d" }}>chatting</span> with your PDFs.
              </h2>
              <p className={clsx("mt-3 text-lg max-w-xl mx-auto mb-6", subtext)}>
                Free to start. No credit card. Cancel anytime.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onTryNow}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold transition-all duration-200 hover:scale-105 shadow-xl whitespace-nowrap",
                    btn,
                    "shadow-[#b5651d]/40",
                  )}
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 flex-shrink-0" />
                </button>
                <button onClick={onTryNow} className={clsx("inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold border transition-colors whitespace-nowrap", btnSecondary)}>
                  See Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative border-t py-12 md:py-16" style={{ borderColor: isDark ? "#2d3548" : "#d8d0c4" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-2">
              <a href="#top" className="flex items-center gap-2 mb-5" aria-label="PDFChat Home">
                <span className={clsx("inline-flex items-center justify-center w-9 h-9 rounded-xl", isDark ? "bg-gradient-to-br from-[#2979ff] to-[#8b5cf6]" : "bg-gradient-to-br from-[#b5651d] to-[#d48525]")}>
                  <FileSearch className="w-5 h-5 text-white" />
                </span>
                <span className={clsx("font-semibold text-lg", text)}>PDFChat</span>
              </a>
              <p className={clsx("text-sm leading-relaxed mb-5 max-w-xs", subtext)}>
                Chat with your documents using AI. Get cited answers grounded in your files.
              </p>
              <div className="flex items-center gap-3">
                <a href="https://github.com/RohanPengonda/PDFChat" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110" style={{ background: isDark ? "#252d40" : "#f0e5d8", color: isDark ? "#6b7a99" : "#8a7d6b" }} aria-label="GitHub">
                  <Globe className="w-4 h-4" />
                </a>
                <button type="button" onClick={onSignIn} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110" style={{ background: isDark ? "#252d40" : "#f0e5d8", color: isDark ? "#6b7a99" : "#8a7d6b" }} aria-label="Contact support">
                  <Users className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Product */}
            <nav>
              <h4 className={clsx("font-semibold text-sm uppercase tracking-wider mb-3", text)}>Product</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className={clsx("text-sm transition-colors", subtext, "hover:text-current")}>Features</a></li>
                <li><a href="#how-it-works" className={clsx("text-sm transition-colors", subtext, "hover:text-current")}>How it works</a></li>
                <li><a href="#pricing" className={clsx("text-sm transition-colors", subtext, "hover:text-current")}>Pricing</a></li>
                <li><span className={clsx("text-sm", subtext)}>Changelog</span></li>
                <li><span className={clsx("text-sm", subtext)}>Roadmap</span></li>
              </ul>
            </nav>

            {/* Company */}
            <nav>
              <h4 className={clsx("font-semibold text-sm uppercase tracking-wider mb-3", text)}>Company</h4>
              <ul className="space-y-2.5">
                <li><a href="#top" className={clsx("text-sm transition-colors", subtext, "hover:text-current")}>About</a></li>
                <li><button type="button" onClick={onSignIn} className={clsx("text-sm transition-colors", subtext, "hover:text-current")}>Contact</button></li>
                <li><span className={clsx("text-sm", subtext)}>Privacy</span></li>
                <li><span className={clsx("text-sm", subtext)}>Terms</span></li>
              </ul>
            </nav>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderColor: isDark ? "#2d3548" : "#d8d0c4" }}>
            <p className={clsx("text-[11px]", subtext)}>© 2026 PDFChat. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <span className={clsx("text-[11px]", subtext)}>Privacy</span>
              <span className={clsx("text-[11px]", subtext)}>Terms</span>
              <a href="https://github.com/RohanPengonda/PDFChat" target="_blank" rel="noreferrer" className={clsx("text-[11px] transition-colors", subtext, "hover:text-current")}>Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}