import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import type { CreateUserDto, UpdateUserDto } from 'src/dtos/user.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  private assertAdmin(user: JwtPayload) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admin can manage users');
    }
  }

  @Get()
  async getUsers(@CurrentUser() user: JwtPayload) {
    this.assertAdmin(user);
    return this.userService.getUsers();
  }

  @Get(':id')
  async getUserById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.userService.getUserById(id);
  }

  @Post()
  async createUser(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateUserDto,
  ) {
    this.assertAdmin(user);
    return this.userService.createUser(data);
  }

  @Patch()
  async updateUser(
    @CurrentUser() user: JwtPayload,
    @Body() data: UpdateUserDto,
  ) {
    this.assertAdmin(user);
    return this.userService.updateUser(data);
  }

  @Delete(':id')
  async deleteUser(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.userService.deleteUser(id);
  }
}
