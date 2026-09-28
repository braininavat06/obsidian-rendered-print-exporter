# Rendered Print Exporter

Obsidian Community Plugin POC for exporting a note through Obsidian's Reading View Markdown renderer. The output is a single HTML file intended for Android browser printing. PDF creation and page layout belong to the browser.

## Install

For a manual installation, download `main.js` and `manifest.json` from the [repository](https://github.com/braininavat06/obsidian-rendered-print-exporter), place them in `<vault>/.obsidian/plugins/rendered-print-exporter/`, restart Obsidian, then enable **Rendered Print Exporter** under Community plugins. No Node or Electron module is bundled into the plugin.

For BRAT, install and enable BRAT, choose **Add Beta Plugin**, and enter `https://github.com/braininavat06/obsidian-rendered-print-exporter`. Select the latest release and enable **Rendered Print Exporter**. Release assets include `main.js` and `manifest.json`.

For development, run `npm ci && npm run typecheck && npm run build` and copy the same two files. This project is still a POC; Reading View DOM equivalence with Image Captions is awaiting a device test.

Use **Export rendered note to HTML** from the command palette. The command reads the active Markdown file from the vault and renders it in a connected, off-screen DOM host without switching the current editor mode. It waits for rendering, two animation frames, a configurable delay, DOM quiet time, and image decode before cloning the result. The clone is cleaned and converted into a static HTML file. The render component and host are disposed afterward.

Android first tries the public `Download/Obsidian HTML/` folder through the Capacitor Filesystem bridge (absolute path and `EXTERNAL_STORAGE`). If Android storage restrictions reject both, it tries the public `Documents/Obsidian HTML/` folder. Other platforms use the browser download API. The returned path is logged in the developer console.

## Reading View DOM diagnostic

Create a test note with a local JPEG named `test.jpg`, using `![[test.jpg|캡션 테스트|250]]` and `![[test.jpg|오른쪽 정렬 테스트|right|250]]`.

Open that note in **Reading View**, then run **Diagnose Reading View vs off-screen render**. The command logs exact image and figure `outerHTML` for each side, caption text, width attributes and layout widths, classes, inline styles, ancestor hierarchy, connectivity, and element counts. It also saves a `.rendered-print-exporter-diagnostics.json` report next to the note with field-by-field comparisons. The ordinary export command logs the off-screen snapshot before cloning. This diagnostic does not switch the active view or save HTML.

The DOM observer is armed before `MarkdownRenderer.render`. After rendering and two frames, it waits for 150 ms without subtree mutation, with a 2 s limit. The configured render delay is additional time. Image decoding and another quiet check happen before cloning.

## Required device verification

This repository cannot establish Image Captions fidelity or Android public storage access by TypeScript compilation alone. On a device with Image Captions enabled:

1. Create a note with `![[image.jpg|캡션|250]]`, plus an aligned image. View it in Reading View and note the figure, caption, width, and alignment.
2. Switch to Live Preview, run the export command, and inspect the console's `rendered image/caption counts`. Check the generated HTML for `image-captions-figure`, `figcaption`, inline `data:image/` URLs, and absence of `app://`, `blob:`, and vault `file://` resources.
3. Open the HTML in Chrome or Samsung Internet with network access off. Print to A4 PDF. Check Korean text, highlights, properties exclusion, nested list numbering, images, captions, width, and alignment.
4. Repeat with a 10-page note containing long ordered lists and images between list items. Check that markers stay with text and no large gaps appear before figures.
5. Repeat in dark Obsidian mode with the default Light export setting.

Image Captions 1.2.1 registers a Markdown postprocessor for external images and a document `MutationObserver` for internal embeds. Its callback scans `.image-embed` and `.video-embed` descendants of child-list mutation targets; it does not check workspace leaf, `MarkdownPreviewView`, or visibility. The off-screen host is attached to the active view's document body so that observer can see it. This is a source-level compatibility finding; actual rendered equivalence remains to be tested in Obsidian.

## Known limits

- Some plugins depend on a real `MarkdownPreviewView` or workspace leaf and may not operate in this host. No private Obsidian APIs or syntax-specific fallback are used.
- A failed asset is logged and left unchanged, so that particular file may not be fully self-contained. The command logs remaining local resource references.
- Android shared-folder access depends on the app and Android storage permissions. The Documents fallback may be used when Download is blocked.
- External `@import` rules are omitted. CSS URL resources are inlined when accessible and otherwise removed, so complex theme assets may differ.
- Browser print behavior, including list marker placement, needs device inspection. The plugin does not split content into pages.

## Third-party reference

The Android storage approach was informed by [Single HTML Export](https://github.com/DDEOK/Obsidian-Single-HTML-Export), MIT licensed. No source code was copied. Image Captions behavior was checked against [its source](https://github.com/alangrainger/obsidian-image-captions).
