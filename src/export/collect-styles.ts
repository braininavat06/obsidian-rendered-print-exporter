import { App } from 'obsidian';
import { AssetResolver } from './inline-images';

async function inlineCssUrls(css: string, baseUrl: string, resolver: AssetResolver): Promise<string> {
  let result = css.replace(/@import\s+(?:url\([^)]*\)|["'][^"']+["'])[^;]*;/gi, '');
  const references = [...new Set([...result.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)].map(match => match[2].trim()))];
  for (const reference of references) {
    if (!reference || reference.startsWith('data:') || reference.startsWith('#')) continue;
    let data: string | null = null;
    try {
      const absolute = new URL(reference, baseUrl).href;
      if (!/\.(?:woff2?|ttf|otf)(?:[?#]|$)/i.test(reference)) data = await resolver.resolve(absolute);
    } catch (error) {
      console.warn('[Rendered Print Exporter] CSS resource could not be resolved', reference, error);
    }
    const replacement = data?.startsWith('data:') ? `url("${data}")` : 'none';
    result = result.split(`url(${reference})`).join(replacement)
      .split(`url("${reference}")`).join(replacement)
      .split(`url('${reference}')`).join(replacement);
  }
  return result;
}

async function installedPluginStyles(app: App, resolver: AssetResolver, baseUrl: string): Promise<string[]> {
  const configDir = app.vault.configDir;
  let enabled: unknown;
  try {
    enabled = JSON.parse(await app.vault.adapter.read(`${configDir}/community-plugins.json`));
  } catch {
    return [];
  }
  if (!Array.isArray(enabled)) return [];
  const styles: string[] = [];
  for (const id of enabled) {
    if (typeof id !== 'string' || !/^[a-z0-9-]+$/i.test(id)) continue;
    const path = `${configDir}/plugins/${id}/styles.css`;
    try {
      if (await app.vault.adapter.exists(path)) {
        styles.push(await inlineCssUrls(await app.vault.adapter.read(path), baseUrl, resolver));
      }
    } catch (error) {
      console.warn('[Rendered Print Exporter] plugin CSS could not be read', path, error);
    }
  }
  return styles;
}

export async function collectStyles(app: App, resolver: AssetResolver, doc: Document): Promise<string> {
  const sheets = [...doc.styleSheets];
  const chunks: string[] = [];
  for (const sheet of sheets) {
    if (sheet.disabled) continue;
    try {
      const rules = [...sheet.cssRules]
        .filter(rule => rule.type !== CSSRule.FONT_FACE_RULE)
        .map(rule => rule.cssText);
      chunks.push(await inlineCssUrls(rules.join('\n'), sheet.href || doc.baseURI, resolver));
    } catch (error) {
      console.warn('[Rendered Print Exporter] stylesheet could not be read', sheet.href, error);
      // A style element can still be read when CSSOM access fails.
      if (sheet.ownerNode?.nodeName === 'STYLE' && sheet.ownerNode.textContent) {
        chunks.push(await inlineCssUrls(sheet.ownerNode.textContent, doc.baseURI, resolver));
      }
    }
  }
  const pluginStyles = await installedPluginStyles(app, resolver, doc.baseURI);
  chunks.push(...pluginStyles);
  console.debug(`[Rendered Print Exporter] collected ${chunks.length} CSS sources (${sheets.length} stylesheets, ${pluginStyles.length} plugin files)`);
  return chunks.join('\n');
}
