"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => RenderedHtmlExportPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/render/render-note.ts
var import_obsidian = require("obsidian");

// src/render/wait-for-render.ts
function observeRender(container) {
  let mutationCount = 0;
  let lastMutationAt = performance.now();
  const observer = new MutationObserver((records) => {
    mutationCount += records.length;
    lastMutationAt = performance.now();
  });
  observer.observe(container, { childList: true, subtree: true, attributes: true, characterData: true });
  return {
    get mutationCount() {
      return mutationCount;
    },
    get lastMutationAt() {
      return lastMutationAt;
    },
    disconnect: () => observer.disconnect()
  };
}
function frame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
async function waitForQuiet(observation, quietMs, timeoutMs) {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if (performance.now() - observation.lastMutationAt >= quietMs) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
}
async function waitForRender(container, observation, extraDelayMs) {
  await frame();
  await frame();
  const settled = await waitForQuiet(observation, 150, 2e3);
  if (!settled) console.warn("[Rendered Print Exporter] DOM did not settle within 2 seconds");
  if (extraDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, extraDelayMs));
  await Promise.all([...container.querySelectorAll("img")].map(async (img) => {
    if (img.complete) return;
    await Promise.race([
      img.decode().catch(() => void 0),
      new Promise((resolve) => setTimeout(resolve, 2e3))
    ]);
  }));
  await waitForQuiet(observation, 150, 2e3);
  await frame();
  console.debug("[Rendered Print Exporter] DOM settle", { settled, mutations: observation.mutationCount });
}

// src/render/render-note.ts
async function renderNote(app, file, markdown, delayMs, ownerDocument = document, widthPx = 703) {
  const component = new import_obsidian.Component();
  component.load();
  const host = ownerDocument.createElement("div");
  host.className = "workspace-leaf-content rendered-print-exporter-render-host";
  host.setAttribute("data-type", "markdown");
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${widthPx}px;opacity:0;pointer-events:none;z-index:-1`;
  const reading = ownerDocument.createElement("div");
  reading.className = "markdown-reading-view";
  const preview = ownerDocument.createElement("div");
  preview.className = "markdown-preview-view markdown-rendered";
  reading.append(preview);
  host.append(reading);
  ownerDocument.body.append(host);
  const observation = observeRender(preview);
  try {
    await import_obsidian.MarkdownRenderer.render(app, markdown, preview, file.path, component);
    await waitForRender(preview, observation, delayMs);
    return { element: preview, host, dispose: () => {
      observation.disconnect();
      component.unload();
      host.remove();
    } };
  } catch (error) {
    observation.disconnect();
    component.unload();
    host.remove();
    throw error;
  }
}

// src/export/clone-rendered-dom.ts
function cloneRenderedDom(element) {
  return element.cloneNode(true);
}

// src/export/sanitize-dom.ts
var PROPERTY_SELECTORS = [
  ".metadata-container",
  ".metadata-properties",
  ".metadata-properties-heading",
  ".metadata-content",
  ".frontmatter-container"
];
var UI_SELECTORS = [
  "script",
  "button.copy-code-button",
  ".copy-code-button",
  ".heading-collapse-indicator",
  ".collapse-indicator",
  ".edit-block-button",
  ".mod-cta",
  ".inline-title",
  ".metadata-add-button",
  ".metadata-property-icon"
];
function sanitizeDom(root, includeProperties) {
  const selectors = includeProperties ? UI_SELECTORS : [...UI_SELECTORS, ...PROPERTY_SELECTORS];
  root.querySelectorAll(selectors.join(",")).forEach((node) => node.remove());
  root.querySelectorAll("*").forEach((node) => {
    for (const attr of [...node.attributes]) {
      if (attr.name.startsWith("on")) node.removeAttribute(attr.name);
    }
  });
}

// src/export/inline-canvas.ts
function inlineCanvas(original, clone) {
  const source = [...original.querySelectorAll("canvas")];
  const copies = [...clone.querySelectorAll("canvas")];
  source.forEach((canvas, index) => {
    const copy = copies[index];
    if (!copy) return;
    try {
      const image = document.createElement("img");
      image.src = canvas.toDataURL("image/png");
      image.className = canvas.className;
      image.style.cssText = canvas.style.cssText;
      image.width = canvas.width;
      image.height = canvas.height;
      copy.replaceWith(image);
    } catch (error) {
      console.warn("[Rendered Print Exporter] canvas could not be captured", error);
    }
  });
}

// src/utils/data-uri.ts
function binaryToDataUri(data, mime) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([data], { type: mime }));
  });
}

// src/utils/mime.ts
var MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp"
};
function mimeFromName(name) {
  return MIME[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

// src/export/inline-images.ts
function decoded(value) {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}
function canonical(url) {
  try {
    const parsed = new URL(url, document.baseURI);
    return `${parsed.origin}${decoded(parsed.pathname)}`;
  } catch {
    return decoded(url.split(/[?#]/)[0]);
  }
}
function resourcePath(url) {
  try {
    return decoded(new URL(url, document.baseURI).pathname);
  } catch {
    return decoded(url.split(/[?#]/)[0]);
  }
}
function isLocalImageReference(url) {
  if (!url || url.startsWith("data:")) return false;
  try {
    const parsed = new URL(url, document.baseURI);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    }
    return true;
  } catch {
    return true;
  }
}
var AssetResolver = class {
  constructor(app, source) {
    this.app = app;
    this.source = source;
    this.resourceFiles = /* @__PURE__ */ new Map();
    this.vaultImageFiles = [];
    this.fileData = /* @__PURE__ */ new Map();
    for (const file of app.vault.getFiles()) {
      if (file.extension.toLowerCase() in { jpg: 1, jpeg: 1, png: 1, webp: 1, gif: 1, svg: 1, avif: 1, bmp: 1 }) {
        this.vaultImageFiles.push(file);
        this.resourceFiles.set(canonical(app.vault.getResourcePath(file)), file);
      }
    }
  }
  async resolve(url) {
    if (!url || url.startsWith("data:")) return url;
    const normalized = canonical(url);
    let file = this.resourceFiles.get(normalized);
    if (!file && isLocalImageReference(url)) {
      const path = resourcePath(url);
      file = this.vaultImageFiles.find((candidate) => path.endsWith(`/${candidate.path}`));
    }
    if (!file) {
      const maybePath = resourcePath(url).replace(/^\/+/, "");
      file = this.app.metadataCache.getFirstLinkpathDest(maybePath, this.source.path) ?? void 0;
    }
    if (file) {
      let task = this.fileData.get(file.path);
      if (!task) {
        task = this.app.vault.readBinary(file).then((binary) => binaryToDataUri(binary, mimeFromName(file.name)));
        this.fileData.set(file.path, task);
      }
      return task;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await binaryToDataUri(await response.arrayBuffer(), response.headers.get("content-type") || mimeFromName(url));
    } catch (error) {
      console.warn("[Rendered Print Exporter] asset could not be inlined", url, error);
      return null;
    }
  }
};
async function inlineImages(root, resolver) {
  const images = [...root.querySelectorAll("img")];
  let success = 0;
  for (const image of images) {
    const source = image.currentSrc || image.getAttribute("src") || image.getAttribute("data-src") || "";
    if (!source) continue;
    try {
      const data = await resolver.resolve(source);
      if (data?.startsWith("data:")) {
        image.src = data;
        image.removeAttribute("srcset");
        image.removeAttribute("data-src");
        image.closest("picture")?.querySelectorAll("source").forEach((sourceEl) => sourceEl.remove());
        success++;
      }
    } catch (error) {
      console.warn("[Rendered Print Exporter] image could not be inlined", source, error);
    }
  }
  console.debug(`[Rendered Print Exporter] inlined ${success}/${images.length} images`);
  return success;
}
function unresolvedLocalImages(root) {
  return [...root.querySelectorAll("img")].map((image) => image.getAttribute("src") || image.getAttribute("data-src") || "").filter(isLocalImageReference);
}

// src/export/collect-styles.ts
async function inlineCssUrls(css, baseUrl, resolver) {
  let result = css.replace(/@import\s+(?:url\([^)]*\)|["'][^"']+["'])[^;]*;/gi, "");
  const references = [...new Set([...result.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)].map((match) => match[2].trim()))];
  for (const reference of references) {
    if (!reference || reference.startsWith("data:") || reference.startsWith("#")) continue;
    let data = null;
    try {
      const absolute = new URL(reference, baseUrl).href;
      if (!/\.(?:woff2?|ttf|otf)(?:[?#]|$)/i.test(reference)) data = await resolver.resolve(absolute);
    } catch (error) {
      console.warn("[Rendered Print Exporter] CSS resource could not be resolved", reference, error);
    }
    const replacement = data?.startsWith("data:") ? `url("${data}")` : "none";
    result = result.split(`url(${reference})`).join(replacement).split(`url("${reference}")`).join(replacement).split(`url('${reference}')`).join(replacement);
  }
  return result;
}
async function installedPluginStyles(app, resolver, baseUrl) {
  const configDir = app.vault.configDir;
  let enabled;
  try {
    enabled = JSON.parse(await app.vault.adapter.read(`${configDir}/community-plugins.json`));
  } catch {
    return [];
  }
  if (!Array.isArray(enabled)) return [];
  const styles = [];
  for (const id of enabled) {
    if (typeof id !== "string" || !/^[a-z0-9-]+$/i.test(id)) continue;
    const path = `${configDir}/plugins/${id}/styles.css`;
    try {
      if (await app.vault.adapter.exists(path)) {
        styles.push(await inlineCssUrls(await app.vault.adapter.read(path), baseUrl, resolver));
      }
    } catch (error) {
      console.warn("[Rendered Print Exporter] plugin CSS could not be read", path, error);
    }
  }
  return styles;
}
async function collectStyles(app, resolver, doc) {
  const sheets = [...doc.styleSheets];
  const chunks = [];
  for (const sheet of sheets) {
    if (sheet.disabled) continue;
    try {
      const rules = [...sheet.cssRules].filter((rule) => rule.type !== CSSRule.FONT_FACE_RULE).map((rule) => rule.cssText);
      chunks.push(await inlineCssUrls(rules.join("\n"), sheet.href || doc.baseURI, resolver));
    } catch (error) {
      console.warn("[Rendered Print Exporter] stylesheet could not be read", sheet.href, error);
      if (sheet.ownerNode?.nodeName === "STYLE" && sheet.ownerNode.textContent) {
        chunks.push(await inlineCssUrls(sheet.ownerNode.textContent, doc.baseURI, resolver));
      }
    }
  }
  const pluginStyles = await installedPluginStyles(app, resolver, doc.baseURI);
  chunks.push(...pluginStyles);
  console.debug(`[Rendered Print Exporter] collected ${chunks.length} CSS sources (${sheets.length} stylesheets, ${pluginStyles.length} plugin files)`);
  return chunks.join("\n");
}

// src/export/print-css.ts
function printCss(settings) {
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

// src/export/build-html.ts
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function buildHtml(title, content, css, settings) {
  const current = document.body.classList.contains("theme-dark") ? "theme-dark" : "theme-light";
  const theme = settings.theme === "current" ? current : "theme-light";
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
  return `<!doctype html>
<html lang="ko" class="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>${css.replace(/<\/style/gi, "<\\/style")}</style><style>${normalization}</style><style>${printCss(settings)}</style></head><body class="${theme} rendered-print-exporter"><main class="print rendered-print-exporter-document"><div class="workspace-leaf-content is-read-mode" data-type="markdown"><div class="markdown-reading-view">${content.outerHTML}</div></div></main></body></html>`;
}

// src/export/save-html.ts
var import_obsidian2 = require("obsidian");

// src/android/save-to-downloads.ts
function filesystem() {
  const global = window;
  return global.Capacitor?.Plugins?.Filesystem;
}
function readableLocation(uri) {
  const path = uri.startsWith("file://") ? uri.slice("file://".length) : uri;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}
async function saveToDownloads(filename, html) {
  const bridge = filesystem();
  if (!bridge) throw new Error("Capacitor Filesystem is unavailable");
  const errors = [];
  const candidates = [
    { path: `/storage/emulated/0/Download/Obsidian HTML/${filename}` },
    { path: `Download/Obsidian HTML/${filename}`, directory: "EXTERNAL_STORAGE" },
    { path: `Obsidian HTML/${filename}`, directory: "DOCUMENTS" }
  ];
  for (const { path, directory } of candidates) {
    try {
      const result = await bridge.writeFile({
        path,
        data: html,
        directory,
        encoding: "utf8",
        recursive: true
      });
      const uri = result.uri || (await bridge.getUri({ path, directory })).uri;
      return readableLocation(uri);
    } catch (error) {
      errors.push(`${directory || "absolute Download"}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Could not write a shared Android file. ${errors.join("; ")}`);
}

// src/export/save-html.ts
async function saveHtml(filename, html) {
  if (import_obsidian2.Platform.isAndroidApp) return saveToDownloads(filename, html);
  const objectUrl = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    return filename;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 3e4);
  }
}

// src/settings/settings-tab.ts
var import_obsidian3 = require("obsidian");
var ExportSettingTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian3.Setting(containerEl).setName("Export theme").addDropdown((dropdown) => dropdown.addOption("light", "Light").addOption("current", "Current").setValue(this.plugin.settings.theme).onChange(async (value) => {
      this.plugin.settings.theme = value === "current" ? "current" : "light";
      await this.plugin.saveSettings();
    }));
    new import_obsidian3.Setting(containerEl).setName("Page size").addDropdown((dropdown) => dropdown.addOption("A4", "A4").addOption("Letter", "Letter").setValue(this.plugin.settings.pageSize).onChange(async (value) => {
      this.plugin.settings.pageSize = value === "Letter" ? "Letter" : "A4";
      await this.plugin.saveSettings();
    }));
    new import_obsidian3.Setting(containerEl).setName("Page margin (mm)").setDesc("Also controls spacing around the HTML in a browser.").addText((text) => text.setValue(String(this.plugin.settings.marginMm)).onChange(async (value) => {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0 && n <= 50) {
        this.plugin.settings.marginMm = n;
        await this.plugin.saveSettings();
      }
    }));
    new import_obsidian3.Setting(containerEl).setName("Include properties").addToggle((toggle) => toggle.setValue(this.plugin.settings.includeProperties).onChange(async (value) => {
      this.plugin.settings.includeProperties = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian3.Setting(containerEl).setName("Render delay (ms)").addText((text) => text.setValue(String(this.plugin.settings.renderDelayMs)).onChange(async (value) => {
      const n = Number(value);
      if (Number.isInteger(n) && n >= 0 && n <= 5e3) {
        this.plugin.settings.renderDelayMs = n;
        await this.plugin.saveSettings();
      }
    }));
  }
};

// src/types.ts
var DEFAULT_SETTINGS = {
  theme: "light",
  pageSize: "A4",
  marginMm: 12,
  includeProperties: false,
  renderDelayMs: 150
};

// src/utils/filenames.ts
function htmlFilename(basename) {
  const safe = basename.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").replace(/[. ]+$/g, "").trim();
  return `${safe || "Untitled"}.html`;
}

// src/render/diagnostics.ts
function hierarchy(element) {
  const result = [];
  for (let current = element; current && result.length < 8; current = current.parentElement) {
    result.push(`${current.tagName.toLowerCase()}${current.className && typeof current.className === "string" ? "." + current.className.trim().replace(/\s+/g, ".") : ""}`);
  }
  return result;
}
function snapshotRender(root) {
  const doc = root.ownerDocument;
  const images = [...root.querySelectorAll("img")];
  return {
    connected: root.isConnected,
    bodyContains: doc.body.contains(root),
    images: images.length,
    figures: root.querySelectorAll("figure").length,
    figcaptions: root.querySelectorAll("figcaption").length,
    imageCaptionsElements: root.querySelectorAll('[class*="image-captions-"]').length,
    hostHierarchy: hierarchy(root),
    htmlExcerpt: root.outerHTML.slice(0, 3e3),
    imageDetails: images.map((img) => {
      const embed = img.closest(".image-embed");
      const figure = img.closest("figure");
      return {
        imageOuterHTML: img.outerHTML,
        embedOuterHTML: embed?.outerHTML ?? null,
        figureOuterHTML: figure?.outerHTML ?? null,
        parentHierarchy: hierarchy(img),
        caption: figure?.querySelector("figcaption")?.textContent ?? null,
        imageWidthAttribute: img.getAttribute("width"),
        embedWidthAttribute: embed?.getAttribute("width") ?? null,
        imageLayoutWidthPx: img.getBoundingClientRect().width,
        figureLayoutWidthPx: figure?.getBoundingClientRect().width ?? null,
        imageClass: img.className,
        figureClass: figure?.getAttribute("class") ?? null,
        imageInlineStyle: img.getAttribute("style") ?? "",
        figureInlineStyle: figure?.getAttribute("style") ?? null
      };
    })
  };
}
function readingViewRoot(view) {
  if (view.getMode() !== "preview") return null;
  const container = view.previewMode.containerEl;
  return container.matches(".markdown-preview-view") ? container : container.querySelector(".markdown-preview-view.markdown-rendered");
}
function renderWidth(view) {
  const root = readingViewRoot(view);
  const width = root?.querySelector(".markdown-preview-sizer")?.getBoundingClientRect().width || root?.getBoundingClientRect().width || view.containerEl.getBoundingClientRect().width;
  return width >= 300 ? Math.round(width) : 703;
}
function logSnapshot(label, snapshot) {
  console.debug(`[Rendered Print Exporter] ${label}`, snapshot);
  for (const [index, detail] of snapshot.imageDetails.entries()) {
    console.debug(`[Rendered Print Exporter] ${label} image ${index + 1} outerHTML`, detail.imageOuterHTML);
    console.debug(`[Rendered Print Exporter] ${label} image ${index + 1} figure outerHTML`, detail.figureOuterHTML);
  }
}

// src/main.ts
var RenderedHtmlExportPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.viewActions = /* @__PURE__ */ new Map();
  }
  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
    this.addSettingTab(new ExportSettingTab(this.app, this));
    this.addCommand({
      id: "export-rendered-note-to-html",
      name: "Export rendered note to HTML",
      callback: () => {
        void this.exportActiveNote();
      }
    });
    this.addCommand({
      id: "diagnose-reading-vs-offscreen",
      name: "Diagnose Reading View vs off-screen render",
      callback: () => {
        void this.diagnoseActiveNote();
      }
    });
    this.addRibbonIcon("printer", "Export HTML (Print to PDF in browser)", () => {
      void this.exportActiveNote();
    });
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      this.ensureViewAction(leaf?.view instanceof import_obsidian4.MarkdownView ? leaf.view : null);
    }));
    this.registerEvent(this.app.workspace.on("file-open", () => {
      this.ensureViewAction(this.app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView));
    }));
    this.app.workspace.onLayoutReady(() => {
      this.ensureViewAction(this.app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView));
    });
    this.register(() => {
      for (const action of this.viewActions.values()) action.remove();
      this.viewActions.clear();
    });
  }
  ensureViewAction(view) {
    if (!view || this.viewActions.has(view)) return;
    const action = view.addAction("printer", "Export HTML (Print to PDF in browser)", () => {
      void this.exportActiveNote(view);
    });
    this.viewActions.set(view, action);
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async diagnoseActiveNote() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView);
    const file = view?.file;
    const actual = view && readingViewRoot(view);
    if (!file || !actual) {
      new import_obsidian4.Notice("Open a Markdown note in Reading View for DOM comparison.");
      return;
    }
    const actualObservation = observeRender(actual);
    await waitForRender(actual, actualObservation, 0);
    actualObservation.disconnect();
    const actualSnapshot = snapshotRender(actual);
    logSnapshot("actual Reading View", actualSnapshot);
    let rendered;
    try {
      const markdown = await this.app.vault.read(file);
      rendered = await renderNote(this.app, file, markdown, this.settings.renderDelayMs, view.containerEl.ownerDocument, renderWidth(view));
      const detachedSnapshot = snapshotRender(rendered.element);
      logSnapshot("off-screen", detachedSnapshot);
      const comparison = {
        actual: actualSnapshot,
        offscreen: detachedSnapshot,
        sameCounts: actualSnapshot.images === detachedSnapshot.images && actualSnapshot.figures === detachedSnapshot.figures && actualSnapshot.figcaptions === detachedSnapshot.figcaptions,
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
      console.debug("[Rendered Print Exporter] DOM comparison", comparison);
      const diagnosticsFolder = "Rendered HTML Export Diagnostics";
      if (!await this.app.vault.adapter.exists(diagnosticsFolder)) {
        await this.app.vault.createFolder(diagnosticsFolder);
      }
      const reportPath = `${diagnosticsFolder}/${file.basename}.json`;
      await this.app.vault.adapter.write(reportPath, JSON.stringify(comparison, null, 2));
      new import_obsidian4.Notice(`DOM diagnostics saved: ${reportPath}`);
    } catch (error) {
      console.error("[Rendered Print Exporter] diagnostic render failed", error);
      new import_obsidian4.Notice("Failed to render diagnostic comparison.");
    } finally {
      rendered?.dispose();
    }
  }
  async exportActiveNote(view = this.app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView)) {
    const file = view?.file;
    if (!file) {
      new import_obsidian4.Notice("No active Markdown note.");
      return;
    }
    const filename = htmlFilename(file.basename);
    let rendered;
    try {
      console.debug("[Rendered Print Exporter] rendering", file.path);
      const markdown = await this.app.vault.read(file);
      try {
        rendered = await renderNote(this.app, file, markdown, this.settings.renderDelayMs, view.containerEl.ownerDocument, renderWidth(view));
      } catch (error) {
        console.error("[Rendered Print Exporter] render failed", error);
        new import_obsidian4.Notice("Failed to render note.");
        return;
      }
      console.debug("[Rendered Print Exporter] postprocessors complete");
      if (!rendered.element.hasChildNodes()) {
        new import_obsidian4.Notice("Rendered DOM is empty.");
        return;
      }
      console.debug("[Rendered Print Exporter] document size", {
        markdownCharacters: markdown.length,
        renderedTextCharacters: rendered.element.textContent?.length ?? 0,
        renderedHtmlCharacters: rendered.element.outerHTML.length
      });
      const clone = cloneRenderedDom(rendered.element);
      inlineCanvas(rendered.element, clone);
      sanitizeDom(clone, this.settings.includeProperties);
      const resolver = new AssetResolver(this.app, file);
      await inlineImages(clone, resolver);
      const css = await collectStyles(this.app, resolver, rendered.element.ownerDocument);
      if (clone.querySelector(".image-captions-figure") && !css.includes(".image-captions-figure")) {
        console.warn("[Rendered Print Exporter] Image Captions CSS was not collected");
      }
      const html = buildHtml(file.basename, clone, css, this.settings);
      const unresolvedImages = unresolvedLocalImages(clone);
      for (const source of unresolvedImages) {
        console.warn("[Rendered Print Exporter] local image remains outside HTML", source);
      }
      try {
        const location = await saveHtml(filename, html);
        console.debug("[Rendered Print Exporter] saved", location);
        new import_obsidian4.Notice(`HTML exported: ${location}`, 8e3);
        if (unresolvedImages.length) {
          new import_obsidian4.Notice(`Warning: ${unresolvedImages.length} local image(s) could not be embedded.`, 8e3);
        }
      } catch (error) {
        console.error("[Rendered Print Exporter] save failed", error);
        new import_obsidian4.Notice("Failed to save HTML.");
      }
    } catch (error) {
      console.error("[Rendered Print Exporter] build failed", error);
      new import_obsidian4.Notice("Failed to build HTML.");
    } finally {
      rendered?.dispose();
    }
  }
};
