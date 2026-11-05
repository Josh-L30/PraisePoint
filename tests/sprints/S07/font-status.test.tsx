import { expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { SlideRenderer } from '../../../src/components/slide-renderer/SlideRenderer';
import { createTemplate } from '../../../src/features/decks/templates';
it('reports a missing audience font so the presenter can keep output black', async () => {
  const original = document.fonts;
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { load: async () => [], check: () => false },
  });
  try {
    const status = vi.fn();
    render(
      <SlideRenderer slide={createTemplate('lyrics')} mode="audience" onFontStatus={status} />,
    );
    await waitFor(() => expect(status).toHaveBeenCalledWith('missing'));
  } finally {
    Object.defineProperty(document, 'fonts', { configurable: true, value: original });
  }
});
