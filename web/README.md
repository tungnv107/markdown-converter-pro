# Markdown Converter Pro

A browser-first Markdown editor and converter built alongside the Microsoft MarkItDown source tree.

## Features

- CodeMirror 6 Markdown editor with formatting toolbar
- Real-time GitHub Flavored Markdown preview
- Markdown → HTML, text, JSON and XML
- HTML, text, JSON, XML and CSV → Markdown
- Import Markdown, text, HTML, PDF, DOCX, JSON, XML and CSV by file picker or drag and drop
- Browser-side PDF text extraction with PDF.js and DOCX structure extraction with Mammoth
- Export Markdown, HTML, TXT, PDF and DOCX
- Autosave with localStorage
- Light, dark and system theme
- Responsive split desktop layout and mobile editor/preview tabs
- Sanitized rendered HTML

## Technology Stack

React 19, TypeScript, Vite, CodeMirror 6, unified/remark/rehype, Turndown, Mammoth, html2pdf.js and docx.

## Installation

```bash
cd web
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Docker production deployment

Build the production image from the `web` directory:

```bash
docker build -t markdown-converter-pro .
```

Run it on port `8080`:

```bash
docker run -d \
  --name markdown-converter-pro \
  --restart unless-stopped \
  -p 8080:80 \
  markdown-converter-pro
```

Open `http://SERVER_IP:8080`. The Nginx configuration includes SPA fallback so direct routes such as `/pdf-to-markdown`, `/docx-to-markdown`, and `/markdown-editor` work after refresh.

For a server pulling this repository directly:

```bash
git pull
cd web
docker build --pull -t markdown-converter-pro .
docker rm -f markdown-converter-pro 2>/dev/null || true
docker run -d --name markdown-converter-pro --restart unless-stopped -p 8080:80 markdown-converter-pro
```

## Project Structure

- `src/components`: application UI
- `src/services`: conversion, import and export logic
- `src/hooks`: persistent client-side state
- `src/types`: shared TypeScript types
- `src/constants`: sample content and defaults

## Security

Markdown preview is processed through `rehype-sanitize`. Documents remain in the browser for the core conversion and export flows.
PDF.js is loaded lazily from jsDelivr when PDF import is first used; the selected PDF content is processed in the browser and is not uploaded by the application.

## License

See the repository root license. Microsoft MarkItDown remains governed by its upstream license.
