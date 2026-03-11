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

  // Improved highlighting effect
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
      });

      // Clean and prepare search text
      const searchText = highlightText.toLowerCase().trim().substring(0, 200);
      const searchWords = searchText
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 8);

      if (searchWords.length === 0) return;

      // Find best matching span
      let bestMatch = { index: -1, score: 0 };

      for (let i = 0; i < spans.length; i++) {
        const spanText = (spans[i].textContent || "").toLowerCase();
        const matchCount = searchWords.filter((word) =>
          spanText.includes(word),
        ).length;

        if (matchCount > bestMatch.score) {
          bestMatch = { index: i, score: matchCount };
        }
      }

      // Highlight if we found a good match (at least 2 words)
      if (bestMatch.score >= 2) {
        const startIdx = Math.max(0, bestMatch.index - 1);
        const endIdx = Math.min(spans.length, bestMatch.index + 4);

        for (let j = startIdx; j < endIdx; j++) {
          spans[j].style.backgroundColor = "rgba(255, 255, 0, 0.5)";
          spans[j].style.padding = "2px 4px";
          spans[j].style.borderRadius = "2px";
        }

        spans[bestMatch.index].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 1000);

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
