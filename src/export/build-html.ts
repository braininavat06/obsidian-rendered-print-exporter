import { ExportSettings } from '../types';
import { printCss } from './print-css';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildHtml(title: string, content: HTMLElement, css: string, settings: ExportSettings): string {
  const current = document.body.classList.contains('theme-dark') ? 'theme-dark' : 'theme-light';
  const theme = settings.theme === 'current' ? current : 'theme-light';
  const normalization = `
    html, body { margin: 0; min-height: 100%; }
    body { font-family: var(--font-text, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif); }
    body.theme-light { color-scheme: light; background: #fff; color: #222; }
    main.rendered-print-exporter-document { max-width: 900px; margin: 0 auto; padding: 24px; }
    .markdown-preview-view { overflow: visible; }
    img, svg { max-width: 100%; }
    @media print { main.rendered-print-exporter-document { max-width: none; margin: 0; padding: 0; } }
  `;
  return `<!doctype html>\n<html lang="ko" class="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>${css.replace(/<\/style/gi, '<\\/style')}</style><style>${normalization}</style><style>${printCss(settings)}</style></head><body class="${theme} rendered-print-exporter"><main class="rendered-print-exporter-document"><div class="workspace-leaf-content markdown-reading-view">${content.outerHTML}</div></main></body></html>`;
}
