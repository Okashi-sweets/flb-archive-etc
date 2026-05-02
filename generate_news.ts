export async function generateNewsIndex() {
  const newsDir = "./docs/news";
  const target = `${newsDir}/index.json`;

  try {
    const files: string[] = [];
    for await (const entry of Deno.readDir(newsDir)) {
      if (!entry.isFile) continue;
      if (entry.name.toLowerCase().endsWith('.md') || entry.name.toLowerCase().endsWith('.html')) {
        files.push(entry.name);
      }
    }

    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const slugToFile = new Map<string, string>();
    for (const fileName of files) {
      const slug = fileName.replace(/\.(?:md|html)$/i, '');
      const existing = slugToFile.get(slug);
      if (existing && existing.toLowerCase().endsWith('.html') && fileName.toLowerCase().endsWith('.md')) {
        slugToFile.set(slug, fileName);
      } else if (!existing) {
        slugToFile.set(slug, fileName);
      }
    }

    const items = [];
    for (const [slug, fileName] of slugToFile.entries()) {
      const text = await Deno.readTextFile(`${newsDir}/${fileName}`);
      if (fileName.toLowerCase().endsWith('.md')) {
        const htmlFileName = `${slug}.html`;
        const item = parseNewsMarkdown(text, fileName);
        item.url = `./news/${htmlFileName}`;
        item.generatedDate = new Date().toISOString();
        try {
          await generateNewsPage(`${newsDir}/${htmlFileName}`, item, text);
          // HTML生成成功したら、元のMDファイルを削除
          await Deno.remove(`${newsDir}/${fileName}`);
          items.push(item);
        } catch (error) {
          console.warn(`Failed to generate HTML for ${fileName}:`, error);
        }
      } else {
        const item = extractHtmlItem(text);
        item.url = `./news/${fileName}`;
        item.generatedDate = new Date().toISOString();
        items.push(item);
      }
    }

    // 2ヶ月以上経過したimportantでないニュースを削除
    const now = new Date();
    const twoMonthsAgo = new Date(now.getTime() - 2 * 30 * 24 * 60 * 60 * 1000);
    const filteredItems = items.filter(item => {
      if (item.tag && item.tag.includes('important')) return true;
      const genDate = new Date(item.generatedDate);
      return genDate >= twoMonthsAgo;
    });

    await Deno.writeTextFile(target, JSON.stringify(filteredItems, null, 2));
    console.log(`Generated news index and pages (${filteredItems.length} items).`);

    // news.html を生成
    await generateNewsListPage(filteredItems);
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

function extractHtmlItem(text: string) {
  const item: Record<string, string> = {};

  const headingMatch = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(text);
  const titleMatch = headingMatch || /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text);
  if (titleMatch && titleMatch[1]) {
    item.title = cleanHtmlText(titleMatch[1]);
  }

  const paragraphMatch = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(text);
  if (paragraphMatch && paragraphMatch[1]) {
    item.summary = cleanHtmlText(paragraphMatch[1]);
  }

  const dateMatch = /<meta\s+name=["']date["']\s+content=["']([^"']+)["'][^>]*>/i.exec(text);
  if (dateMatch && dateMatch[1]) {
    item.date = dateMatch[1].trim();
  }

  const tagMatch = /<meta\s+name=["']tag["']\s+content=["']([^"']+)["'][^>]*>/i.exec(text);
  if (tagMatch && tagMatch[1]) {
    item.tag = tagMatch[1].trim();
  }

  return item;
}

function cleanHtmlText(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function generateNewsPage(filePath: string, item: Record<string, string>, markdown: string) {
  const title = item.title || 'News';
  const now = new Date().toISOString();
  const html = renderMarkdownPage(title, markdown, item.url || '#', now);
  return Deno.writeTextFile(filePath, html);
}

function renderMarkdownPage(title: string, markdown: string, url: string, generatedDate: string) {
  const body = markdownToHtml(markdown);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="generated-date" content="${generatedDate}">
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

function generateNewsListPage(items: any[]) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>All News - FLB Database</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div class="wrap page-wrap">
    <header class="page-header">
      <a class="page-home" href="./index.html">Home</a>
      <h1 class="page-title">All News</h1>
    </header>
    <article class="page-body">
      <ul>
        ${items.map(item => `<li><a href="${item.url}">${escapeHtml(item.title)}</a> - ${item.generatedDate.split('T')[0]}</li>`).join('\n')}
      </ul>
    </article>
  </div>
</body>
</html>`;
  return Deno.writeTextFile('./docs/news.html', html);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// スクリプトとして実行された場合にgenerateNewsIndexを呼ぶ
if (import.meta.main) {
  await generateNewsIndex();
}
