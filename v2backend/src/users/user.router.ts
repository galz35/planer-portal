import { Injectable } from '@nestjs/common';
import { Query, Router as TrpcRouter, Input } from '@mguay/nestjs-trpc';
import { z } from 'zod';
import { UsersService } from './users.service';

@Injectable()
@TrpcRouter()
export class UserRouter {
  // Se inyecta la MISMA lógica
  constructor(private readonly usersService: UsersService) {}

  @Query({
    input: z.object({ id: z.number() }),
  })
  async getUser(@Input() input: { id: number }) {
    // Reutilizamos el servicio
    return this.usersService.findOne(input.id);
  }
}
