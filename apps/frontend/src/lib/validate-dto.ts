import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export async function validateDto<T extends object>(
  dtoClass: ClassConstructor<T>,
  values: object,
): Promise<FieldErrors<T>> {
  const instance = plainToInstance(dtoClass, values);
  const errors = await validate(instance as object);
  const result: FieldErrors<T> = {};
  for (const error of errors) {
    if (!error.constraints) continue;
    const messages = Object.values(error.constraints);
    if (messages.length === 0) continue;
    result[error.property as keyof T] = translateConstraint(messages[0] ?? '');
  }
  return result;
}

function translateConstraint(message: string): string {
  if (/must be an email/i.test(message)) return 'กรุณากรอกอีเมลให้ถูกต้อง';
  if (/must be longer than or equal to (\d+)/i.test(message)) {
    const match = message.match(/(\d+)/);
    const min = match?.[1] ?? '';
    return `ต้องมีความยาวอย่างน้อย ${min} ตัวอักษร`;
  }
  if (/must be a string/i.test(message)) return 'กรุณากรอกข้อมูล';
  if (/should not be empty/i.test(message)) return 'กรุณากรอกข้อมูล';
  return message;
}
