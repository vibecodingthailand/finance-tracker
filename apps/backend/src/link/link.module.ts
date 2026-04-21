import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LinkController } from "./link.controller";
import { LinkRepository } from "./link.repository";
import { LinkService } from "./link.service";

@Module({
  imports: [AuthModule],
  controllers: [LinkController],
  providers: [LinkService, LinkRepository],
  exports: [LinkService],
})
export class LinkModule {}
