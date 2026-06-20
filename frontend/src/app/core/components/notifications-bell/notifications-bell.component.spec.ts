import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ChatRealtimeService } from '../../../core/services/chat-realtime.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { Notification } from '../../../core/types/auth.types';
import { NotificationsBellComponent } from './notifications-bell.component';

describe('NotificationsBellComponent', () => {
  let notificationsMock: {
    list: jest.Mock;
    unreadCount: jest.Mock;
    markRead: jest.Mock;
    markAllRead: jest.Mock;
  };
  let realtimeMock: {
    onNotification: jest.Mock;
  };
  let notificationListeners: Array<(n: Notification) => void>;

  const makeNotification = (overrides: Partial<Notification> = {}): Notification => ({
    id: 'n-1',
    kind: 'proposal_received',
    title: 'Nueva propuesta',
    body: 'Has recibido una propuesta.',
    icon: 'inbox',
    link: '/briefs/1',
    meta: { brief_id: 1 },
    read_at: null,
    created_at: '2026-06-20T10:00:00.000000Z',
    ...overrides,
  });

  const configure = async (): Promise<NotificationsBellComponent> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [NotificationsBellComponent],
      providers: [
        provideHttpClient(withInterceptors([])),
        provideRouter([]),
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: ChatRealtimeService, useValue: realtimeMock },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotificationsBellComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  beforeEach(() => {
    notificationListeners = [];
    notificationsMock = {
      list: jest.fn().mockReturnValue(of({
        data: [makeNotification()],
        meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      })),
      unreadCount: jest.fn().mockReturnValue(of(1)),
      markRead: jest.fn().mockReturnValue(of(makeNotification({ read_at: '2026-06-20T10:05:00.000000Z' }))),
      markAllRead: jest.fn().mockReturnValue(of(1)),
    };
    realtimeMock = {
      onNotification: jest.fn().mockImplementation((cb: (n: Notification) => void) => {
        notificationListeners.push(cb);
        return () => undefined;
      }),
    };
  });

  it('renders the bell with no badge when there are no unread notifications', async () => {
    notificationsMock.list.mockReturnValue(of({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
    }));
    const component = await configure();
    component.ngOnInit();
    expect(component.unreadCount()).toBe(0);
    expect(component.hasUnread()).toBe(false);
  });

  it('fetches the initial list on init and computes the unread count', async () => {
    const component = await configure();
    component.ngOnInit();
    expect(notificationsMock.list).toHaveBeenCalled();
    expect(component.items().length).toBe(1);
    expect(component.unreadCount()).toBe(1);
  });

  it('subscribes to realtime notifications and prepends them', async () => {
    const component = await configure();
    component.ngOnInit();
    const incoming: Notification = makeNotification({
      id: 'n-2',
      title: 'Propuesta aceptada',
      body: 'Te han aceptado.',
    });
    notificationListeners[0](incoming);
    expect(component.items()[0].id).toBe('n-2');
    expect(component.unreadCount()).toBe(2);
  });

  it('marks a notification as read and navigates when link is present', async () => {
    const component = await configure();
    const router = TestBed.inject(Router);
    const navSpy = jest.spyOn(router, 'navigateByUrl').mockReturnValue(Promise.resolve(true));
    component.ngOnInit();
    component.selectItem(makeNotification());
    expect(notificationsMock.markRead).toHaveBeenCalledWith('n-1');
    expect(navSpy).toHaveBeenCalledWith('/briefs/1');
  });

  it('does not navigate when the notification has no link', async () => {
    const component = await configure();
    const router = TestBed.inject(Router);
    const navSpy = jest.spyOn(router, 'navigateByUrl').mockReturnValue(Promise.resolve(true));
    component.ngOnInit();
    component.selectItem(makeNotification({ link: null }));
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('marks all as read via the service and updates local state', async () => {
    const component = await configure();
    component.ngOnInit();
    component.markAllRead();
    expect(notificationsMock.markAllRead).toHaveBeenCalled();
    expect(component.unreadCount()).toBe(0);
  });

  it('shows the error state when the initial list fails to load', async () => {
    notificationsMock.list.mockReturnValue(throwError(() => ({ status: 500 })));
    const component = await configure();
    component.ngOnInit();
    expect(component.errorMessage()).toBe('notifications.error_load');
    expect(component.loading()).toBe(false);
  });

  it('opens and closes the dropdown on toggle', async () => {
    const component = await configure();
    component.ngOnInit();
    expect(component.open()).toBe(false);
    component.toggle();
    expect(component.open()).toBe(true);
    component.toggle();
    expect(component.open()).toBe(false);
  });
});
