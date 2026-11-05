import { expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectionOverlay } from '../../../src/features/decks/editor/SelectionOverlay';
import { createEditorState, reduceEditor } from '../../../src/features/decks/editor/editor-reducer';
import { deckFixture } from '../../support/deck-fixture';
function Editor() {
  const document = deckFixture(),
    first = document.slides[0].elements[0];
  if (first.kind === 'text') first.text = 'First line\n第二行';
  const [state, setState] = useState(() => createEditorState(document));
  return (
    <>
      <div className="slide-stage">
        <SelectionOverlay
          slide={state.document.slides[0]}
          selectedId={state.selectedElementId}
          scale={1}
          disabled={false}
          instructionsId="instructions"
          onCommand={(command) => setState((previous) => reduceEditor(previous, command))}
        />
      </div>
      <button onClick={() => setState((previous) => reduceEditor(previous, { type: 'undo' }))}>
        Undo text
      </button>
      <output>
        {state.document.slides[0].elements[0].kind === 'text'
          ? state.document.slides[0].elements[0].text
          : ''}
      </output>
    </>
  );
}
it('clicks into literal canvas text, keeps native Delete/selection, and undoes one typing session', async () => {
  const user = userEvent.setup();
  render(<Editor />);
  await user.dblClick(screen.getByRole('button', { name: 'Select Lyrics' }));
  const input = screen.getByRole('textbox', { name: 'Edit slide text' });
  expect(input).toHaveValue('First line\n第二行');
  await user.clear(input);
  await user.type(input, '新しい言葉{Enter}Worship together');
  const caret = '新しい言葉\n'.length;
  (input as HTMLTextAreaElement).setSelectionRange(caret, caret);
  await user.keyboard('{Delete}');
  expect(input).toHaveValue('新しい言葉\norship together');
  await user.click(screen.getByRole('button', { name: 'Undo text' }));
  expect(screen.getByRole('status')).toHaveTextContent('First line');
  expect(screen.getByRole('status')).toHaveTextContent('第二行');
});
it('offers a labelled movement handle separately from the editable text', async () => {
  const user = userEvent.setup();
  render(<Editor />);
  await user.dblClick(screen.getByRole('button', { name: 'Select Lyrics' }));
  expect(screen.getByRole('button', { name: 'Move text box' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Edit slide text' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Select Lyrics' })).toBeInTheDocument();
});
