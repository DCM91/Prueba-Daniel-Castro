import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { NotificationsService } from './notifications.service';
import { Notification } from '../types/auth.types';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpMock: HttpTestingController;

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        NotificationsService,
      ],
    });
    service = TestBed.inject(NotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs /api/me/notifications and unwraps data + meta', (done) => {
    service.list({ perPage: 15 }).subscribe((res) => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe('n-1');
      expect(res.meta.total).toBe(1);
      expect(res.meta.current_page).toBe(1);
      done();
    });

    const req = httpMock.expectOne((r) => r.url === '/api/me/notifications');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('per_page')).toBe('15');
    expect(req.request.params.get('unread_only')).toBeNull();
    req.flush({
      data: [makeNotification()],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
    });
  });

  it('passes unread_only=true as a query param when requested', (done) => {
    service.list({ unreadOnly: true }).subscribe(() => done());
    const req = httpMock.expectOne((r) => r.url === '/api/me/notifications');
    expect(req.request.params.get('unread_only')).toBe('true');
    req.flush({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
    });
  });

  it('GETs /api/me/notifications/unread-count and unwraps total', (done) => {
    service.unreadCount().subscribe((count) => {
      expect(count).toBe(3);
      done();
    });

    const req = httpMock.expectOne('/api/me/notifications/unread-count');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { total: 3 } });
  });

  it('POSTs to /api/me/notifications/{id}/read and unwraps the data', (done) => {
    service.markRead('n-1').subscribe((n) => {
      expect(n.id).toBe('n-1');
      expect(n.read_at).toBe('2026-06-20T10:05:00.000000Z');
      done();
    });

    const req = httpMock.expectOne('/api/me/notifications/n-1/read');
    expect(req.request.method).toBe('POST');
    req.flush({
      data: makeNotification({ read_at: '2026-06-20T10:05:00.000000Z' }),
    });
  });

  it('POSTs to /api/me/notifications/read-all and returns the updated count', (done) => {
    service.markAllRead().subscribe((updated) => {
      expect(updated).toBe(5);
      done();
    });

    const req = httpMock.expectOne('/api/me/notifications/read-all');
    expect(req.request.method).toBe('POST');
    req.flush({ data: { updated: 5 } });
  });

  it('surfaces 404 errors on markRead', (done) => {
    service.markRead('n-unknown').subscribe({
      error: (err) => {
        expect(err.status).toBe(404);
        done();
      },
    });

    const req = httpMock.expectOne('/api/me/notifications/n-unknown/read');
    req.flush({ message: 'Notificación no encontrada.' }, { status: 404, statusText: 'Not Found' });
  });
});
