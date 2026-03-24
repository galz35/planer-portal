import { Injectable } from '@nestjs/common';

export type User = { id: number; name: string; email: string };

@Injectable()
export class UsersService {
  private users: User[] = [
    { id: 1, name: 'Admin', email: 'admin@gympro.com' },
    { id: 2, name: 'Demo User', email: 'demo@gympro.com' },
  ];

  async findOne(id: number): Promise<User | null> {
    // Aquí iría la lógica real de base de datos
    return this.users.find((u) => u.id === id) || null;
  }
}
