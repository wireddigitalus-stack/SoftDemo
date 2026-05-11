import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ── Google News RSS search queries (commercial relocation signals) ─────────
const SEARCH_QUERIES = [
  `"relocating headquarters" OR "opening new office" Virginia Tennessee`,
  `"office relocation" OR "expanding operations" "Tri-Cities" OR Bristol OR "Southwest Virginia"`,
  `"commercial lease" OR "office space" Bristol Virginia downtown`,
  `"company moving" OR "new headquarters" Appalachia OR "Southern Virginia"`,
  `"workforce quality of life" office relocation small town`,
];

// ── Regional business RSS feeds ───────────────────────────────────────────
const RSS_FEEDS = [
  {
    name: "Business Wire — Real Estate",
    url: "https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeGVtRWA==",
  },
  {
    name: "PR Newswire — Real Estate",
    url: "https://www.prnewswire.com/rss/real-estate-news.rss",
  },
];

// ── Parse XML to extract RSS items ────────────────────────────────────────
interface FeedItem {
  title: string;
  link: string;
  snippet: string;
  source: string;
  pubDate: string;
}

function extractItems(xml: string, source: string): FeedItem[] {
  const items: FeedItem[] = [];
  // Match <item>...</item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")?.trim() || "";
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")?.trim() || "";
    const desc = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")?.replace(/<[^>]+>/g, "")?.trim() || "";
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || "";
    if (title) {
      items.push({
        title: decodeHTMLEntities(title),
        link: decodeHTMLEntities(link),
        snippet: decodeHTMLEntities(desc).slice(0, 300),
        source,
        pubDate,
      });
    }
  }
  return items;
}

function decodeHTMLEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// ── Fetch one feed with timeout ───────────────────────────────────────────
async function fetchFeed(url: string, source: string): Promise<FeedItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "VisionLLC-MarketIntel/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();
    return extractItems(xml, source);
  } catch {
    return [];
  }
}

// ── AI scoring ────────────────────────────────────────────────────────────
async function scoreWithAI(items: FeedItem[]): Promise<{ title: string; link: string; source: string; pubDate: string; score: string; reason: string }[]> {
  if (!GEMINI_API_KEY || items.length === 0) {
    console.warn("[MarketIntel] No GEMINI_API_KEY or empty items — skipping AI scoring");
    return items.map(i => ({
      title: i.title,
      link: i.link,
      source: i.source,
      pubDate: i.pubDate,
      score: "unknown",
      reason: GEMINI_API_KEY ? "No items to score" : "AI key not configured — add GEMINI_API_KEY to .env",
    }));
  }

  const prompt = `You are a commercial real estate lead-intelligence analyst for Vision LLC, a CRE firm in Downtown Bristol, Virginia.

Analyze these news items and score each one for its relevance as a POTENTIAL TENANT LEAD for Vision LLC's commercial office space in Bristol, VA / Tri-Cities region.

Score each item:
- "hot" = Company actively seeking office space, relocating, or expanding in/near our region
- "warm" = Company expanding, relocating, or discussing office moves that COULD target our area  
- "cold" = Not relevant to our commercial leasing business
- "skip" = Completely irrelevant (sports, politics, residential, etc.)

Return ONLY a valid JSON array. Each object: {"index": number, "score": "hot"|"warm"|"cold"|"skip", "reason": "one sentence why"}

Items to analyze:
${items.map((item, i) => `[${i}] "${item.title}" — ${item.snippet.slice(0, 150)}`).join("\n")}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[MarketIntel] Gemini API HTTP error:", res.status, errText.slice(0, 500));
      throw new Error(`Gemini ${res.status}`);
    }

    const data = await res.json();

    // Gemini 2.5 may return multiple parts (thinking + response)
    const parts = data?.candidates?.[0]?.content?.parts || [];
    // Grab the LAST text part (skip thinking parts)
    const textParts = parts.filter((p: { text?: string }) => p.text).map((p: { text: string }) => p.text);
    const raw = textParts[textParts.length - 1] || "[]";

    console.log("[MarketIntel] Raw AI response (first 300 chars):", raw.slice(0, 300));

    // Extract JSON array from the response — handle code fences, preamble text, etc.
    let jsonStr = raw;
    // Remove markdown code fences
    jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
    // Find the JSON array in the text (look for first [ to last ])
    const startBracket = jsonStr.indexOf("[");
    const endBracket = jsonStr.lastIndexOf("]");
    if (startBracket !== -1 && endBracket !== -1 && endBracket > startBracket) {
      jsonStr = jsonStr.slice(startBracket, endBracket + 1);
    }
    // Fix trailing commas before ] which is invalid JSON
    jsonStr = jsonStr.replace(/,\s*]/g, "]");

    const scores: { index: number; score: string; reason: string }[] = JSON.parse(jsonStr);

    return items.map((item, i) => {
      const s = scores.find(sc => sc.index === i);
      return {
        title: item.title,
        link: item.link,
        source: item.source,
        pubDate: item.pubDate,
        score: s?.score || "unknown",
        reason: s?.reason || "",
      };
    });
  } catch (err) {
    console.error("[MarketIntel] AI scoring failed:", err);
    return items.map(i => ({
      title: i.title,
      link: i.link,
      source: i.source,
      pubDate: i.pubDate,
      score: "unknown",
      reason: "AI scoring temporarily unavailable",
    }));
  }
}

// ── GET Handler ───────────────────────────────────────────────────────────
export async function GET() {
  try {
    // 1. Fetch Google News RSS for each query
    const googlePromises = SEARCH_QUERIES.map(q => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
      return fetchFeed(url, "Google News");
    });

    // 2. Fetch regional feeds
    const rssPromises = RSS_FEEDS.map(f => fetchFeed(f.url, f.name));

    const allResults = await Promise.all([...googlePromises, ...rssPromises]);
    const allItems = allResults.flat();

    // Deduplicate by title similarity
    const seen = new Set<string>();
    const unique = allItems.filter(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Limit to 25 most recent
    const capped = unique.slice(0, 25);

    // 3. Score with AI
    const scored = await scoreWithAI(capped);

    // Filter out "skip" items and sort by score
    const scoreOrder: Record<string, number> = { hot: 0, warm: 1, cold: 2, unknown: 3 };
    const filtered = scored
      .filter(s => s.score !== "skip")
      .sort((a, b) => (scoreOrder[a.score] ?? 9) - (scoreOrder[b.score] ?? 9));

    return NextResponse.json({
      items: filtered,
      fetchedAt: new Date().toISOString(),
      totalScanned: allItems.length,
      totalRelevant: filtered.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch market intel" },
      { status: 500 }
    );
  }
}
