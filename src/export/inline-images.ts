import { App, TFile } from 'obsidian';
import { binaryToDataUri } from '../utils/data-uri';
import { mimeFromName } from '../utils/mime';

function canonical(url: string): string {
  try { const parsed = new URL(url, document.baseURI); return `${parsed.origin}${decodeURI(parsed.pathname)}`; }
  catch { return decodeURI(url.split(/[?#]/)[0]); }
}

export class AssetResolver {
  private readonly resourceFiles = new Map<string, TFile>();
  private readonly fileData = new Map<string, Promise<string>>();

  constructor(private readonly app: App, private readonly source: TFile) {
    for (const file of app.vault.getFiles()) {
      if (file.extension.toLowerCase() in { jpg: 1, jpeg: 1, png: 1, webp: 1, gif: 1, svg: 1, avif: 1, bmp: 1 }) {
        this.resourceFiles.set(canonical(app.vault.getResourcePath(file)), file);
      }
    }
  }

  async resolve(url: string): Promise<string | null> {
    if (!url || url.startsWith('data:')) return url;
    const normalized = canonical(url);
    let file = this.resourceFiles.get(normalized);
    if (!file) {
      const maybePath = decodeURI(url.replace(/[?#].*$/, '')).replace(/^\/+/, '');
      file = this.app.metadataCache.getFirstLinkpathDest(maybePath, this.source.path) ?? undefined;
    }
    if (file) {
      let task = this.fileData.get(file.path);
      if (!task) {
        task = this.app.vault.readBinary(file).then(binary => binaryToDataUri(binary, mimeFromName(file.name)));
        this.fileData.set(file.path, task);
      }
      return task;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await binaryToDataUri(await response.arrayBuffer(), response.headers.get('content-type') || mimeFromName(url));
    } catch (error) {
      console.warn('[Rendered Print Exporter] asset could not be inlined', url, error);
      return null;
    }
  }
}

export async function inlineImages(root: HTMLElement, resolver: AssetResolver): Promise<void> {
  const images = [...root.querySelectorAll('img')];
  let success = 0;
  for (const image of images) {
    const source = image.currentSrc || image.getAttribute('src') || image.getAttribute('data-src') || '';
    if (!source) continue;
    try {
      const data = await resolver.resolve(source);
      if (data?.startsWith('data:')) {
        image.src = data;
        image.removeAttribute('srcset');
        image.removeAttribute('data-src');
        image.closest('picture')?.querySelectorAll('source').forEach(sourceEl => sourceEl.remove());
        success++;
      }
    } catch (error) {
      console.warn('[Rendered Print Exporter] image could not be inlined', source, error);
    }
  }
  console.debug(`[Rendered Print Exporter] inlined ${success}/${images.length} images`);
}
