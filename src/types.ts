export interface ExportSettings {
  theme: 'light' | 'current';
  pageSize: 'A4' | 'Letter';
  marginMm: number;
  includeNoteTitle: boolean;
  includeProperties: boolean;
  renderDelayMs: number;
}

export const DEFAULT_SETTINGS: ExportSettings = {
  theme: 'light',
  pageSize: 'A4',
  marginMm: 12,
  includeNoteTitle: true,
  includeProperties: false,
  renderDelayMs: 150
};
