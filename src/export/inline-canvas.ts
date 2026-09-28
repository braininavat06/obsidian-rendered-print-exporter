export function inlineCanvas(original: HTMLElement, clone: HTMLElement): void {
  const source = [...original.querySelectorAll('canvas')];
  const copies = [...clone.querySelectorAll('canvas')];
  source.forEach((canvas, index) => {
    const copy = copies[index];
    if (!copy) return;
    try {
      const image = document.createElement('img');
      image.src = canvas.toDataURL('image/png');
      image.className = canvas.className;
      image.style.cssText = canvas.style.cssText;
      image.width = canvas.width;
      image.height = canvas.height;
      copy.replaceWith(image);
    } catch (error) {
      console.warn('[Rendered Print Exporter] canvas could not be captured', error);
    }
  });
}
