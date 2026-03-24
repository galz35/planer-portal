import { Module } from '@nestjs/common';
import { AdminSecurityController } from './admin-security.controller';
import { AdminSecurityService } from './admin-security.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AccesoModule } from '../acceso/acceso.module';
import { BackupController } from './backup/backup.controller';
import { BackupService } from './backup/backup.service';

@Module({
  imports: [AccesoModule],
  controllers: [AdminSecurityController, AdminController, BackupController],
  providers: [AdminSecurityService, AdminService, BackupService],

  exports: [AdminSecurityService, AdminService],
})
export class AdminModule {}
