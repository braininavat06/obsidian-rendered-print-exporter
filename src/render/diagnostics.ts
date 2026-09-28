import { MarkdownView } from 'obsidian';

interface ImageSnapshot {
  imageOuterHTML: string;
  embedOuterHTML: string | null;
  figureOuterHTML: string | null;
  parentHierarchy: string[];
  caption: string | null;
  imageWidthAttribute: string | null;
  embedWidthAttribute: string | null;
  imageLayoutWidthPx: number;
  figureLayoutWidthPx: number | null;
  imageClass: string;
  figureClass: string | null;
  imageInlineStyle: string;
  figureInlineStyle: string | null;
}

export interface RenderSnapshot {
  connected: boolean;
  bodyContains: boolean;
  images: number;
  figures: number;
  figcaptions: number;
  imageCaptionsElements: number;
  hostHierarchy: string[];
  htmlExcerpt: string;
  imageDetails: ImageSnapshot[];
}

function hierarchy(element: Element | null): string[] {
  const result: string[] = [];
  for (let current = element; current && result.length < 8; current = current.parentElement) {
    result.push(`${current.tagName.toLowerCase()}${current.className && typeof current.className === 'string' ? '.' + current.className.trim().replace(/\s+/g, '.') : ''}`);
  }
  return result;
}

export function snapshotRender(root: HTMLElement): RenderSnapshot {
  const doc = root.ownerDocument;
  const images = [...root.querySelectorAll('img')];
  return {
    connected: root.isConnected,
    bodyContains: doc.body.contains(root),
    images: images.length,
    figures: root.querySelectorAll('figure').length,
    figcaptions: root.querySelectorAll('figcaption').length,
    imageCaptionsElements: root.querySelectorAll('[class*="image-captions-"]').length,
    hostHierarchy: hierarchy(root),
    htmlExcerpt: root.outerHTML.slice(0, 3000),
    imageDetails: images.map(img => {
      const embed = img.closest('.image-embed');
      const figure = img.closest('figure');
      return {
        imageOuterHTML: img.outerHTML,
        embedOuterHTML: embed?.outerHTML ?? null,
        figureOuterHTML: figure?.outerHTML ?? null,
        parentHierarchy: hierarchy(img),
        caption: figure?.querySelector('figcaption')?.textContent ?? null,
        imageWidthAttribute: img.getAttribute('width'),
        embedWidthAttribute: embed?.getAttribute('width') ?? null,
        imageLayoutWidthPx: img.getBoundingClientRect().width,
        figureLayoutWidthPx: figure?.getBoundingClientRect().width ?? null,
        imageClass: img.className,
        figureClass: figure?.getAttribute('class') ?? null,
        imageInlineStyle: img.getAttribute('style') ?? '',
        figureInlineStyle: figure?.getAttribute('style') ?? null
      };
    })
  };
}

export function readingViewRoot(view: MarkdownView): HTMLElement | null {
  if (view.getMode() !== 'preview') return null;
  const container = view.previewMode.containerEl;
  return container.matches('.markdown-preview-view')
    ? container
    : container.querySelector<HTMLElement>('.markdown-preview-view.markdown-rendered');
}

export function renderWidth(view: MarkdownView): number {
  const root = readingViewRoot(view);
  const width = root?.querySelector('.markdown-preview-sizer')?.getBoundingClientRect().width
    || root?.getBoundingClientRect().width
    || view.containerEl.getBoundingClientRect().width;
  return width >= 300 ? Math.round(width) : 703;
}

export function logSnapshot(label: string, snapshot: RenderSnapshot): void {
  console.debug(`[Rendered Print Exporter] ${label}`, snapshot);
  for (const [index, detail] of snapshot.imageDetails.entries()) {
    console.debug(`[Rendered Print Exporter] ${label} image ${index + 1} outerHTML`, detail.imageOuterHTML);
    console.debug(`[Rendered Print Exporter] ${label} image ${index + 1} figure outerHTML`, detail.figureOuterHTML);
  }
}
