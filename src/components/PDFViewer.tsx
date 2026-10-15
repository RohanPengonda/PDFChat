import { useState, useEffect, useMemo, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2, ClipboardList } from "lucide-react";
import { getAuthHeaders } from "../lib/api";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { clsx } from "clsx";

// Bundle the pdf.js worker locally with Vite instead of loading it from unpkg,
// so the app still renders offline and doesn't depend on an external CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PDFViewerProps {
  fileUrl: string | null;
  pageNumber?: number;
  highlightText?: string;
  isDark?: boolean;
  onSummaryClick?: () => void;
  isLoadingSummary?: boolean;
}

export function PDFViewer({
  fileUrl,
  pageNumber = 1,
  highlightText,
  isDark = true,
  onSummaryClick,
  isLoadingSummary = false,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(pageNumber);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [zoom, setZoom] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure outer container width responsively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setContainerWidth(Math.floor(w - 48));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setCurrentPage(pageNumber);
  }, [pageNumber]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Highlight the cited passage in the rendered text layer.
  //
  // The text layer is rendered asynchronously, so we poll until spans exist
  // instead of assuming a fixed delay. Match positions are computed in a
  // whitespace-stripped copy of the page text (the stored chunk joins PDF items
  // with spaces while the DOM does not) and then mapped back to real spans.
  useEffect(() => {
    if (!highlightText || !containerRef.current) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const applyHighlight = (attempt: number) => {
      if (cancelled) return;
      const textLayer = containerRef.current?.querySelector(
        ".react-pdf__Page__textContent",
      ) as HTMLElement | null;
      const spans = textLayer
        ? (Array.from(textLayer.querySelectorAll("span")) as HTMLElement[])
        : [];

      const hasText = spans.some((s) => (s.textContent || "").trim().length > 0);
      if (!textLayer || spans.length === 0 || !hasText) {
        // Still rendering; retry for a few seconds before giving up.
        if (attempt < 25) {
          timeoutId = setTimeout(() => applyHighlight(attempt + 1), 120);
        }
        return;
      }

      // Reset any previous highlight.
      spans.forEach((span) => {
        span.style.backgroundColor = "";
        span.style.padding = "";
        span.style.borderRadius = "";
        span.removeAttribute("data-highlight-id");
      });

      const normalizedSearch = highlightText.toLowerCase().trim().replace(/\s+/g, " ");
      const searchCompact = normalizedSearch.replace(/\s+/g, "");
      if (!searchCompact) return;

      // Collect spans with cumulative real positions.
      const spanTexts: { span: HTMLElement; text: string; index: number }[] = [];
      let globalIndex = 0;
      for (const span of spans) {
        const text = (span.textContent || "").toLowerCase();
        spanTexts.push({ span, text, index: globalIndex });
        globalIndex += text.length;
      }

      // Whitespace-stripped page text + map from stripped index -> real index.
      let fullCompact = "";
      const offsetMap: number[] = [];
      for (const s of spanTexts) {
        for (let i = 0; i < s.text.length; i++) {
          if (!/\s/.test(s.text[i])) {
            offsetMap.push(s.index + i);
            fullCompact += s.text[i];
          }
        }
      }

      // Prefer the full phrase; fall back to the first distinctive keyword.
      let matchStart = fullCompact.indexOf(searchCompact);
      let matchLength = searchCompact.length;
      if (matchStart === -1) {
        const keywords = normalizedSearch.split(/\s+/).filter((p) => p.length > 5);
        for (const keyword of keywords) {
          const kwCompact = keyword.replace(/\s+/g, "");
          const pos = kwCompact ? fullCompact.indexOf(kwCompact) : -1;
          if (pos !== -1) {
            matchStart = pos;
            matchLength = kwCompact.length;
            break;
          }
        }
      }
      if (matchStart === -1) return;

      // Map compact start/end back to real character positions.
      const startReal = offsetMap[matchStart];
      const endCompact = Math.min(matchStart + matchLength - 1, offsetMap.length - 1);
      const endReal = offsetMap[endCompact];
      if (startReal === undefined || endReal === undefined) return;

      // Find the spans covering [startReal, endReal].
      let startSpanIdx = -1;
      let endSpanIdx = -1;
      let cursor = 0;
      for (let i = 0; i < spanTexts.length; i++) {
        const spanEnd = cursor + spanTexts[i].text.length;
        if (startSpanIdx === -1 && startReal < spanEnd && startReal >= cursor) {
          startSpanIdx = i;
        }
        if (startSpanIdx !== -1 && endReal < spanEnd) {
          endSpanIdx = i;
          break;
        }
        cursor = spanEnd;
      }
      if (endSpanIdx === -1 && startSpanIdx !== -1) {
        endSpanIdx = spanTexts.length - 1;
      }

      if (startSpanIdx !== -1 && endSpanIdx !== -1) {
        const highlightId = `highlight-${Date.now()}`;
        for (let i = startSpanIdx; i <= endSpanIdx; i++) {
          const span = spanTexts[i].span;
          span.style.backgroundColor = "rgba(255, 255, 100, 0.45)";
          span.style.padding = "2px 4px";
          span.style.borderRadius = "3px";
          span.setAttribute("data-highlight-id", highlightId);
        }
        spanTexts[startSpanIdx].span.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    };

    // Small initial delay so the page has a chance to mount before polling.
    timeoutId = setTimeout(() => applyHighlight(0), 60);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentPage, highlightText, fileUrl]);

  // Memoized so the identity is stable across renders (react-pdf compares props
  // with === and would otherwise refetch the document every render). The token
  // is fixed for a mounted session; a login/logout remounts this component.
  const pdfOptions = useMemo(() => ({ httpHeaders: getAuthHeaders() }), []);

  const bg = isDark ? "bg-[#161b27]" : "bg-[#f0ece6]";
  const cardBg = isDark ? "bg-[#1e2433]" : "bg-white";
  const border = isDark ? "border-[#2d3548]" : "border-[#d8d0c4]";
  const textMain = isDark ? "text-[#e8eaf0]" : "text-[#2c2416]";
  const textSub = isDark ? "text-[#6b7a99]" : "text-[#8a7d6b]";
  const pageBg = isDark
    ? "bg-[#1e2433] border-[#2d3548]"
    : "bg-[#ede8e0] border-[#d8d0c4]";
  const pageBtn = isDark
    ? "text-[#6b7a99] hover:text-white disabled:opacity-20"
    : "text-[#8a7d6b] hover:text-[#2c2416] disabled:opacity-30";

  return (
    <div ref={containerRef} className={clsx("flex flex-col h-full", bg)}>
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center">
        {fileUrl ? (
          <>
            <Document
              file={fileUrl}
              options={pdfOptions}
              onLoadSuccess={onDocumentLoadSuccess}
              className="shadow-2xl shadow-black/40 rounded-lg"
              loading={
                <div
                  className={clsx(
                    "flex items-center gap-2 mt-20 text-sm",
                    textSub,
                  )}
                >
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
                  Loading PDF…
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                width={Math.min(containerWidth, 900) * zoom}
                className="rounded-lg overflow-hidden"
              />
            </Document>
          </>
        ) : (
          <div
            className={clsx(
              "w-full min-h-full rounded-2xl border flex flex-col items-center justify-center gap-5 text-center",
              cardBg,
              border,
            )}
          >
            <div className="relative w-32 h-32 opacity-60">
              <svg
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <rect
                  x="15"
                  y="20"
                  width="55"
                  height="72"
                  rx="4"
                  fill="#2a3a5c"
                  stroke="#3a5080"
                  strokeWidth="1.5"
                />
                <rect
                  x="22"
                  y="14"
                  width="55"
                  height="72"
                  rx="4"
                  fill="#1e2d4a"
                  stroke="#3a5080"
                  strokeWidth="1.5"
                />
                <rect
                  x="29"
                  y="8"
                  width="55"
                  height="72"
                  rx="4"
                  fill="#162238"
                  stroke="#2a4060"
                  strokeWidth="1.5"
                />
                <line
                  x1="38"
                  y1="28"
                  x2="74"
                  y2="28"
                  stroke="#3a5080"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="38"
                  y1="36"
                  x2="74"
                  y2="36"
                  stroke="#3a5080"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="38"
                  y1="44"
                  x2="60"
                  y2="44"
                  stroke="#3a5080"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="82"
                  cy="72"
                  r="18"
                  fill="#1a2a45"
                  stroke="#2a4060"
                  strokeWidth="1.5"
                />
                <circle
                  cx="82"
                  cy="72"
                  r="10"
                  fill="none"
                  stroke="#3a6090"
                  strokeWidth="2"
                />
                <line
                  x1="92"
                  y1="82"
                  x2="100"
                  y2="90"
                  stroke="#4a70a0"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <p
                className={clsx(
                  "text-sm font-bold uppercase tracking-widest",
                  textMain,
                )}
              >
                Select a document to start.
              </p>
              <p className={clsx("text-xs mt-1.5 max-w-xs", textSub)}>
                Integrated, intelligent chat and analysis across multiple files.
              </p>
            </div>
          </div>
        )}
      </div>

      {fileUrl && numPages > 0 && (
        <div
          className={clsx(
            "flex items-center gap-1 border-t px-4 py-2 shrink-0",
            pageBg,
            border,
          )}
        >
          {/* Zoom controls - left */}
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))
              }
              disabled={zoom <= 0.5}
              className={clsx(
                "w-7 h-7 rounded-lg text-sm font-bold flex items-center justify-center transition-colors",
                pageBtn,
              )}
              title="Zoom out"
            >
              −
            </button>
            <span className={clsx("text-xs w-9 sm:w-10 text-center", textSub)}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))}
              disabled={zoom >= 2}
              className={clsx(
                "w-7 h-7 rounded-lg text-sm font-bold flex items-center justify-center transition-colors",
                pageBtn,
              )}
              title="Zoom in"
            >
              +
            </button>
            {zoom !== 1 && (
              <button
                onClick={() => setZoom(1)}
                className={clsx(
                  "ml-1 px-2 py-0.5 text-[10px] font-medium rounded-lg border transition-colors hidden sm:flex",
                  isDark
                    ? "border-[#3a4060] text-blue-400 hover:bg-blue-500/10"
                    : "border-blue-300 text-blue-500 hover:bg-blue-50",
                )}
                title="Reset zoom"
              >
                Reset
              </button>
            )}
          </div>

          {/* Summary button - center */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={onSummaryClick}
              disabled={isLoadingSummary}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                isDark
                  ? "text-[#6b7a99] hover:text-white hover:bg-blue-500/10 disabled:opacity-50"
                  : "text-[#8a7d6b] hover:text-[#2c2416] hover:bg-blue-50 disabled:opacity-50",
              )}
              title="Generate summary"
            >
              {isLoadingSummary ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ClipboardList className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Summary</span>
            </button>
          </div>

          {/* Page navigation - right */}
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className={clsx(
                "px-2 sm:px-3 py-1 text-xs font-medium rounded-xl transition-colors",
                pageBtn,
              )}
              title="Previous page"
            >
              ←<span className="hidden sm:inline">&nbsp;Prev</span>
            </button>
            <span
              className={clsx("text-xs px-2 sm:px-3 border-x", border, textSub)}
            >
              {currentPage} / {numPages}
            </span>
            <button
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className={clsx(
                "px-2 sm:px-3 py-1 text-xs font-medium rounded-xl transition-colors",
                pageBtn,
              )}
              title="Next page"
            >
              <span className="hidden sm:inline">Next&nbsp;</span>→
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
