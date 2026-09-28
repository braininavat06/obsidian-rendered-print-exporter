import { App, Component, MarkdownRenderer, TFile } from 'obsidian';
import { observeRender, waitForRender } from './wait-for-render';

export interface RenderedNote {
  element: HTMLElement;
  host: HTMLElement;
  dispose(): void;
}

export async function renderNote(
  app: App, file: TFile, markdown: string, delayMs: number,
  ownerDocument: Document = document, widthPx = 703
): Promise<RenderedNote> {
  const component = new Component();
  component.load();
  const host = ownerDocument.createElement('div');
  host.className = 'workspace-leaf-content rendered-print-exporter-render-host';
  host.setAttribute('data-type', 'markdown');
  // Keep layout active. Opacity avoids the visibility:hidden difference for
  // plugins that inspect computed visibility; the host stays outside the viewport.
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${widthPx}px;opacity:0;pointer-events:none;z-index:-1`;
  const reading = ownerDocument.createElement('div');
  reading.className = 'markdown-reading-view';
  const preview = ownerDocument.createElement('div');
  preview.className = 'markdown-preview-view markdown-rendered';
  reading.append(preview);
  host.append(reading);
  ownerDocument.body.append(host);
  const observation = observeRender(preview);
  try {
    await MarkdownRenderer.render(app, markdown, preview, file.path, component);
    await waitForRender(preview, observation, delayMs);
    return { element: preview, host, dispose: () => { observation.disconnect(); component.unload(); host.remove(); } };
  } catch (error) {
    observation.disconnect();
    component.unload();
    host.remove();
    throw error;
  }
}
