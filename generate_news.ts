export async function generateNewsIndex() {
  const newsDir = "./site/news";
  const target = `${newsDir}/index.json`;

  try {
    const entries: string[] = [];
    for await (const entry of Deno.readDir(newsDir)) {
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      entries.push(entry.name);
    }

    entries.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    const items = [];

    for (const fileName of entries) {
      const text = await Deno.readTextFile(`${newsDir}/${fileName}`);
      const slug = fileName.replace(/\.md$/i, '');
      const htmlFileName = `${slug}.html`;
      const item = parseNewsMarkdown(text, fileName);
      item.url = `./news/${htmlFileName}`;
      await generateNewsPage(`${newsDir}/${htmlFileName}`, item, text);
      items.push(item);
    }

    await Deno.writeTextFile(target, JSON.stringify(items, null, 2));
    console.log(`Generated news index and pages (${items.length} items).`);
  } catch (error) {
    console.warn("Failed to generate news index:", error);
  }
}

function parseNewsMarkdown(text: string, fileName: string) {
  const item: Record<string, string> = {};
  let body = text.replace(/\r\n/g, "\n");

  if (body.startsWith("---")) {
    const end = body.indexOf("\n---", 3);
    if (end !== -1) {
      const frontmatter = body.slice(3, end).trim();
      body = body.slice(end + 4).trimStart();
      frontmatter.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
        if (!match) return;
        const key = match[1].toLowerCase();
        const value = match[2].trim();
        if (key === "title" || key === "date" || key === "tag" || key === "summary") {
          item[key] = value;
        }
      });
    }
  }

  if (!item.title) {
    const titleMatch = body.match(/^\s*#\s+(.+)$/m);
    if (titleMatch) item.title = titleMatch[1].trim();
  }

  if (!item.summary) {
    const content = body.replace(/^\s*#.*(?:\n|\r\n)+/, "").trim();
    const paragraph = content.split(/\n\s*\n/)[0].trim();
    if (paragraph) {
      item.summary = paragraph
        .replace(/\[(.*?)\]\((?:.*?)\)/g, "$1")
        .replace(/[*_`]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return item;
}

function generateNewsPage(filePath: string, item: Record<string, string>, markdown: string) {
  const title = item.title || 'News';
  const html = renderMarkdownPage(title, markdown, item.url || '#');
  return Deno.writeTextFile(filePath, html);
}

function renderMarkdownPage(title: string, markdown: string, url: string) {
  const body = markdownToHtml(markdown);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <div class="wrap page-wrap">
    <header class="page-header">
      <a class="page-home" href="../index.html">Home</a>
      <h1 class="page-title">${escapeHtml(title)}</h1>
    </header>
    <article class="page-body">
      ${body}
    </article>
  </div>
</body>
</html>`;
}

function markdownToHtml(text: string) {
  let body = text.replace(/\r\n/g, "\n");
  if (body.startsWith("---")) {
    const end = body.indexOf("\n---", 3);
    if (end !== -1) {
      body = body.slice(end + 4).trimStart();
    }
  }

  const blocks = body.split(/\n{2,}/);
  return blocks.map((block) => {
    const headingMatch = block.match(/^(#{1,6})\s+(.+)$/m);
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1].length);
      return `<h${level}>${inlineMarkdownHtml(headingMatch[2].trim())}</h${level}>`;
    }
    const lines = block.split("\n").map((line) => escapeHtml(line)).join(" ");
    return `<p>${inlineMarkdownHtml(lines.trim())}</p>`;
  }).join("\n");
}

function inlineMarkdownHtml(text: string) {
  return escapeHtml(text)
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
