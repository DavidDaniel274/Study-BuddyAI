import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'url' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!parsed.protocol.startsWith("http")) {
      return new Response(
        JSON.stringify({ error: "Only HTTP/HTTPS URLs are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let resp: Response;
    try {
      resp = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; StudyFlowAI/1.0; +https://studyflow.app/bot)",
          "Accept": "text/html, text/plain, application/xhtml+xml",
        },
        redirect: "follow",
      });
    } catch (err) {
      clearTimeout(timeout);
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: ${err.message}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    clearTimeout(timeout);

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `URL returned status ${resp.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentType = resp.headers.get("content-type") ?? "";
    let rawText = "";
    let isHtml = false;

    if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
      rawText = await resp.text();
      isHtml = true;
    } else if (contentType.includes("text/plain") || contentType.includes("application/pdf")) {
      rawText = await resp.text();
    } else {
      rawText = await resp.text();
      isHtml = rawText.includes("<html") || rawText.includes("<!DOCTYPE");
    }

    let title = "";
    let mainContent = "";

    if (isHtml || rawText.includes("<")) {
      // Extract title
      const titleMatch = rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, "").trim();

      // Remove script, style, nav, footer, header, aside, noscript tags and their content
      let cleaned = rawText
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
        .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
        .replace(/<header[\s\S]*?<\/header>/gi, " ")
        .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ");

      // Try to find <main>, <article>, or <section> content first
      const mainMatch = cleaned.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
      if (mainMatch) {
        cleaned = mainMatch[1];
      } else {
        // Try <section> tags
        const sectionMatches = cleaned.match(/<section[^>]*>([\s\S]*?)<\/section>/gi);
        if (sectionMatches && sectionMatches.length > 0) {
          cleaned = sectionMatches.join(" ");
        }
      }

      // Remove all remaining HTML tags
      cleaned = cleaned.replace(/<[^>]+>/g, " ");

      // Decode common HTML entities
      cleaned = cleaned
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&hellip;/g, "...")
        .replace(/&mdash;/g, "—")
        .replace(/&ndash;/g, "–")
        .replace(/&[a-z]+;/gi, " ");

      // Collapse whitespace
      mainContent = cleaned.replace(/\s+/g, " ").trim();
    } else {
      mainContent = rawText.replace(/\s+/g, " ").trim();
    }

    // Limit to ~50000 chars to stay within reasonable bounds
    mainContent = mainContent.slice(0, 50000);

    if (!title) {
      title = parsed.hostname.replace(/^www\./, "");
    }

    // Require minimum content to be useful
    if (mainContent.length < 100) {
      return new Response(
        JSON.stringify({
          error: "The page didn't contain enough readable text. It may be a JavaScript-rendered page, a paywalled article, or an image-only document.",
          title,
          content: "",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Split into paragraphs for better structure
    const paragraphs = mainContent
      .split(/\.\s+(?=[A-Z])/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20);

    return new Response(
      JSON.stringify({
        title,
        url: parsed.toString(),
        content: mainContent,
        paragraphs,
        wordCount: mainContent.split(/\s+/).length,
        extractedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
