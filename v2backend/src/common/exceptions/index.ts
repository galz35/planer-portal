import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Excepción para credenciales inválidas
 */
export class InvalidCredentialsException extends HttpException {
  constructor(message = 'Credenciales inválidas') {
    super(
      {
        message,
        errorCode: 'INVALID_CREDENTIALS',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Excepción para permisos insuficientes
 */
export class InsufficientPermissionsException extends HttpException {
  constructor(action?: string) {
    const message = action
      ? `No tienes permisos para: ${action}`
      : 'No tienes permisos suficientes para esta acción';
    super(
      {
        message,
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Excepción para recursos no encontrados
 */
export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, id?: number | string) {
    const message = id
      ? `${resource} con ID ${id} no encontrado`
      : `${resource} no encontrado`;
    super(
      {
        message,
        errorCode: 'RESOURCE_NOT_FOUND',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Excepción para operaciones de negocio inválidas
 */
export class BusinessRuleException extends HttpException {
  constructor(message: string, errorCode = 'BUSINESS_RULE_VIOLATION') {
    super(
      {
        message,
        errorCode,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/**
 * Excepción para conflictos de datos
 */
export class ConflictException extends HttpException {
  constructor(message: string) {
    super(
      {
        message,
        errorCode: 'CONFLICT',
      },
      HttpStatus.CONFLICT,
    );
  }
}
