import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2, ClipboardList } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { clsx } from "clsx";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  fileUrl: string | null;
  pageNumber?: number;
  highlightText?: string;
  isDark?: boolean;
  onSummaryClick?: () => void;
  isLoadingSummary?: boolean;
  docName?: string;
}

export function PDFViewer({
  fileUrl,
  pageNumber = 1,
  highlightText,
  isDark = true,
  onSummaryClick,
  isLoadingSummary = false,
  docName = "Document",
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

  // Improved highlighting effect with exact text matching
  useEffect(() => {
    if (!highlightText || !containerRef.current) return;

    const timer = setTimeout(() => {
      const textLayer = containerRef.current?.querySelector(
        ".react-pdf__Page__textContent",
      );
      if (!textLayer) return;

      // Reset previous highlights
      const spans = Array.from(
        textLayer.querySelectorAll("span"),
      ) as HTMLElement[];
      spans.forEach((span) => {
        span.style.backgroundColor = "";
        span.style.padding = "";
        span.style.borderRadius = "";
        span.removeAttribute("data-highlight-id");
      });

      // Prepare search text - normalize whitespace
      const searchText = highlightText.toLowerCase().trim();
      const normalizedSearch = searchText.replace(/\s+/g, " ");

      // Collect all text spans and their positions
      const spanTexts: { span: HTMLElement; text: string; index: number }[] =
        [];
      let globalIndex = 0;

      spans.forEach((span) => {
        const text = (span.textContent || "").toLowerCase();
        spanTexts.push({ span, text, index: globalIndex });
        globalIndex += text.length;
      });

      // Concatenate all text for searching
      const fullText = spanTexts.map((s) => s.text).join("");

      // Helper function to escape regex special characters
      const escapeRegex = (str: string) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };

      let matchStart = fullText.indexOf(normalizedSearch);

      // Try with flexible whitespace
      if (matchStart === -1 && normalizedSearch.length > 10) {
        try {
          const searchPart = normalizedSearch.slice(
            0,
            Math.min(50, normalizedSearch.length),
          );
          const escaped = escapeRegex(searchPart);
          const flexiblePattern = escaped.replace(/\\ /g, "\\s*");
          const regex = new RegExp(flexiblePattern);
          const match = fullText.match(regex);
          if (match && match.index !== undefined) matchStart = match.index;
        } catch (e) {}
      }

      // Try substring match (first 40 chars) - only if text is long enough
      if (matchStart === -1 && normalizedSearch.length >= 20) {
        const substring = normalizedSearch.substring(
          0,
          Math.min(40, normalizedSearch.length),
        );
        matchStart = fullText.indexOf(substring);
      }

      // Last resort: match first keyword ONLY if it's specific enough (>5 chars)
      if (matchStart === -1) {
        const keywords = normalizedSearch
          .split(/\s+/)
          .filter((p) => p.length > 5);
        for (const keyword of keywords) {
          const pos = fullText.indexOf(keyword);
          if (pos !== -1) {
            matchStart = pos;
            break;
          }
        }
      }

      if (matchStart !== -1) {
        // Find the spans that contain this match
        let currentPos = 0;
        let startSpanIdx = -1;
        let endSpanIdx = -1;
        let highlightId = `highlight-${Date.now()}`;

        for (let i = 0; i < spanTexts.length; i++) {
          const spanLength = spanTexts[i].text.length;
          const spanEnd = currentPos + spanLength;

          // Start span
          if (
            startSpanIdx === -1 &&
            matchStart < spanEnd &&
            matchStart >= currentPos
          ) {
            startSpanIdx = i;
          }

          // End span (match up to ~250 chars or 8 spans, whichever is smaller)
          if (
            startSpanIdx !== -1 &&
            (spanEnd - matchStart >= 250 || i >= startSpanIdx + 8)
          ) {
            endSpanIdx = i;
            break;
          }

          currentPos = spanEnd;
        }

        // If we didn't find end, use a reasonable range
        if (endSpanIdx === -1) {
          endSpanIdx = Math.min(startSpanIdx + 12, spans.length - 1);
        }

        // Highlight the found spans
        if (startSpanIdx !== -1 && endSpanIdx !== -1) {
          for (let i = startSpanIdx; i <= endSpanIdx; i++) {
            const span = spanTexts[i].span;
            span.style.backgroundColor = "rgba(255, 255, 100, 0.45)"; // Light yellow
            span.style.padding = "2px 4px";
            span.style.borderRadius = "3px";
            span.setAttribute("data-highlight-id", highlightId);
          }

          // Scroll the first highlighted span into view
          spanTexts[startSpanIdx].span.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }, 300); // Reduced timeout for faster highlighting

    return () => clearTimeout(timer);
  }, [currentPage, highlightText, fileUrl]);

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
              "w-full h-[85vh] rounded-2xl border flex flex-col items-center justify-center gap-5 text-center",
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
            <span className={clsx("text-xs w-10 text-center", textSub)}>
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
                  "ml-1 px-2 py-0.5 text-[10px] font-medium rounded-lg border transition-colors",
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
              <span>Summary</span>
            </button>
          </div>

          {/* Page navigation - right */}
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className={clsx(
                "px-3 py-1 text-xs font-medium rounded-xl transition-colors",
                pageBtn,
              )}
            >
              ← Prev
            </button>
            <span className={clsx("text-xs px-3 border-x", border, textSub)}>
              {currentPage} / {numPages}
            </span>
            <button
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className={clsx(
                "px-3 py-1 text-xs font-medium rounded-xl transition-colors",
                pageBtn,
              )}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
