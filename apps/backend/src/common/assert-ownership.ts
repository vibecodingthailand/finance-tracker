import { ForbiddenException, NotFoundException } from '@nestjs/common';

export function assertOwnership<T extends { userId: string }>(
  entity: T | null,
  userId: string,
  resource: string,
): asserts entity is T {
  if (!entity) throw new NotFoundException(`${resource} not found`);
  if (entity.userId !== userId) throw new ForbiddenException();
}
