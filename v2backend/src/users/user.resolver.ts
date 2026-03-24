import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { UserType } from './dto/user.type';

@Resolver(() => UserType)
export class UserResolver {
  // Se inyecta la lógica
  constructor(private readonly usersService: UsersService) {}

  @Query(() => UserType, { nullable: true, name: 'getUser' })
  async getUser(@Args('id', { type: () => Int }) id: number) {
    return this.usersService.findOne(id);
  }
}
