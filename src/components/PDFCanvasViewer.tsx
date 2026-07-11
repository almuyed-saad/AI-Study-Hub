import React, { useEffect, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut, AlertCircle } from "lucide-react";

interface PDFCanvasViewerProps {
  documentId: number;
  token: string;
}

export const PDFCanvasViewer: React.FC<PDFCanvasViewerProps> = ({ documentId, token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const renderTasksRef = useRef<any[]>([]);

  // 1. Load PDF.js Script and worker from CDN dynamically to bypass local bundler worker issues
  useEffect(() => {
    let isMounted = true;

    const loadPdfJs = async () => {
      try {
        if (!(window as any).pdfjsLib) {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.async = true;
          document.body.appendChild(script);

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load PDF viewer engine."));
          });
        }

        // Configure worker CDN path
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }

        if (isMounted) {
          await fetchAndRenderPDF();
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to initialize PDF viewer engine.");
          setLoading(false);
        }
      }
    };

    const fetchAndRenderPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch PDF as binary stream with our auth token to prevent sandbox iframe cookie issues
        const response = await fetch(`/api/documents/${documentId}/preview?token=${token}`);
        if (!response.ok) {
          throw new Error(`Failed to download PDF (${response.status} ${response.statusText})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error("PDF.js library is not available on window object");
        }

        const loadingTask = pdfjsLib.getDocument({ data: uint8 });
        const pdf = await loadingTask.promise;

        if (isMounted) {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("PDF loading error:", err);
        if (isMounted) {
          setError(err.message || "Could not render original PDF layout.");
          setLoading(false);
        }
      }
    };

    loadPdfJs();

    return () => {
      isMounted = false;
      // Cancel active renders
      renderTasksRef.current.forEach(task => {
        try {
          task.destroy();
        } catch (e) {
          // ignore
        }
      });
    };
  }, [documentId, token]);

  // 2. Render all pages when pdfDoc or scale changes
  useEffect(() => {
    if (!pdfDoc) return;

    let isMounted = true;
    renderTasksRef.current.forEach(task => {
      try {
        task.destroy();
      } catch (e) {
        // ignore
      }
    });
    renderTasksRef.current = [];

    const renderPages = async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (!isMounted) break;

        try {
          const page = await pdfDoc.getPage(pageNum);
          const canvas = document.getElementById(`pdf-page-${pageNum}`) as HTMLCanvasElement;
          if (!canvas) continue;

          const context = canvas.getContext("2d");
          if (!context) continue;

          // Support High DPI / Retina displays beautifully
          const dpr = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale });
          
          canvas.height = viewport.height * dpr;
          canvas.width = viewport.width * dpr;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.width = `${viewport.width}px`;
          context.scale(dpr, dpr);

          const renderContext = {
            canvasContext: context,
            viewport,
          };

          const renderTask = page.render(renderContext);
          renderTasksRef.current.push(renderTask);
          await renderTask.promise;
        } catch (err) {
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      }
    };

    renderPages();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, scale, numPages]);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-12 gap-3 min-h-[300px] bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="text-sm text-slate-400 font-medium">
          Loading high-performance PDF renderer...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center gap-4 min-h-[300px] bg-slate-950">
        <AlertCircle className="h-12 w-12 text-red-500 animate-pulse" />
        <div>
          <h4 className="font-bold text-slate-200">Unable to load original layout</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1">{error}</p>
        </div>
        <a
          href={`/api/documents/${documentId}/download?token=${token}`}
          download
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-sm transition-all"
        >
          Download PDF Document
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-900">
      {/* Zoom / Controls Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium select-none">
          <span>Pages: {numPages}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(s => Math.max(0.6, s - 0.15))}
            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-300 min-w-[45px] text-center font-mono font-medium select-none">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(2.5, s + 0.15))}
            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setScale(1.2)}
            className="p-1 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer text-[11px] font-bold px-2 border border-slate-600"
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Pages Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent bg-slate-950"
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
          <div
            key={pageNum}
            className="relative shadow-2xl rounded bg-white border border-slate-800 transition-all duration-300"
            style={{
              width: "fit-content",
            }}
          >
            <canvas id={`pdf-page-${pageNum}`} className="rounded shadow-sm max-w-full" />
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] text-slate-300 select-none font-mono z-10">
              Page {pageNum} of {numPages}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
