// Document extraction utilities — real PDF text extraction via pdfjs-dist,
// plain-text reading, and URL content fetching via the extract-url edge function.

type ExtractedDoc = {
  name: string;
  type: string;
  sizeBytes: number;
  content: string;
  pages: number;
};

const MAX_CONTENT = 50000;

// Extract text from a PDF file using pdfjs-dist in the browser
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.js');
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/legacy/build/pdf.worker.js')).default;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    fullText += pageText + '\n\n';
    if (fullText.length >= MAX_CONTENT) break;
  }

  return fullText.slice(0, MAX_CONTENT).trim();
}

// Read a plain-text file (.txt, .md, .csv, .json, .html)
export async function extractTextFile(file: File): Promise<string> {
  const text = await file.text();
  // If it's HTML, strip tags
  if (file.name.endsWith('.html') || file.name.endsWith('.htm') || text.includes('<html')) {
    return text
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_CONTENT);
  }
  return text.slice(0, MAX_CONTENT).trim();
}

// Main entry point — figures out extraction method by file type
export async function extractDocument(file: File): Promise<ExtractedDoc> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let content = '';
  let pages = 1;

  try {
    if (ext === 'pdf') {
      content = await extractPdfText(file);
      // Estimate pages from size if extraction returned something
      if (content) {
        const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.js');
        const ab = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: ab }).promise;
        pages = pdf.numPages;
      }
    } else if (['txt', 'md', 'csv', 'json', 'html', 'htm', 'rtf', 'log', 'text'].includes(ext)) {
      content = await extractTextFile(file);
    } else if (file.type.startsWith('text/')) {
      content = await extractTextFile(file);
    } else {
      // Try reading as text anyway
      content = await file.text().catch(() => '');
      if (!content) {
        content = `[Binary file: ${file.name}. This file type isn't directly readable as text. Please upload a PDF, text, or HTML document for full content extraction.]`;
      }
    }
  } catch (err: any) {
    content = `[Error extracting text from ${file.name}: ${err?.message ?? 'Unknown error'}. The file may be corrupted or use an unsupported encoding.]`;
  }

  return {
    name: file.name,
    type: ext,
    sizeBytes: file.size,
    content: content.slice(0, MAX_CONTENT),
    pages,
  };
}

// Fetch content from a URL via the extract-url edge function
export async function extractUrlContent(url: string): Promise<ExtractedDoc> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
  const fnUrl = `${supabaseUrl}/functions/v1/extract-url`;

  const resp = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({ url }),
  });

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    throw new Error(errBody.error ?? `Failed to extract URL (status ${resp.status})`);
  }

  const data = await resp.json();
  if (!data.content || data.content.length < 50) {
    throw new Error(data.error ?? 'The page did not contain enough readable text.');
  }

  const hostname = (() => {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'website'; }
  })();

  return {
    name: data.title || hostname,
    type: 'url',
    sizeBytes: data.content.length,
    content: data.content.slice(0, MAX_CONTENT),
    pages: Math.max(1, Math.ceil(data.content.length / 3000)),
  };
}
