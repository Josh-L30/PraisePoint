import { expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BackgroundVideo } from '../../../src/components/slide-renderer/BackgroundLayer';
it('pauses and resumes the same background element without resetting its time', async () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(),
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const view = render(<BackgroundVideo url="blob:fixture" animate={true} />);
  await waitFor(() => expect(play).toHaveBeenCalled());
  const video = view.container.querySelector('video')!;
  video.currentTime = 7;
  Object.defineProperty(video, 'paused', { value: false, configurable: true });
  view.rerender(<BackgroundVideo url="blob:fixture" animate={false} />);
  expect(pause).toHaveBeenCalled();
  expect(video.currentTime).toBe(7);
  view.rerender(<BackgroundVideo url="blob:fixture" animate={true} />);
  expect(view.container.querySelector('video')).toBe(video);
  expect(video.currentTime).toBe(7);
});
it('reports a blocked background as unavailable for black-output recovery', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('Blocked'));
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  render(<BackgroundVideo url="blob:fixture" animate={true} />);
  expect(await screen.findByText(/Background playback unavailable/)).toHaveClass(
    'slide-media-missing',
  );
});
