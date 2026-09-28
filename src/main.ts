import { MarkdownView, Notice, Plugin } from 'obsidian';
import { renderNote } from './render/render-note';
import { cloneRenderedDom } from './export/clone-rendered-dom';
import { sanitizeDom } from './export/sanitize-dom';
import { inlineCanvas } from './export/inline-canvas';
import { AssetResolver, inlineImages, unresolvedLocalImages } from './export/inline-images';
import { collectStyles } from './export/collect-styles';
import { buildHtml } from './export/build-html';
import { saveHtml } from './export/save-html';
import { ExportSettingTab } from './settings/settings-tab';
import { DEFAULT_SETTINGS, ExportSettings } from './types';
import { htmlFilename } from './utils/filenames';
import { logSnapshot, readingViewRoot, renderWidth, snapshotRender } from './render/diagnostics';
import { observeRender, waitForRender } from './render/wait-for-render';

export default class RenderedHtmlExportPlugin extends Plugin {
  settings: ExportSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() as Partial<ExportSettings> };
    this.addSettingTab(new ExportSettingTab(this.app, this));
    this.addCommand({
      id: 'export-rendered-note-to-html',
      name: 'Export rendered note to HTML',
      callback: () => { void this.exportActiveNote(); }
    });
    this.addCommand({
      id: 'diagnose-reading-vs-offscreen',
      name: 'Diagnose Reading View vs off-screen render',
      callback: () => { void this.diagnoseActiveNote(); }
    });
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async diagnoseActiveNote(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const file = view?.file;
    const actual = view && readingViewRoot(view);
    if (!file || !actual) {
      new Notice('Open a Markdown note in Reading View for DOM comparison.');
      return;
    }
    const actualObservation = observeRender(actual);
    await waitForRender(actual, actualObservation, 0);
    actualObservation.disconnect();
    const actualSnapshot = snapshotRender(actual);
    logSnapshot('actual Reading View', actualSnapshot);
    let rendered: Awaited<ReturnType<typeof renderNote>> | undefined;
    try {
      const markdown = await this.app.vault.read(file);
      rendered = await renderNote(this.app, file, markdown, this.settings.renderDelayMs, view.containerEl.ownerDocument, renderWidth(view));
      const detachedSnapshot = snapshotRender(rendered.element);
      logSnapshot('off-screen', detachedSnapshot);
      const comparison = {
        actual: actualSnapshot,
        offscreen: detachedSnapshot,
        sameCounts: actualSnapshot.images === detachedSnapshot.images
          && actualSnapshot.figures === detachedSnapshot.figures
          && actualSnapshot.figcaptions === detachedSnapshot.figcaptions,
        imageComparisons: actualSnapshot.imageDetails.map((image, index) => {
          const other = detachedSnapshot.imageDetails[index];
          return other ? {
            index,
            captionEqual: image.caption === other.caption,
            widthAttributeEqual: image.imageWidthAttribute === other.imageWidthAttribute,
            embedWidthEqual: image.embedWidthAttribute === other.embedWidthAttribute,
            figureClassEqual: image.figureClass === other.figureClass,
            imageStyleEqual: image.imageInlineStyle === other.imageInlineStyle,
            figureStyleEqual: image.figureInlineStyle === other.figureInlineStyle,
            layoutWidthDifferencePx: Math.abs(image.imageLayoutWidthPx - other.imageLayoutWidthPx)
          } : { index, missingOffscreenImage: true };
        })
      };
      console.debug('[Rendered Print Exporter] DOM comparison', comparison);
      const diagnosticsFolder = 'Rendered HTML Export Diagnostics';
      if (!(await this.app.vault.adapter.exists(diagnosticsFolder))) {
        await this.app.vault.createFolder(diagnosticsFolder);
      }
      const reportPath = `${diagnosticsFolder}/${file.basename}.json`;
      await this.app.vault.adapter.write(reportPath, JSON.stringify(comparison, null, 2));
      new Notice(`DOM diagnostics saved: ${reportPath}`);
    } catch (error) {
      console.error('[Rendered Print Exporter] diagnostic render failed', error);
      new Notice('Failed to render diagnostic comparison.');
    } finally {
      rendered?.dispose();
    }
  }

  private async exportActiveNote(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const file = view?.file;
    if (!file) { new Notice('No active Markdown note.'); return; }
    const filename = htmlFilename(file.basename);
    let rendered: Awaited<ReturnType<typeof renderNote>> | undefined;
    try {
      console.debug('[Rendered Print Exporter] rendering', file.path);
      const markdown = await this.app.vault.read(file);
      try {
        rendered = await renderNote(this.app, file, markdown, this.settings.renderDelayMs, view.containerEl.ownerDocument, renderWidth(view));
      } catch (error) {
        console.error('[Rendered Print Exporter] render failed', error);
        new Notice('Failed to render note.');
        return;
      }
      console.debug('[Rendered Print Exporter] postprocessors complete');
      if (!rendered.element.hasChildNodes()) { new Notice('Rendered DOM is empty.'); return; }
      const clone = cloneRenderedDom(rendered.element);
      inlineCanvas(rendered.element, clone);
      sanitizeDom(clone, this.settings.includeProperties);
      const resolver = new AssetResolver(this.app, file);
      await inlineImages(clone, resolver);
      const css = await collectStyles(this.app, resolver, rendered.element.ownerDocument);
      if (clone.querySelector('.image-captions-figure') && !css.includes('.image-captions-figure')) {
        console.warn('[Rendered Print Exporter] Image Captions CSS was not collected');
      }
      const html = buildHtml(file.basename, clone, css, this.settings);
      const unresolvedImages = unresolvedLocalImages(clone);
      for (const source of unresolvedImages) {
        console.warn('[Rendered Print Exporter] local image remains outside HTML', source);
      }
      try {
        const location = await saveHtml(filename, html);
        console.debug('[Rendered Print Exporter] saved', location);
        new Notice(`HTML exported: ${location}`, 8000);
        if (unresolvedImages.length) {
          new Notice(`Warning: ${unresolvedImages.length} local image(s) could not be embedded.`, 8000);
        }
      } catch (error) {
        console.error('[Rendered Print Exporter] save failed', error);
        new Notice('Failed to save HTML.');
      }
    } catch (error) {
      console.error('[Rendered Print Exporter] build failed', error);
      new Notice('Failed to build HTML.');
    } finally {
      rendered?.dispose();
    }
  }
}
