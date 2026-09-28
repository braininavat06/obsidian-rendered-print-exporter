export function htmlFilename(basename: string): string {
  const safe = basename.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').trim();
  return `${safe || 'Untitled'}.html`;
}
