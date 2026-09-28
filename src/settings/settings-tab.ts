import { App, PluginSettingTab, Setting } from 'obsidian';
import type RenderedHtmlExportPlugin from '../main';

export class ExportSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: RenderedHtmlExportPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName('Export theme').addDropdown(dropdown => dropdown
      .addOption('light', 'Light').addOption('current', 'Current')
      .setValue(this.plugin.settings.theme)
      .onChange(async value => { this.plugin.settings.theme = value === 'current' ? 'current' : 'light'; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Page size').addDropdown(dropdown => dropdown
      .addOption('A4', 'A4').addOption('Letter', 'Letter')
      .setValue(this.plugin.settings.pageSize)
      .onChange(async value => { this.plugin.settings.pageSize = value === 'Letter' ? 'Letter' : 'A4'; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Page margin (mm)').setDesc('Also controls spacing around the HTML in a browser.').addText(text => text
      .setValue(String(this.plugin.settings.marginMm))
      .onChange(async value => { const n = Number(value); if (Number.isFinite(n) && n >= 0 && n <= 50) { this.plugin.settings.marginMm = n; await this.plugin.saveSettings(); } }));
    new Setting(containerEl).setName('Include properties').addToggle(toggle => toggle
      .setValue(this.plugin.settings.includeProperties)
      .onChange(async value => { this.plugin.settings.includeProperties = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Render delay (ms)').addText(text => text
      .setValue(String(this.plugin.settings.renderDelayMs))
      .onChange(async value => { const n = Number(value); if (Number.isInteger(n) && n >= 0 && n <= 5000) { this.plugin.settings.renderDelayMs = n; await this.plugin.saveSettings(); } }));
  }
}
