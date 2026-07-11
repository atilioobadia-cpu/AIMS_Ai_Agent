const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = path.join(
  process.env.USERPROFILE,
  '.cache', 'puppeteer', 'chrome', 'win64-150.0.7871.115', 'chrome-win64', 'chrome.exe'
);

const CSS = `
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    line-height: 1.6;
    color: #1a1a1a;
    max-width: 100%;
    padding: 0;
    margin: 0;
  }
  h1 {
    color: #1a1a2e;
    border-bottom: 3px solid #c96442;
    padding-bottom: 10px;
    margin-top: 30px;
    font-size: 22px;
  }
  h2 {
    color: #16213e;
    border-bottom: 1px solid #ddd;
    padding-bottom: 6px;
    margin-top: 24px;
    font-size: 17px;
  }
  h3 {
    color: #0f3460;
    margin-top: 18px;
    font-size: 14px;
  }
  h4 {
    color: #333;
    margin-top: 14px;
    font-size: 12px;
  }
  code {
    background: #f0f0f0;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 9.5px;
    font-family: 'Consolas', 'Courier New', monospace;
  }
  pre {
    background: #1a1a2e;
    color: #e0e0e0;
    padding: 14px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 8.5px;
    line-height: 1.4;
    page-break-inside: avoid;
  }
  pre code {
    background: transparent;
    padding: 0;
    color: inherit;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    font-size: 10px;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 7px 10px;
    text-align: left;
  }
  th {
    background: #f4f4f4;
    font-weight: 600;
  }
  tr:nth-child(even) {
    background: #fafafa;
  }
  blockquote {
    border-left: 4px solid #c96442;
    margin: 12px 0;
    padding: 8px 16px;
    background: #fdf6f2;
    color: #555;
  }
  hr {
    border: none;
    border-top: 2px solid #eee;
    margin: 20px 0;
  }
  ul, ol {
    padding-left: 24px;
  }
  li {
    margin: 4px 0;
  }
  a {
    color: #0f3460;
    text-decoration: none;
  }
  strong {
    color: #1a1a2e;
  }
  @page {
    margin: 18mm 15mm;
    size: A4;
  }
  @media print {
    body { padding: 0; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  }
`;

async function convertMdToPdf(mdPath, pdfPath) {
  const mdContent = fs.readFileSync(mdPath, 'utf-8');
  
  // Simple markdown to HTML conversion
  let html = mdContent
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Tables (simple)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[\s-:]+$/.test(c))) {
        return ''; // separator row
      }
      const isHeader = false;
      const tag = isHeader ? 'th' : 'td';
      const row = cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('');
      return `<tr>${row}</tr>`;
    })
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap lists
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  
  // Remove consecutive <br> after block elements
  html = html.replace(/(<\/(h[1-6]|pre|ul|ol|blockquote|table)>)<br>/g, '$1');
  html = html.replace(/<br>(<(h[1-6]|pre|ul|ol|blockquote|table))/g, '$1');

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${CSS}</style>
    </head>
    <body>
      <p>${html}</p>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '18mm', bottom: '18mm', left: '15mm', right: '15mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-size:8px;text-align:center;width:100%;color:#999;">AIMS AI Agent - Architecture Document | Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
  });

  await browser.close();
  console.log(`✓ Generated: ${pdfPath}`);
}

async function main() {
  const baseDir = path.join(__dirname, '..');
  const docsDir = path.join(baseDir, 'docs');
  const outDir = path.join(docsDir, 'pdf');
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const files = [
    { md: 'ARCHITECTURE.md', pdf: 'AIMS-AI-Agent-Architecture.pdf' },
    { md: 'AGENT-SYSTEM.md', pdf: 'AIMS-AI-Agent-System-Design.pdf' },
    { md: 'ROADMAP.md', pdf: 'AIMS-AI-Agent-Implementation-Roadmap.pdf' }
  ];

  for (const file of files) {
    const mdPath = path.join(docsDir, file.md);
    const pdfPath = path.join(outDir, file.pdf);
    try {
      await convertMdToPdf(mdPath, pdfPath);
    } catch (err) {
      console.error(`✗ Failed: ${file.md} - ${err.message}`);
    }
  }
}

main();
