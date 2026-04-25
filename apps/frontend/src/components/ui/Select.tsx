import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, ChevronDownIcon } from '../icons';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  hint?: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  ariaLabel?: string;
  className?: string;
}

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  flipUp: boolean;
}

const MAX_POPOVER_HEIGHT = 288;

function findFirstEnabled(options: SelectOption[]): number {
  return options.findIndex((option) => !option.disabled);
}

function findNextEnabled(options: SelectOption[], from: number, dir: 1 | -1): number {
  if (options.length === 0) return -1;
  for (let step = 1; step <= options.length; step += 1) {
    const idx = (from + dir * step + options.length) % options.length;
    const option = options[idx];
    if (option && !option.disabled) return idx;
  }
  return from;
}

function computePosition(triggerRect: DOMRect): PopoverPosition {
  const margin = 8;
  const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
  const spaceAbove = triggerRect.top - margin;
  const flipUp = spaceBelow < 200 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(120, Math.min(MAX_POPOVER_HEIGHT, flipUp ? spaceAbove : spaceBelow));
  return {
    top: flipUp ? triggerRect.top - maxHeight - margin : triggerRect.bottom + margin,
    left: triggerRect.left,
    width: triggerRect.width,
    maxHeight,
    flipUp,
  };
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'เลือก',
  error,
  disabled,
  name,
  id,
  ariaLabel,
  className = '',
}: SelectProps) {
  const reactId = useId();
  const triggerId = id ?? `select-${reactId}`;
  const listboxId = `${triggerId}-listbox`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    setPosition(computePosition(triggerRef.current.getBoundingClientRect()));
    const idx = options.findIndex((option) => option.value === value && !option.disabled);
    setHighlight(idx >= 0 ? idx : findFirstEnabled(options));
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const closeOnScroll = (event: Event) => {
      if (popoverRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const closeOnResize = () => setOpen(false);
    document.addEventListener('mousedown', closeIfOutside);
    document.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnResize);
    return () => {
      document.removeEventListener('mousedown', closeIfOutside);
      document.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open || highlight < 0) return;
    const item = popoverRef.current?.querySelector<HTMLLIElement>(`#${triggerId}-opt-${highlight}`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight, triggerId]);

  const handleSelect = (idx: number) => {
    const option = options[idx];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setHighlight((prev) => findNextEnabled(options, prev, 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlight((prev) => findNextEnabled(options, prev, -1));
        break;
      case 'Home':
        event.preventDefault();
        setHighlight(findFirstEnabled(options));
        break;
      case 'End': {
        event.preventDefault();
        let idx = options.length - 1;
        while (idx >= 0 && options[idx]?.disabled) idx -= 1;
        if (idx >= 0) setHighlight(idx);
        break;
      }
      case 'Enter':
        event.preventDefault();
        handleSelect(highlight);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const triggerClass = [
    'group flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border bg-zinc-900 px-3.5 text-left text-sm transition outline-none',
    error
      ? 'border-rose-500/60'
      : open
        ? 'border-emerald-500/60 ring-2 ring-emerald-500/30'
        : 'border-zinc-800 hover:border-zinc-700',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    'focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/60',
    className,
  ].join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={triggerId} className="text-sm font-medium text-zinc-300">
          {label}
        </label>
      ) : null}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        name={name}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && highlight >= 0 ? `${triggerId}-opt-${highlight}` : undefined}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((value) => !value)}
        onKeyDown={handleKeyDown}
        className={triggerClass}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selected?.icon !== undefined ? (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm">
              {selected.icon}
            </span>
          ) : null}
          <span className={`truncate ${selected ? 'text-zinc-100' : 'text-zinc-500'}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 transition-all duration-200 ${
            open ? 'rotate-180 text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'
          }`}
        />
      </button>
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
      {open && position
        ? createPortal(
            <div
              ref={popoverRef}
              id={listboxId}
              role="listbox"
              className="fixed z-[60] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/60 ring-1 ring-black/40"
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
                animation: position.flipUp
                  ? 'popoverInUp 140ms ease-out'
                  : 'popoverInDown 140ms ease-out',
              }}
            >
              <ul
                className="overflow-y-auto py-1"
                style={{ maxHeight: position.maxHeight - 2 }}
              >
                {options.length === 0 ? (
                  <li className="px-3.5 py-3 text-sm text-zinc-500">ไม่มีตัวเลือก</li>
                ) : null}
                {options.map((option, idx) => {
                  const isSelected = option.value === value;
                  const isHighlighted = idx === highlight;
                  return (
                    <li
                      key={option.value}
                      id={`${triggerId}-opt-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      onMouseEnter={() => !option.disabled && setHighlight(idx)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(idx)}
                      className={[
                        'mx-1 flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm transition select-none',
                        option.disabled
                          ? 'cursor-not-allowed text-zinc-600'
                          : 'cursor-pointer',
                        !option.disabled && isHighlighted ? 'bg-zinc-800 text-zinc-100' : '',
                        !option.disabled && !isHighlighted && isSelected
                          ? 'text-emerald-400'
                          : '',
                        !option.disabled && !isHighlighted && !isSelected ? 'text-zinc-200' : '',
                      ].join(' ')}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        {option.icon !== undefined ? (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800/90 text-sm">
                            {option.icon}
                          </span>
                        ) : null}
                        <span className="truncate">{option.label}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {option.hint ? (
                          <span className="text-xs text-zinc-500">{option.hint}</span>
                        ) : null}
                        {isSelected ? (
                          <CheckIcon className="h-4 w-4 text-emerald-400" />
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
