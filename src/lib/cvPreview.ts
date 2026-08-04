import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/** Render first PDF page to a PNG blob for email/admin preview. */
export async function renderPdfFirstPagePreview(file: File): Promise<Blob | null> {
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return null;
  }

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.35 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) return null;

    await page.render({
      canvasContext: context,
      viewport,
      canvas,
    }).promise;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/png', 0.92);
    });

    pdf.destroy();
    return blob;
  } catch (err) {
    console.error('PDF preview render failed:', err);
    return null;
  }
}
