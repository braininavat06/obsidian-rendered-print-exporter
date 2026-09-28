const PROPERTY_SELECTORS = [
  '.metadata-container', '.metadata-properties', '.metadata-properties-heading',
  '.metadata-content', '.frontmatter-container'
];

const UI_SELECTORS = [
  'script', 'button.copy-code-button', '.copy-code-button',
  '.heading-collapse-indicator', '.collapse-indicator',
  '.edit-block-button', '.mod-cta', '.inline-title',
  '.metadata-add-button', '.metadata-property-icon'
];

export function sanitizeDom(root: HTMLElement, includeProperties: boolean): void {
  const selectors = includeProperties ? UI_SELECTORS : [...UI_SELECTORS, ...PROPERTY_SELECTORS];
  root.querySelectorAll(selectors.join(',')).forEach(node => node.remove());
  root.querySelectorAll<HTMLElement>('*').forEach(node => {
    for (const attr of [...node.attributes]) {
      if (attr.name.startsWith('on')) node.removeAttribute(attr.name);
    }
  });
}
