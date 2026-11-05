import { Upload } from 'lucide-react';
import type { InputHTMLAttributes, Ref } from 'react';

type FilePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & {
  label: string;
  filename?: string;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
};
export function FilePicker({
  label,
  filename,
  hint = 'Select a file',
  inputRef,
  disabled,
  ...input
}: FilePickerProps) {
  return (
    <label className={'file-picker' + (disabled ? ' is-disabled' : '')}>
      <span className="file-picker-icon" aria-hidden="true">
        <Upload size={20} />
      </span>
      <span className={'file-picker-name' + (filename ? ' has-file' : '')} title={filename}>
        {filename || hint}
      </span>
      <input
        {...input}
        ref={inputRef}
        type="file"
        className="file-input"
        aria-label={label}
        disabled={disabled}
      />
    </label>
  );
}
