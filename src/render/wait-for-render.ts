export interface RenderObservation {
  readonly mutationCount: number;
  readonly lastMutationAt: number;
  disconnect(): void;
}

export function observeRender(container: HTMLElement): RenderObservation {
  let mutationCount = 0;
  let lastMutationAt = performance.now();
  const observer = new MutationObserver(records => {
    mutationCount += records.length;
    lastMutationAt = performance.now();
  });
  // Start before MarkdownRenderer.render: Image Captions schedules its own
  // document.body observer and can mutate this subtree after render resolves.
  observer.observe(container, { childList: true, subtree: true, attributes: true, characterData: true });
  return {
    get mutationCount() { return mutationCount; },
    get lastMutationAt() { return lastMutationAt; },
    disconnect: () => observer.disconnect()
  };
}

function frame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

async function waitForQuiet(observation: RenderObservation, quietMs: number, timeoutMs: number): Promise<boolean> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if (performance.now() - observation.lastMutationAt >= quietMs) return true;
    await new Promise<void>(resolve => setTimeout(resolve, 25));
  }
  return false;
}

export async function waitForRender(container: HTMLElement, observation: RenderObservation, extraDelayMs: number): Promise<void> {
  await frame();
  await frame();
  const settled = await waitForQuiet(observation, 150, 2000);
  if (!settled) console.warn('[Rendered Print Exporter] DOM did not settle within 2 seconds');
  if (extraDelayMs > 0) await new Promise<void>(resolve => setTimeout(resolve, extraDelayMs));
  await Promise.all([...container.querySelectorAll('img')].map(async img => {
    if (img.complete) return;
    await Promise.race([
      img.decode().catch(() => undefined),
      new Promise<void>(resolve => setTimeout(resolve, 2000))
    ]);
  }));
  await waitForQuiet(observation, 150, 2000);
  await frame();
  console.debug('[Rendered Print Exporter] DOM settle', { settled, mutations: observation.mutationCount });
}
