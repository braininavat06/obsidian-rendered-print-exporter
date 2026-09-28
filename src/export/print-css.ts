import { ExportSettings } from '../types';

export function printCss(settings: ExportSettings): string {
  return `@media print {
    @page { size: ${settings.pageSize}; margin: ${settings.marginMm}mm; }
    html, body { background: white !important; }
    body { margin: 0; }
    /* Obsidian's app print CSS hides every body child without .print. */
    body.rendered-print-exporter > main.rendered-print-exporter-document { display: block !important; }
    img, svg { max-width: 100%; }
    figure { break-inside: avoid; }
    h1, h2, h3, h4, h5, h6 { break-after: avoid; }
    p { orphans: 2; widows: 2; }
  }`;
}
