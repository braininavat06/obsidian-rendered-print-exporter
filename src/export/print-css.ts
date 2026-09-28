import { ExportSettings } from '../types';

export function printCss(settings: ExportSettings): string {
  return `@media print {
    @page { size: ${settings.pageSize}; margin: ${settings.marginMm}mm; }
    html, body { background: white !important; }
    html, body { margin: 0 !important; padding: 0 !important; }
    /* Preserve theme, snippet, highlight, and callout colors in Chromium PDF. */
    html,
    body,
    body.rendered-print-exporter .rendered-print-exporter-document,
    body.rendered-print-exporter .rendered-print-exporter-document * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* Obsidian's app print CSS only keeps a direct body child with .print. */
    body.rendered-print-exporter > main.rendered-print-exporter-document { display: block !important; }
    body.rendered-print-exporter .rendered-print-exporter-document,
    body.rendered-print-exporter .rendered-print-exporter-document .markdown-preview-view {
      margin: 0 !important;
      padding: 0 !important;
    }
    img, svg { max-width: 100%; }
    figure { break-inside: avoid; }
    h1, h2, h3, h4, h5, h6 { break-after: avoid; }
    p { orphans: 2; widows: 2; }
  }`;
}
