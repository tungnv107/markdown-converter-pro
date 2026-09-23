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

### Recommended: Docker Compose on port 8089

From the `web` directory:

```bash
docker compose up -d --build
```

The application is available at:

```text
http://SERVER_IP:8089
```

To update after pulling new source code:

```bash
git pull
docker compose up -d --build
```

Useful commands:

```bash
docker compose ps
docker compose logs -f
docker compose restart
docker compose down
```

If Docker returns `permission denied` for `/var/run/docker.sock` on Amazon Linux, run once:

```bash
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

If the new group is not picked up by your current SSH shell, disconnect and reconnect, then run `docker ps` again. Until then, Compose can be started with `sudo docker compose up -d --build`.

Ensure the EC2 Security Group/firewall allows inbound TCP port `8089` from the networks that should access the application.

### Docker CLI

Build the production image from the `web` directory:

```bash
docker build -t markdown-converter-pro .
```

Run it on port `8089`:

```bash
docker run -d \
  --name markdown-converter-pro \
  --restart unless-stopped \
  -p 8089:80 \
  markdown-converter-pro
```

Open `http://SERVER_IP:8089`. The Nginx configuration includes SPA fallback so direct routes such as `/pdf-to-markdown`, `/docx-to-markdown`, and `/markdown-editor` work after refresh.

For a server pulling this repository directly:

```bash
git pull
cd web
docker build --pull -t markdown-converter-pro .
docker rm -f markdown-converter-pro 2>/dev/null || true
docker run -d --name markdown-converter-pro --restart unless-stopped -p 8089:80 markdown-converter-pro
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
