export interface ExportSettings {
  theme: 'light' | 'current';
  pageSize: 'A4' | 'Letter';
  marginMm: number;
  includeProperties: boolean;
  renderDelayMs: number;
}

export const DEFAULT_SETTINGS: ExportSettings = {
  theme: 'light',
  pageSize: 'A4',
  marginMm: 12,
  includeProperties: false,
  renderDelayMs: 150
};
