import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../common/audit.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// MOCK DE SQL PROVIDER (Parche de seguridad)
jest.mock('../db/sqlserver.provider', () => ({
  obtenerPoolSql: jest.fn(),
  isPoolConnected: jest.fn().mockReturnValue(true),
  sql: {
    Int: 'Int',
    NVarChar: 'NVarChar',
    Bit: 'Bit',
    VarChar: 'VarChar',
  },
}));

// MOCK DE AUDIT SERVICE
jest.mock('../common/audit.service', () => {
  class MockAuditService {
    log = jest.fn().mockResolvedValue(undefined);
  }
  return {
    AuditService: MockAuditService,
    AccionAudit: { USUARIO_LOGIN: 'USUARIO_LOGIN' },
    RecursoAudit: { USUARIO: 'USUARIO' },
  };
});

// MOCK DE REPOSITORIO MANUAL (authRepo)
jest.mock('./auth.repo', () => ({
  obtenerUsuarioPorIdentificador: jest.fn(),
  obtenerCredenciales: jest.fn(),
  actualizarUltimoLogin: jest.fn(),
  contarSubordinados: jest.fn(),
  obtenerUsuarioPorId: jest.fn(),
  actualizarRefreshToken: jest.fn(),
  obtenerConfigUsuario: jest.fn(),
}));

import * as authRepo from './auth.repo';

// --- Mocks Locales para usar en el test (aunque los de arriba ya cubren la importacion)
// Re-definimos para claridad de tipos en el test
class MockUsuario {
  idUsuario: number;
  nombre: string;
  correo: string;
  rolGlobal: string;
}

class MockUsuarioCredenciales {
  idUsuario: number;
  passwordHash: string;
  ultimoLogin: Date;
  refreshTokenHash: string;
}

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userRepo: any;
  let credsRepo: any;

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockCredsRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        AuditService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== validateUser Tests ====================
  describe('validateUser', () => {
    const mockUser = {
      idUsuario: 1,
      nombre: 'Test User',
      correo: 'test@example.com',
      activo: true,
      rolGlobal: 'User',
      rol: { idRol: 1, nombre: 'Employee' },
    };

    const mockCreds = {
      idUsuario: 1,
      passwordHash: 'hashedPassword123',
      ultimoLogin: null,
    };

    it('should return user when credentials are valid', async () => {
      (authRepo.obtenerUsuarioPorIdentificador as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (authRepo.obtenerCredenciales as jest.Mock).mockResolvedValue(mockCreds);
      (authRepo.actualizarUltimoLogin as jest.Mock).mockResolvedValue(
        undefined,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual(mockUser);
      expect(authRepo.obtenerUsuarioPorIdentificador).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedPassword123',
      );
    });

    it('should return null when user does not exist', async () => {
      (authRepo.obtenerUsuarioPorIdentificador as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password',
      );

      expect(result).toBeNull();
      expect(authRepo.obtenerCredenciales).not.toHaveBeenCalled();
    });

    it('should return null when password is incorrect', async () => {
      (authRepo.obtenerUsuarioPorIdentificador as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (authRepo.obtenerCredenciales as jest.Mock).mockResolvedValue(mockCreds);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
      expect(authRepo.actualizarUltimoLogin).not.toHaveBeenCalled();
    });

    it('should return null when user has no credentials', async () => {
      (authRepo.obtenerUsuarioPorIdentificador as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (authRepo.obtenerCredenciales as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      (authRepo.obtenerUsuarioPorIdentificador as jest.Mock).mockResolvedValue(
        null,
      ); // Repo filter should handle it

      const result = await service.validateUser(
        'inactive@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });
  });

  // ==================== login Tests ====================
  describe('login', () => {
    const mockUser = {
      idUsuario: 1,
      nombre: 'Test User',
      correo: 'test@example.com',
      carnet: 'E123456',
      rol: { idRol: 1, nombre: 'Employee' },
      rolGlobal: 'User',
    };

    it('should return tokens and user info on successful login', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token_123')
        .mockResolvedValueOnce('refresh_token_456');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_refresh_token');
      (authRepo.actualizarRefreshToken as jest.Mock).mockResolvedValue(
        undefined,
      );
      (authRepo.contarSubordinados as jest.Mock).mockResolvedValue(0);
      (authRepo.obtenerConfigUsuario as jest.Mock).mockResolvedValue(null);

      const result = await service.login(mockUser);

      expect(result).toMatchObject({
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_456',
        user: expect.objectContaining({
          idUsuario: 1,
          nombre: 'Test User',
        }),
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(authRepo.actualizarRefreshToken).toHaveBeenCalled();
    });

    it('should generate tokens with correct payload', async () => {
      mockJwtService.signAsync.mockResolvedValue('token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (authRepo.actualizarRefreshToken as jest.Mock).mockResolvedValue(
        undefined,
      );
      (authRepo.contarSubordinados as jest.Mock).mockResolvedValue(0);

      await service.login(mockUser);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          correo: 'test@example.com',
          sub: 1,
          userId: 1,
          rol: 'User',
        }),
        expect.objectContaining({ expiresIn: '12h' }),
      );
    });
  });

  // ==================== refreshTokens Tests ====================
  describe('refreshTokens', () => {
    const mockUser = {
      idUsuario: 1,
      nombre: 'Test User',
      correo: 'test@example.com',
      rol: { idRol: 1, nombre: 'Employee' },
      rolGlobal: 'User',
    };

    const mockCreds = {
      idUsuario: 1,
      refreshTokenHash: 'hashed_refresh_token',
    };

    it('should return new tokens when refresh token is valid', async () => {
      (authRepo.obtenerCredenciales as jest.Mock).mockResolvedValue(mockCreds);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new_access_token')
        .mockResolvedValueOnce('new_refresh_token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_refresh');
      (authRepo.actualizarRefreshToken as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await service.refreshTokens(1, 'valid_refresh_token');

      expect(result).toEqual({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
      });
    });

    it('should throw UnauthorizedException when credentials not found', async () => {
      (authRepo.obtenerCredenciales as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshTokens(1, 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when no refresh token stored', async () => {
      (authRepo.obtenerCredenciales as jest.Mock).mockResolvedValue({
        idUsuario: 1,
        refreshTokenHash: null,
      });

      await expect(service.refreshTokens(1, 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token does not match', async () => {
      (authRepo.obtenerCredenciales as jest.Mock).mockResolvedValue(mockCreds);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens(1, 'invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user no longer exists', async () => {
      (authRepo.obtenerCredenciales as jest.Mock).mockResolvedValue(mockCreds);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshTokens(1, 'valid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
