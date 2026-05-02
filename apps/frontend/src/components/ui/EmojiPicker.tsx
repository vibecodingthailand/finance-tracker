interface EmojiGroup {
  label: string;
  emojis: string[];
}

const EMOJI_GROUPS: EmojiGroup[] = [
  {
    label: 'อาหาร',
    emojis: ['🍜', '🍚', '🍔', '🍕', '🍣', '🍱', '🥗', '☕', '🧋', '🍺', '🍰', '🍩', '🥡', '🍳'],
  },
  {
    label: 'เดินทาง',
    emojis: ['🚗', '🚕', '🛵', '🚌', '🚆', '🚲', '✈️', '⛽', '🅿️', '🛴'],
  },
  {
    label: 'ที่อยู่',
    emojis: ['🏠', '🏢', '🛏️', '💡', '💧', '🔌', '📶', '🧹', '🧺'],
  },
  {
    label: 'ช้อปปิ้ง',
    emojis: ['🛒', '🛍️', '👕', '👟', '💄', '🎁', '📱', '💻', '🎧'],
  },
  {
    label: 'สุขภาพ',
    emojis: ['💊', '🏥', '💉', '🦷', '👓', '🏋️', '🧘', '⚽'],
  },
  {
    label: 'ความบันเทิง',
    emojis: ['🎬', '🎮', '🎵', '🎤', '📚', '🎨', '🎲', '🎟️'],
  },
  {
    label: 'รายรับ',
    emojis: ['💰', '💵', '💸', '🏦', '💳', '📈', '🎯', '🏆'],
  },
  {
    label: 'อื่นๆ',
    emojis: ['📦', '✏️', '🐶', '🐱', '🌱', '🎓', '👶', '🎂', '💝', '🆘'],
  },
];

interface EmojiPickerProps {
  value: string;
  onChange: (next: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-2xl">
          {value || '🙂'}
        </span>
        <p className="text-xs text-zinc-500">เลือกไอคอนหรือพิมพ์อิโมจิเอง</p>
      </div>
      <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {group.label}
            </p>
            <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-8">
              {group.emojis.map((emoji) => {
                const isActive = value === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={emoji}
                    aria-pressed={isActive}
                    onClick={() => onChange(emoji)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl transition ${
                      isActive
                        ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40'
                        : 'bg-zinc-800/40 hover:bg-zinc-800'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
