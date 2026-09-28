export function cloneRenderedDom(element: HTMLElement): HTMLElement {
  return element.cloneNode(true) as HTMLElement;
}
