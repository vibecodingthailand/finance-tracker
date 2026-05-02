import { TransactionType } from '@finance-tracker/shared';
import { SegmentedControl, type SegmentedOption } from './ui/SegmentedControl';

interface TypeToggleProps {
  value: TransactionType;
  onChange: (next: TransactionType) => void;
  disabled?: boolean;
  label?: string;
}

const options: SegmentedOption<TransactionType>[] = [
  { value: TransactionType.EXPENSE, label: 'รายจ่าย', tone: 'expense' },
  { value: TransactionType.INCOME, label: 'รายรับ', tone: 'income' },
];

export function TypeToggle({ value, onChange, disabled = false, label = 'ประเภท' }: TypeToggleProps) {
  return (
    <SegmentedControl
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
    />
  );
}
