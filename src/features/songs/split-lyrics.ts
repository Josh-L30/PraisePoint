/** Preserve words and explicit lines. Width checks require the loaded stage font. */
export function splitLyrics(text: string, maxLines: number, isLineOverflow?: (line: string) => boolean): { text: string; overflow: boolean }[] {
  if (!Number.isInteger(maxLines) || maxLines < 1 || maxLines > 200) throw new RangeError('Choose between 1 and 200 lines per slide.');
  if (!text.trim()) throw new RangeError('Enter lyrics before reviewing slide breaks.');
  const slides: { text: string; overflow: boolean }[] = [];
  let lines: string[] = [];
  function flush() {
    if (lines.length) slides.push({ text: lines.join('\n'), overflow: lines.some(line => isLineOverflow?.(line) ?? false) });
    lines = [];
  }
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) { flush(); continue; }
    lines.push(line);
    if (lines.length === maxLines) flush();
  }
  flush();
  return slides;
}
