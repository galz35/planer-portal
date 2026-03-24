import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería encontrar un usuario por id', async () => {
    const user = await service.findOne(1);
    expect(user).toBeDefined();
    expect(user?.name).toBe('Admin');
  });

  it('debería retornar null para id inexistente', async () => {
    const user = await service.findOne(999);
    expect(user).toBeNull();
  });
});
