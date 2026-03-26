import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/adapters/pug.adapter';
import { NotificationService } from './notification.service';
import { ReminderService } from './reminder.service';
import { NotificationController } from './notification.controller';
import { AuthModule } from '../auth/auth.module'; // Dependencia para AuthGuard

@Module({
  imports: [
    AuthModule,
    MailerModule.forRootAsync({
      // ... (mantener factory intacto)
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST', 'smtp.gmail.com'),
          port: config.get('MAIL_PORT', 465),
          secure: config.get('MAIL_PORT', 465) == 465, // true para 465, false para otros
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: config.get(
            'MAIL_FROM',
            '"Planner-EF" <no-reply@planner-ef.com>',
          ),
        },
        template: {
          dir: (() => {
            const fs = require('fs');
            const path = require('path');
            const paths = [
              path.join(process.cwd(), 'dist', 'common', 'templates'),
              path.join(process.cwd(), 'dist', 'src', 'common', 'templates'),
              path.join(__dirname, 'templates'),
              path.join(__dirname, '..', 'templates'),
            ];
            for (const p of paths) {
              if (fs.existsSync(p)) return p;
            }
            return paths[0]; // Fallback
          })(),
          adapter: new PugAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, ReminderService],
  exports: [NotificationService, ReminderService],
})
export class NotificationModule { }
