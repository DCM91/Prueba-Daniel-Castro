import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { UserService, AvatarUploadPayload } from './user.service';
import { User } from '../types/auth.types';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        UserService,
      ],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function makeUser(overrides: Partial<User> = {}): User {
    return {
      id: 42,
      name: 'Lucia',
      email: 'lucia@example.com',
      role: 'freelancer',
      created_at: '2026-06-14T00:00:00+00:00',
      avatar_url: 'https://res.cloudinary.com/demo/x.jpg',
      avatar_urls: {
        xs: 'https://res.cloudinary.com/demo/xs.jpg',
        sm: 'https://res.cloudinary.com/demo/sm.jpg',
        md: 'https://res.cloudinary.com/demo/md.jpg',
        lg: 'https://res.cloudinary.com/demo/lg.jpg',
        xxl: 'https://res.cloudinary.com/demo/xxl.jpg',
      },
      ...overrides,
    };
  }

  it('POSTs avatar payload and unwraps the data envelope', (done) => {
    const payload: AvatarUploadPayload = {
      public_id: 'framematch/avatars/42-abc',
      url: 'https://res.cloudinary.com/demo/x.jpg',
      width: 800,
      height: 800,
      format: 'jpg',
      bytes: 12345,
    };

    service.setAvatar(payload).subscribe((user) => {
      expect(user.id).toBe(42);
      expect(user.avatar_urls?.md).toBe('https://res.cloudinary.com/demo/md.jpg');
      done();
    });

    const req = httpMock.expectOne('/api/me/avatar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ data: makeUser() });
  });

  it('DELETEs the avatar and unwraps the data envelope', (done) => {
    service.removeAvatar().subscribe((user) => {
      expect(user.avatar_url).toBeNull();
      expect(user.avatar_urls).toBeNull();
      done();
    });

    const req = httpMock.expectOne('/api/me/avatar');
    expect(req.request.method).toBe('DELETE');
    req.flush({ data: makeUser({ avatar_url: null, avatar_urls: null }) });
  });

  it('PUTs account update payload and unwraps the data envelope', (done) => {
    const payload = {
      name: 'Lucia Marin',
      email: 'lucia.new@example.com',
      phone: '+34 600 000 000',
      city: 'Madrid',
    };

    service.updateAccount(payload).subscribe((user) => {
      expect(user.id).toBe(42);
      expect(user.email).toBe('lucia.new@example.com');
      expect(user.phone).toBe('+34 600 000 000');
      expect(user.city).toBe('Madrid');
      done();
    });

    const req = httpMock.expectOne('/api/me');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ data: makeUser({ email: 'lucia.new@example.com', phone: '+34 600 000 000', city: 'Madrid' }) });
  });
});
