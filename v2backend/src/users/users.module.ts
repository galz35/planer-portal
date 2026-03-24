import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResolver } from './user.resolver';
import { UserRouter } from './user.router';

@Module({
  providers: [UsersService, UserResolver, UserRouter],
  exports: [UsersService],
})
export class UsersModule {}
