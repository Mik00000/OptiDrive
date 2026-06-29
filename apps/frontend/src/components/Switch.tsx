"use client";

import { useState } from 'react';

type SwitchProps = {
  initialChecked?: boolean;
  onChange?: (checked: boolean) => void;
};

export default function Switch({ initialChecked = false, onChange }: SwitchProps) {
  const [enabled, setEnabled] = useState(initialChecked);

  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    if (onChange) {
      onChange(newState);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={handleToggle}
      className={`
        ${enabled ? 'bg-accent' : 'bg-border'}
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
      `}
    >
      <span className="sr-only">Toggle setting</span>
      <span
        className={`
          ${enabled ? 'translate-x-5 bg-bg' : 'translate-x-0 bg-text-muted'}
          pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out
        `}
      />
    </button>
  );
}