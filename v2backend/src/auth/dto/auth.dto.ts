import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'juan.perez@empresa.com o E1010231',
    description: 'Correo electrónico o Carnet de empleado',
  })
  @IsString()
  correo: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  oldPassword: string;

  @ApiProperty()
  @IsString()
  newPassword: string;
}

export class UpdateUserConfigDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  agendaShowGestion?: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  agendaShowRapida?: boolean;

  @ApiProperty({ example: '{"theme":"dark"}' })
  @IsString()
  @IsOptional()
  menuPersonalizado?: string;
}
