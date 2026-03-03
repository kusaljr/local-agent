interface FirecrawlSearchResult {
  title: string;
  url: string;
  description: string;
}

interface FirecrawlResponse {
  success: boolean;
  data: {
    news: FirecrawlSearchResult[];
  };
}

export async function internetSearchSkill(args: {
  query: string;
  limit?: number;
}) {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY not set");
  }

  const query = `${args.query} wikipedia`;

  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      sources: ["news"],
      limit: args.limit ?? 5,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Firecrawl error:", text);
    throw new Error("Internet search failed");
  }

  const data = (await res.json()) as FirecrawlResponse;

  if (!data.success) {
    throw new Error("Search API returned unsuccessful response");
  }

  // Return only what the LLM needs
  return {
    results: data.data.news.map((item: any) => ({
      title: item.title,
      url: item.url,
      description: (item.snippet ?? "").replace(/\.\.\.$/, ""),
    })),
  };
}
