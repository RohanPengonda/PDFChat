import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { clsx } from "clsx";

// Set worker to match pdfjs-dist version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  fileUrl: string | null;
  pageNumber?: number;
  highlightText?: string;
}

export function PDFViewer({
  fileUrl,
  pageNumber = 1,
  highlightText,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(pageNumber);
  const containerRef = useRef<HTMLDivElement>(null);

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

      // Try with flexible whitespace (but safely escape special chars)
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
          if (match && match.index !== undefined) {
            matchStart = match.index;
          }
        } catch (e) {
          console.warn("Regex matching failed, trying next strategy");
        }
      }

      // Try matching key words instead of regex
      if (matchStart === -1) {
        const keywords = normalizedSearch
          .split(/\s+/)
          .filter((p) => p.length > 3);
        if (keywords.length > 0) {
          for (const keyword of keywords) {
            const pos = fullText.indexOf(keyword);
            if (pos !== -1) {
              matchStart = pos;
              break;
            }
          }
        }
      }

      // Try substring matching (match at least 30 characters or half the text)
      if (matchStart === -1 && normalizedSearch.length >= 30) {
        const substringLength = Math.max(
          30,
          Math.ceil(normalizedSearch.length / 2),
        );
        const substring = normalizedSearch.substring(0, substringLength);
        matchStart = fullText.indexOf(substring);
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

  return (
    <div
      className="flex flex-col items-center bg-gray-100 h-full overflow-auto p-4"
      ref={containerRef}
    >
      {fileUrl ? (
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          className="shadow-lg"
          loading={<div className="p-10">Loading PDF...</div>}
        >
          <Page
            pageNumber={currentPage}
            renderTextLayer={true}
            renderAnnotationLayer={false}
            width={600}
            className="bg-white"
          />
        </Document>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Select a document to view
        </div>
      )}

      {fileUrl && (
        <div className="mt-4 flex gap-4 items-center bg-white p-2 rounded shadow sticky bottom-4">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {numPages}
          </span>
          <button
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
