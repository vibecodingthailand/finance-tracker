interface EmojiPickerProps {
  label: string;
  value: string;
  onChange: (emoji: string) => void;
  error?: string;
}

const PRESET_EMOJIS: string[] = [
  "🍜",
  "🍕",
  "🍔",
  "☕",
  "🍺",
  "🍎",
  "🛒",
  "🍱",
  "🚗",
  "⛽",
  "🚕",
  "🚌",
  "✈️",
  "🚆",
  "🏠",
  "💡",
  "🚿",
  "🛋️",
  "🧺",
  "🛍️",
  "👕",
  "💄",
  "📦",
  "🎬",
  "🎮",
  "🎵",
  "📚",
  "🏥",
  "💊",
  "💪",
  "💰",
  "💵",
  "💼",
  "🎁",
  "📈",
  "🎓",
  "🐶",
  "✨",
  "💳",
  "🏦",
];

export function EmojiPicker({
  label,
  value,
  onChange,
  error,
}: EmojiPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <div
        className={`rounded-lg border bg-zinc-900 p-2 ${
          error ? "border-rose-500/60" : "border-zinc-800"
        }`}
      >
        <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
          {PRESET_EMOJIS.map((emoji) => {
            const selected = emoji === value;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onChange(emoji)}
                aria-label={`เลือกไอคอน ${emoji}`}
                aria-pressed={selected}
                className={`flex h-10 w-10 items-center justify-center rounded-md text-xl transition duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                  selected
                    ? "bg-emerald-500/20 ring-2 ring-emerald-500/60"
                    : "hover:bg-zinc-800"
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
