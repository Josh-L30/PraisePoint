import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { WorkspacePicker } from '../../../src/features/workspaces/WorkspacePicker';
import { church, personal } from './fixtures';
function Harness({ onSelect }: { onSelect(): void }) {
  const location = useLocation();
  const selected = location.pathname.includes(church.id) ? church : personal;
  return <><WorkspacePicker workspaces={[personal,church]} selected={selected} onSelect={onSelect} /><output data-testid="route">{location.pathname}</output></>;
}
it('switches only the active workspace route and not personal content', async () => {
  const onSelect = vi.fn();
  render(<MemoryRouter initialEntries={['/app/w/' + personal.id]}><Harness onSelect={onSelect} /></MemoryRouter>);
  const picker = screen.getByRole('combobox', { name: 'Switch workspace' });
  await userEvent.selectOptions(picker,church.id);
  expect(screen.getByTestId('route')).toHaveTextContent('/app/w/' + church.id);
  expect(picker).toHaveValue(church.id);
  expect(onSelect).toHaveBeenCalledOnce();
  expect(screen.getByRole('option', { name: 'Personal workspace' })).toBeInTheDocument();
});
