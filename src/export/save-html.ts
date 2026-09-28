import { Platform } from 'obsidian';
import { saveToDownloads } from '../android/save-to-downloads';

export async function saveHtml(filename: string, html: string): Promise<string> {
  if (Platform.isAndroidApp) return saveToDownloads(filename, html);
  const objectUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    return filename;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  }
}
