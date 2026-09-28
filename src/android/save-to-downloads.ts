interface CapacitorFilesystem {
  writeFile(options: { path: string; data: string; directory?: string; encoding: string; recursive: boolean }): Promise<{ uri?: string }>;
  getUri(options: { path: string; directory?: string }): Promise<{ uri: string }>;
}

interface CapacitorBridge {
  Plugins?: { Filesystem?: CapacitorFilesystem };
}

function filesystem(): CapacitorFilesystem | undefined {
  const global = window as Window & { Capacitor?: CapacitorBridge };
  return global.Capacitor?.Plugins?.Filesystem;
}

function readableLocation(uri: string): string {
  const path = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
  try { return decodeURIComponent(path); } catch { return path; }
}

export async function saveToDownloads(filename: string, html: string): Promise<string> {
  const bridge = filesystem();
  if (!bridge) throw new Error('Capacitor Filesystem is unavailable');
  const errors: string[] = [];
  const candidates: Array<{ path: string; directory?: string }> = [
    { path: `/storage/emulated/0/Download/Obsidian HTML/${filename}` },
    { path: `Download/Obsidian HTML/${filename}`, directory: 'EXTERNAL_STORAGE' },
    { path: `Obsidian HTML/${filename}`, directory: 'DOCUMENTS' }
  ];
  for (const { path, directory } of candidates) {
    try {
      const result = await bridge.writeFile({
        path, data: html, directory, encoding: 'utf8', recursive: true
      });
      const uri = result.uri || (await bridge.getUri({ path, directory })).uri;
      return readableLocation(uri);
    } catch (error) {
      errors.push(`${directory || 'absolute Download'}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Could not write a shared Android file. ${errors.join('; ')}`);
}
