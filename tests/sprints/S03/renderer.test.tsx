import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SlideRenderer } from '../../../src/components/slide-renderer/SlideRenderer';
import { createTemplate } from '../../../src/features/decks/templates';
import type { TextElement } from '../../../src/domain/slide';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function font(loaded = true) {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: {
      load: async () => (loaded ? [{ family: 'Figtree', status: 'loaded' }] : []),
      check: () => loaded,
    },
  });
}
it('renders literal text at fixed logical positions with explicit line breaks in every mode', async () => {
  font();
  const slide = createTemplate('lyrics'),
    element = slide.elements[0] as TextElement;
  element.text = '<script>alert(1)</script>\n主よ 🙏';
  const view = render(<SlideRenderer slide={slide} mode="editor" />);
  const node = await screen.findByTestId('element-' + element.id);
  expect(node.textContent).toBe(element.text);
  expect(node.querySelector('script')).toBeNull();
  expect(node).toHaveStyle({
    left: '96px',
    top: '300px',
    width: '1728px',
    height: '480px',
    whiteSpace: 'pre',
    fontFamily: 'Figtree',
  });
  for (const mode of ['preview', 'audience'] as const) {
    view.rerender(<SlideRenderer slide={slide} mode={mode} />);
    expect(await screen.findByTestId('element-' + element.id)).toHaveStyle({
      left: '96px',
      top: '300px',
      fontSize: '72px',
    });
  }
});
it('reports missing Figtree instead of substituting a different presentation font', async () => {
  font(false);
  const slide = createTemplate('lyrics');
  render(<SlideRenderer slide={slide} mode="audience" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Figtree');
  expect(screen.queryByTestId('element-' + slide.elements[0].id)).not.toBeInTheDocument();
});
it('includes selection controls only in the editor tree', async () => {
  font();
  const slide = createTemplate('lyrics'),
    overlay = () => <button>Editor selection</button>;
  const view = render(<SlideRenderer slide={slide} mode="editor" editorOverlay={overlay} />);
  expect(await screen.findByRole('button', { name: 'Editor selection' })).toBeVisible();
  view.rerender(<SlideRenderer slide={slide} mode="audience" editorOverlay={overlay} />);
  expect(screen.queryByRole('button', { name: 'Editor selection' })).not.toBeInTheDocument();
});
it('shows unavailable media honestly and releases a late resolution after unmount', async () => {
  font();
  const slide = createTemplate('lyrics');
  slide.background = { kind: 'image', mediaId: crypto.randomUUID() };
  const view = render(<SlideRenderer slide={slide} mode="preview" />);
  expect(await screen.findByText(/Media unavailable/)).toBeVisible();
  let resolve!: (value: { ok: true; value: { url: string; release(): void } }) => void;
  const release = vi.fn();
  view.rerender(
    <SlideRenderer
      slide={slide}
      mode="preview"
      resolveMedia={() =>
        new Promise((done) => {
          resolve = done;
        })
      }
    />,
  );
  await waitFor(() => expect(resolve).toBeTypeOf('function'));
  view.unmount();
  resolve({ ok: true, value: { url: 'blob:https://gather.example/test', release } });
  await waitFor(() => expect(release).toHaveBeenCalledOnce());
});
