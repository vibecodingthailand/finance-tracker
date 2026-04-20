import { validate } from "class-validator";

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export async function validateDto<T extends object>(
  instance: T,
): Promise<FieldErrors<T>> {
  const errors = await validate(instance, {
    whitelist: true,
    forbidUnknownValues: false,
  });
  const result: FieldErrors<T> = {};
  for (const err of errors) {
    const messages = err.constraints ? Object.values(err.constraints) : [];
    if (messages.length > 0) {
      result[err.property as keyof T] = messages[0];
    }
  }
  return result;
}
