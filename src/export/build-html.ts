import { ExportSettings } from '../types';
import { printCss } from './print-css';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildHtml(title: string, content: HTMLElement, css: string, settings: ExportSettings): string {
  const current = document.body.classList.contains('theme-dark') ? 'theme-dark' : 'theme-light';
  const theme = settings.theme === 'current' ? current : 'theme-light';
  const normalization = `
    html, body {
      margin: 0;
      min-height: 100%;
      height: auto !important;
      max-height: none !important;
      overflow: auto !important;
      contain: none !important;
    }
    body { font-family: var(--font-text, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif); }
    body.theme-light { color-scheme: light; background: #fff; color: var(--text-normal, #222); }
    main.rendered-print-exporter-document {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: min(${settings.marginMm}mm, 24px);
    }
    /* Obsidian's pane CSS constrains Reading View to one viewport. In a
       standalone document each wrapper must grow with the entire note. */
    .rendered-print-exporter-document,
    .rendered-print-exporter-document .workspace-leaf-content,
    .rendered-print-exporter-document .markdown-reading-view,
    .rendered-print-exporter-document .markdown-preview-view,
    .rendered-print-exporter-document .markdown-preview-sizer,
    .rendered-print-exporter-document .markdown-preview-section {
      height: auto !important;
      max-height: none !important;
      min-height: 0 !important;
      overflow: visible !important;
      contain: none !important;
    }
    .rendered-print-exporter-document .markdown-preview-view {
      scrollbar-gutter: auto;
      padding: 0 !important;
    }
    .rendered-print-exporter-document .markdown-preview-sizer {
      max-width: none !important;
      margin-inline: 0 !important;
    }
    img, svg { max-width: 100%; }
    @media print { main.rendered-print-exporter-document { padding: 0 !important; } }
  `;
  return `<!doctype html>\n<html lang="ko" class="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>${css.replace(/<\/style/gi, '<\\/style')}</style><style>${normalization}</style><style>${printCss(settings)}</style></head><body class="${theme} rendered-print-exporter"><main class="rendered-print-exporter-document"><div class="workspace-leaf-content" data-type="markdown"><div class="markdown-reading-view">${content.outerHTML}</div></div></main></body></html>`;
}
