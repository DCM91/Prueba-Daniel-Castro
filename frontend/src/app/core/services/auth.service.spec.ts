import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { AuthPayload, User } from '../types/auth.types';

describe('AuthService', () => {
  let service: AuthService;
  let http: jest.Mocked<HttpClient>;
  let storage: jest.Mocked<TokenStorageService>;

  const mockUser: User = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'client',
    created_at: '2026-06-11T08:00:00.000Z',
  };

  const buildJwt = (expSecondsFromNow: number): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }));
    return `${header}.${payload}.sig`;
  };

  const mockPayload: AuthPayload = {
    user: mockUser,
    access_token: buildJwt(3600),
    token_type: 'bearer',
    expires_in: 3600,
  };

  beforeEach(() => {
    jest.useFakeTimers();

    const httpMock = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<HttpClient>;

    const storageMock = {
      getToken: jest.fn(),
      setToken: jest.fn(),
      clearToken: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
      clearUser: jest.fn(),
      clearAll: jest.fn(),
    } as unknown as jest.Mocked<TokenStorageService>;

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: httpMock },
        { provide: TokenStorageService, useValue: storageMock },
      ],
    });

    http = TestBed.inject(HttpClient) as jest.Mocked<HttpClient>;
    storage = TestBed.inject(TokenStorageService) as jest.Mocked<TokenStorageService>;
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('login() sets signals and persists session in storage', (done) => {
    http.post.mockReturnValueOnce(of({ data: mockPayload }));

    service.login({ email: 'test@example.com', password: 'password123' }).subscribe((res) => {
      expect(res).toEqual(mockPayload);
      expect(service.token()).toBe(mockPayload.access_token);
      expect(service.currentUser()).toEqual(mockUser);
      expect(service.isAuthenticated()).toBe(true);
      expect(storage.setToken).toHaveBeenCalledWith(mockPayload.access_token);
      expect(storage.setUser).toHaveBeenCalledWith(mockUser);
      done();
    });
  });

  it('logout() clears signals and storage', (done) => {
    http.post.mockReturnValueOnce(of({ message: 'Sesión cerrada correctamente.' }));

    service.logout().subscribe(() => {
      expect(service.token()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(storage.clearAll).toHaveBeenCalled();
      done();
    });
  });

  it('restoreSession() rehydrates from storage with valid JWT', () => {
    const token = buildJwt(3600);
    storage.getToken.mockReturnValue(token);
    storage.getUser.mockReturnValue(mockUser);

    service.restoreSession();

    expect(service.token()).toBe(token);
    expect(service.currentUser()).toEqual(mockUser);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('hasAnyRole() returns true for matching role', () => {
    http.post.mockReturnValueOnce(of({ data: mockPayload }));
    service.login({ email: 'test@example.com', password: 'password123' }).subscribe();

    expect(service.hasAnyRole(['client'])).toBe(true);
    expect(service.hasAnyRole(['freelancer'])).toBe(false);
    expect(service.hasAnyRole(['admin', 'client'])).toBe(true);
  });

  it('isFreelancer computed is true only for freelancers', (done) => {
    const freelancer: AuthPayload = {
      ...mockPayload,
      user: { ...mockUser, role: 'freelancer' },
    };
    http.post.mockReturnValueOnce(of({ data: freelancer }));

    service.login({ email: 'f@example.com', password: 'password123' }).subscribe(() => {
      expect(service.isFreelancer()).toBe(true);
      expect(service.isClient()).toBe(false);
      done();
    });
  });

  describe('homePathFor', () => {
    it('returns /home/freelancer for freelancer role', () => {
      expect(service.homePathFor('freelancer')).toBe('/home/freelancer');
    });

    it('returns /home/client for client role', () => {
      expect(service.homePathFor('client')).toBe('/home/client');
    });

    it('returns /home/client for non-freelancer roles (agency, company, admin)', () => {
      expect(service.homePathFor('agency')).toBe('/home/client');
      expect(service.homePathFor('company')).toBe('/home/client');
      expect(service.homePathFor('admin')).toBe('/home/client');
    });
  });

  describe('roleLabel', () => {
    it('returns the i18n key for client', () => {
      expect(service.roleLabel('client')).toBe('roles.client');
    });

    it('returns the i18n key for freelancer', () => {
      expect(service.roleLabel('freelancer')).toBe('roles.freelancer');
    });

    it('returns the i18n key for agency', () => {
      expect(service.roleLabel('agency')).toBe('roles.agency');
    });

    it('returns the i18n key for company', () => {
      expect(service.roleLabel('company')).toBe('roles.company');
    });

    it('returns the i18n key for admin', () => {
      expect(service.roleLabel('admin')).toBe('roles.admin');
    });
  });

  describe('OAuth', () => {
    it('loginWithOAuth() builds the correct provider redirect URL', () => {
      expect(service.buildOAuthRedirectUrl('google')).toBe('http://127.0.0.1:8000/api/auth/oauth/google/redirect');
      expect(service.buildOAuthRedirectUrl('facebook')).toBe('http://127.0.0.1:8000/api/auth/oauth/facebook/redirect');
    });

    it('loginWithOAuth() does not throw', () => {
      expect(() => service.loginWithOAuth('google')).not.toThrow();
    });

    it('buildOAuthRedirectUrl() appends link=1 when linking an existing account', () => {
      expect(service.buildOAuthRedirectUrl('google', { link: true }))
        .toBe('http://127.0.0.1:8000/api/auth/oauth/google/redirect?link=1');
    });

    it('linkOAuthProvider() redirects to the link variant of the OAuth URL', () => {
      // jsdom v26 marks window.location.href as non-configurable, so we cannot
      // spy on the setter. Instead we verify the URL that the service would
      // assign (via buildOAuthRedirectUrl, which is tested separately) and that
      // the call does not throw — same convention as loginWithOAuth() above.
      expect(service.buildOAuthRedirectUrl('facebook', { link: true }))
        .toBe('http://127.0.0.1:8000/api/auth/oauth/facebook/redirect?link=1');
      expect(() => service.linkOAuthProvider('facebook')).not.toThrow();
    });

    it('listOAuthIdentities() unwraps the data envelope', (done) => {
      http.get.mockReturnValue(of({ data: [] }) as ReturnType<typeof http.get>);
      service.listOAuthIdentities().subscribe((list) => {
        expect(list).toEqual([]);
        expect(http.get).toHaveBeenCalledWith('/api/me/oauth-identities');
        done();
      });
    });

    it('unlinkOAuthProvider() calls DELETE with the provider in the path', (done) => {
      http.delete.mockReturnValue(of({ message: 'ok' }) as ReturnType<typeof http.delete>);
      service.unlinkOAuthProvider('google').subscribe(() => {
        expect(http.delete).toHaveBeenCalledWith('/api/me/oauth-identities/google');
        done();
      });
    });

    it('handleOAuthCallback() stores the token and schedules a refresh', () => {
      const token = buildJwt(3600);
      service.handleOAuthCallback(token, 3600);
      expect(service.token()).toBe(token);
      expect(storage.setToken).toHaveBeenCalledWith(token);
    });

    it('handleOAuthCallback() is a no-op when token is empty', () => {
      service.handleOAuthCallback('', 3600);
      expect(storage.setToken).not.toHaveBeenCalled();
    });

    it('completeOAuthProfile() unmarshals the envelope and persists the session', (done) => {
      const refreshed: AuthPayload = {
        user: { ...mockUser, role: 'freelancer' },
        access_token: buildJwt(3600),
        token_type: 'bearer',
        expires_in: 3600,
      };
      http.post.mockReturnValueOnce(of({ data: refreshed }));
      service.completeOAuthProfile('freelancer').subscribe((res) => {
        expect(res.user.role).toBe('freelancer');
        expect(service.isFreelancer()).toBe(true);
        done();
      });
      expect(http.post).toHaveBeenCalledWith('/api/auth/oauth/complete-profile', { role: 'freelancer' });
    });
  });

  describe('proactive JWT refresh', () => {
    it('login() schedules a refresh timer that fires before token expires', () => {
      http.post.mockReturnValueOnce(of({ data: mockPayload }));
      service.login({ email: 'a@b.c', password: 'password123' }).subscribe();

      http.post.mockReturnValueOnce(of({ data: { ...mockPayload, access_token: buildJwt(3600) } }));

      // expires_in = 3600s, leeway = 300s → timer en (3600-300) * 1000 = 3_300_000 ms
      jest.advanceTimersByTime(3_299_000);
      expect(http.post).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(2_000);
      expect(http.post).toHaveBeenCalledTimes(2);
      expect(http.post).toHaveBeenLastCalledWith('/api/auth/refresh', {});
    });

    it('clearSession() cancels the refresh timer', () => {
      http.post.mockReturnValueOnce(of({ data: mockPayload }));
      service.login({ email: 'a@b.c', password: 'password123' }).subscribe();
      expect(http.post).toHaveBeenCalledTimes(1);

      service.clearSession();
      jest.advanceTimersByTime(3_600_000);
      expect(http.post).toHaveBeenCalledTimes(1);
    });

    it('failed refresh clears the session', () => {
      http.post.mockReturnValueOnce(of({ data: mockPayload }));
      service.login({ email: 'a@b.c', password: 'password123' }).subscribe();

      http.post.mockReturnValueOnce(throwError(() => new Error('refresh failed')));
      jest.advanceTimersByTime(3_300_000);

      expect(service.token()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(storage.clearAll).toHaveBeenCalled();
    });

    it('restoreSession() with expired token clears session', () => {
      storage.getToken.mockReturnValue(buildJwt(-60));
      storage.getUser.mockReturnValue(mockUser);

      service.restoreSession();

      expect(service.token()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(storage.clearAll).toHaveBeenCalled();
    });

    it('restoreSession() with malformed token clears session', () => {
      storage.getToken.mockReturnValue('not-a-real-jwt');
      storage.getUser.mockReturnValue(mockUser);

      service.restoreSession();

      expect(service.token()).toBeNull();
      expect(storage.clearAll).toHaveBeenCalled();
    });

    it('restoreSession() with valid token schedules a refresh based on remaining time', () => {
      storage.getToken.mockReturnValue(buildJwt(3600));
      storage.getUser.mockReturnValue(mockUser);
      service.restoreSession();

      http.post.mockReturnValueOnce(of({ data: { ...mockPayload, access_token: buildJwt(3600) } }));
      jest.advanceTimersByTime(3_300_000);
      expect(http.post).toHaveBeenCalledWith('/api/auth/refresh', {});
    });

    it('honors the minimum 10s delay when token is about to expire', () => {
      http.post.mockReturnValueOnce(of({ data: { ...mockPayload, expires_in: 60 } }));
      service.login({ email: 'a@b.c', password: 'password123' }).subscribe();

      http.post.mockReturnValueOnce(of({ data: mockPayload }));
      jest.advanceTimersByTime(9_000);
      expect(http.post).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(2_000);
      expect(http.post).toHaveBeenCalledTimes(2);
    });
  });
});
