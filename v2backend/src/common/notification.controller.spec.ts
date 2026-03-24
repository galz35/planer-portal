import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  const mockNotificationService = {
    sendPushToUser: jest.fn(),
    sendEmailNotification: jest.fn(),
    sendTaskAssignmentEmail: jest.fn(),
    sendOverdueTasksEmail: jest.fn(),
    sendCalendarShareEmail: jest.fn(),
    getTokensForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('status debería devolver estado de firebase y email', async () => {
    mockNotificationService.getTokensForUser.mockResolvedValue([
      'token1',
      'token2',
    ]);
    const req = { user: { idUsuario: 1 } };
    const result = await controller.getStatus(req);

    expect(result).toHaveProperty('firebase');
    expect(result.firebase).toHaveProperty('inicializado');
    expect(result).toHaveProperty('email');
  });

  it('test-push debería llamar al servicio', async () => {
    mockNotificationService.getTokensForUser.mockResolvedValue(['token1']);
    mockNotificationService.sendPushToUser.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
    } as any);
    const req = { user: { idUsuario: 1 } };
    const result = await controller.testPush(req);

    expect(service.sendPushToUser).toHaveBeenCalled();
    expect(result).toHaveProperty('message');
  });
});
