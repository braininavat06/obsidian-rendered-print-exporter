import { AssetResolver } from './inline-images';

export async function collectStyles(resolver: AssetResolver): Promise<string> {
  const sheets = [...document.styleSheets];
  const chunks: string[] = [];
  for (const sheet of sheets) {
    if (sheet.disabled) continue;
    try {
      const rules = [...sheet.cssRules]
        .filter(rule => rule.type !== CSSRule.FONT_FACE_RULE)
        .map(rule => rule.cssText);
      let sheetCss = rules.join('\n');
      sheetCss = sheetCss.replace(/@import\s+(?:url\([^)]*\)|["'][^"']+["'])[^;]*;/gi, '');
      const references = [...new Set([...sheetCss.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)].map(match => match[2].trim()))];
      for (const reference of references) {
        if (!reference || reference.startsWith('data:') || reference.startsWith('#')) continue;
        const absolute = new URL(reference, sheet.href || document.baseURI).href;
        const isFont = /\.(?:woff2?|ttf|otf)(?:[?#]|$)/i.test(reference);
        const data = isFont ? null : await resolver.resolve(absolute);
        const replacement = data?.startsWith('data:') ? `url("${data}")` : 'none';
        sheetCss = sheetCss.split(`url(${reference})`).join(replacement)
          .split(`url("${reference}")`).join(replacement)
          .split(`url('${reference}')`).join(replacement);
      }
      chunks.push(sheetCss);
    } catch (error) {
      console.warn('[Rendered Print Exporter] stylesheet could not be read', sheet.href, error);
    }
  }
  console.debug(`[Rendered Print Exporter] collected ${chunks.length}/${sheets.length} stylesheets`);
  return chunks.join('\n');
}
