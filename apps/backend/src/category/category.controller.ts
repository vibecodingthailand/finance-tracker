import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CreateCategoryDto, GetCategoriesQueryDto, UpdateCategoryDto } from '@finance-tracker/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CategoryService } from './category.service';

interface AuthRequest {
  user: { userId: string; email: string };
}

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll(@Request() req: AuthRequest, @Query() query: GetCategoriesQueryDto) {
    return this.categoryService.findAll(req.user.userId, query);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateCategoryDto) {
    return this.categoryService.create(req.user.userId, dto);
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(req.user.userId, id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  delete(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.categoryService.delete(req.user.userId, id);
  }
}
