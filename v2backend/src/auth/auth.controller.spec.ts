import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/auth.dto';
import { InvalidCredentialsException } from '../common/exceptions';

// Mock del servicio
jest.mock('./auth.service');

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;
  let jwtService: Partial<JwtService>;

  beforeEach(async () => {
    // Mock services
    authService = {
      validateUser: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
    };

    jwtService = {
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      const loginDto: LoginDto = { correo: 'test@test.com', password: '123' };
      const mockUser = {
        idUsuario: 1,
        correo: 'test@test.com',
        nombre: 'Test',
        rolGlobal: 'Admin',
      };
      const tokens = {
        accessToken: 'abc',
        refreshToken: 'xyz',
        user: mockUser,
      };

      (authService.validateUser as jest.Mock).mockResolvedValue(mockUser);
      (authService.login as jest.Mock).mockResolvedValue(tokens);

      const result = await controller.login(loginDto);
      expect(result).toBe(tokens);
      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@test.com',
        '123',
      );
    });

    it('should throw InvalidCredentialsException on invalid credentials', async () => {
      const loginDto: LoginDto = { correo: 'fail@test.com', password: 'wrong' };
      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });
  });
});
