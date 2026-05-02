import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LinkController } from './link.controller';
import { LinkRepo } from './link.repo';
import { LinkService } from './link.service';

@Module({
  imports: [AuthModule],
  controllers: [LinkController],
  providers: [LinkService, LinkRepo],
  exports: [LinkRepo],
})
export class LinkModule {}
