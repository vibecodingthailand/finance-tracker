import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoryAccessService } from './category-access.service';
import { CategoryController } from './category.controller';
import { CategoryRepo } from './category.repo';
import { CategoryService } from './category.service';

@Module({
  imports: [AuthModule],
  controllers: [CategoryController],
  providers: [CategoryService, CategoryRepo, CategoryAccessService],
  exports: [CategoryRepo, CategoryAccessService],
})
export class CategoryModule {}
