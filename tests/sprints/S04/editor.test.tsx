import { beforeEach, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { EditorCanvas } from '../../../src/features/decks/editor/EditorCanvas';
import { PropertiesPanel } from '../../../src/features/decks/editor/PropertiesPanel';
import {
  createEditorState,
  reduceEditor,
  type EditorCommand,
} from '../../../src/features/decks/editor/editor-reducer';
import { deckFixture } from '../../support/deck-fixture';
beforeEach(() =>
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { load: async () => [{ family: 'Figtree', status: 'loaded' }], check: () => true },
  }),
);
function Fixture() {
  const [state, setState] = useState(() => createEditorState(deckFixture()));
  const command = (value: EditorCommand) => setState((current) => reduceEditor(current, value));
  return (
    <>
      <EditorCanvas state={state} onCommand={command} />
      <PropertiesPanel state={state} onCommand={command} />
      <output data-testid="state">{JSON.stringify(state.document.slides[0].elements[0])}</output>
    </>
  );
}
it('moves the selected box by 1 or Shift+10 logical pixels and supports keyboard resizing', async () => {
  render(<Fixture />);
  const box = await screen.findByRole('button', { name: 'Select Lyrics' });
  box.focus();
  await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowDown}{/Shift}');
  expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ x: 97, y: 310 });
  const handle = screen.getByRole('button', { name: 'Resize width and height' });
  handle.focus();
  await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowDown}{/Shift}');
  expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
    width: 1729,
    height: 490,
  });
});
it('keeps text-field arrow/undo shortcuts away from canvas movement', async () => {
  render(<Fixture />);
  const text = await screen.findByRole('textbox', { name: 'Lyrics' });
  await userEvent.click(text);
  await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowDown}{/Shift}{Control>}z{/Control}');
  expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
    x: 96,
    y: 300,
    width: 1728,
    height: 480,
  });
});
it('provides position/size fields and native button alternatives with editable text preserved', async () => {
  render(<Fixture />);
  const x = await screen.findByRole('spinbutton', { name: 'X position' });
  await userEvent.clear(x);
  await userEvent.type(x, '120');
  await userEvent.click(screen.getByRole('button', { name: 'Move right' }));
  expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
    x: 121,
    text: 'Enter your lyrics here\nOne line at a time',
  });
  const width = screen.getByRole('spinbutton', { name: 'Box width' });
  await userEvent.clear(width);
  await userEvent.type(width, '800');
  expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ width: 800 });
});
