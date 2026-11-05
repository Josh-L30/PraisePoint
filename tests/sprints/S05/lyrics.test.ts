import { describe, expect, it } from 'vitest';
import { splitLyrics } from '../../../src/features/songs/split-lyrics';

describe('lyric breaks preserve the volunteer’s words', () => {
  it('keeps stanza boundaries and normalizes Windows line endings', () => {
    expect(
      splitLyrics('First line\r\nSecond line\r\n\r\nThird line', 4).map((s) => s.text),
    ).toEqual(['First line\nSecond line', 'Third line']);
  });
  it('splits only on existing lines and preserves repeated choruses', () => {
    expect(splitLyrics('One\nTwo\nThree\n\nOne\nTwo', 2).map((s) => s.text)).toEqual([
      'One\nTwo',
      'Three',
      'One\nTwo',
    ]);
  });
  it('flags a long line without wrapping or truncating it', () => {
    const line = 'Praise'.repeat(1000);
    expect(splitLyrics(line, 4, (value) => value.length > 50)).toEqual([
      { text: line, overflow: true },
    ]);
    expect(splitLyrics(line, 4)).toEqual([{ text: line, overflow: false }]);
  });
  it('preserves punctuation, spacing, non-Latin words and literal markup', () => {
    expect(splitLyrics('  Diyos ay mabuti!  \n<script>🙏</script>', 4)[0].text).toBe(
      '  Diyos ay mabuti!  \n<script>🙏</script>',
    );
  });
  it('rejects empty lyrics and invalid line counts', () => {
    for (const value of ['', ' \n\t\r\n']) expect(() => splitLyrics(value, 4)).toThrow();
    for (const count of [0, -1, 1.5, Infinity, NaN, 201])
      expect(() => splitLyrics('Words', count)).toThrow();
  });
  it('ignores empty boundary lines without creating empty slides', () => {
    expect(splitLyrics('\n\nOne\n \n\nTwo\n', 4).map((s) => s.text)).toEqual(['One', 'Two']);
  });
});
