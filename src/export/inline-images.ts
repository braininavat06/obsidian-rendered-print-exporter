import { App, TFile } from 'obsidian';
import { binaryToDataUri } from '../utils/data-uri';
import { mimeFromName } from '../utils/mime';

function decoded(value: string): string {
  try { return decodeURI(value); } catch { return value; }
}

function canonical(url: string): string {
  try { const parsed = new URL(url, document.baseURI); return `${parsed.origin}${decoded(parsed.pathname)}`; }
  catch { return decoded(url.split(/[?#]/)[0]); }
}

function resourcePath(url: string): string {
  try { return decoded(new URL(url, document.baseURI).pathname); }
  catch { return decoded(url.split(/[?#]/)[0]); }
}

export function isLocalImageReference(url: string): boolean {
  if (!url || url.startsWith('data:')) return false;
  try {
    const parsed = new URL(url, document.baseURI);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    }
    return true;
  } catch {
    return true;
  }
}

export class AssetResolver {
  private readonly resourceFiles = new Map<string, TFile>();
  private readonly vaultImageFiles: TFile[] = [];
  private readonly fileData = new Map<string, Promise<string>>();

  constructor(private readonly app: App, private readonly source: TFile) {
    for (const file of app.vault.getFiles()) {
      if (file.extension.toLowerCase() in { jpg: 1, jpeg: 1, png: 1, webp: 1, gif: 1, svg: 1, avif: 1, bmp: 1 }) {
        this.vaultImageFiles.push(file);
        this.resourceFiles.set(canonical(app.vault.getResourcePath(file)), file);
      }
    }
  }

  async resolve(url: string): Promise<string | null> {
    if (!url || url.startsWith('data:')) return url;
    const normalized = canonical(url);
    let file = this.resourceFiles.get(normalized);
    if (!file && isLocalImageReference(url)) {
      const path = resourcePath(url);
      // Android's _capacitor_file_ URL contains the vault-relative path after
      // the device's storage prefix. Match the rendered URL, never Markdown syntax.
      file = this.vaultImageFiles.find(candidate => path.endsWith(`/${candidate.path}`));
    }
    if (!file) {
      const maybePath = resourcePath(url).replace(/^\/+/, '');
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

export async function inlineImages(root: HTMLElement, resolver: AssetResolver): Promise<number> {
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
  return success;
}

export function unresolvedLocalImages(root: HTMLElement): string[] {
  return [...root.querySelectorAll('img')]
    .map(image => image.getAttribute('src') || image.getAttribute('data-src') || '')
    .filter(isLocalImageReference);
}
