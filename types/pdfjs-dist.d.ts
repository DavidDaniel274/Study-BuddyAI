declare module 'pdfjs-dist/legacy/build/pdf.worker.js';
declare module 'pdfjs-dist/legacy/build/pdf.js' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(params: { data: ArrayBuffer }): { promise: Promise<PDFDocumentProxy> };
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(n: number): Promise<PDFPageProxy>;
  }
  export interface PDFPageProxy {
    getTextContent(): Promise<{ items: Array<{ str?: string }> }>;
  }
}
