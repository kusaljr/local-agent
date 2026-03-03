export async function wikipediaSkill(args: { title: string }) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    args.title
  )}`;

  const res = await fetch(url);

  if (!res.ok) {
    return { found: false };
  }

  const data = await res.json();

  return {
    found: true,
    title: data.title,
    description: data.description,
    extract: data.extract,
    url: data.content_urls?.desktop?.page,
  };
}
