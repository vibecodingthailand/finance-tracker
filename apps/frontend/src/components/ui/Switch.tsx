interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-7 w-12 shrink-0 items-center rounded-full border px-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? 'border-emerald-500/40 bg-emerald-500/15'
          : 'border-zinc-700 bg-zinc-800'
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full transition-transform duration-200 ${
          checked ? 'translate-x-5 bg-emerald-400' : 'translate-x-0 bg-zinc-500'
        }`}
      />
    </button>
  );
}
