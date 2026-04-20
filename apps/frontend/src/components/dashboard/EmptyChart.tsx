interface EmptyChartProps {
  message: string;
}

export function EmptyChart({ message }: EmptyChartProps) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 text-sm text-zinc-500">
      {message}
    </div>
  );
}
