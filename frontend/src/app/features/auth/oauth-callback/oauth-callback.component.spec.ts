import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';

import { OAuthCallbackComponent } from './oauth-callback.component';
import { AuthService } from '../../../core/services/auth.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import { User } from '../../../core/types/auth.types';

describe('OAuthCallbackComponent', () => {
  let component: OAuthCallbackComponent;
  let fixture: ComponentFixture<OAuthCallbackComponent>;
  let handleOAuthCallback: jest.Mock;
  let fetchCurrentUser: jest.Mock;
  let navigate: jest.Mock;
  let routerNavigate: jest.Mock;

  const configure = (params: Record<string, string>) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [OAuthCallbackComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(params) } },
        },
        {
          provide: Router,
          useValue: { navigate: routerNavigate },
        },
        {
          provide: AuthService,
          useValue: {
            handleOAuthCallback,
            fetchCurrentUser,
          },
        },
        provideLanguageServiceMock('es', {
          auth: {
            oauth: {
              callback_processing: 'Conectando con tu cuenta…',
              error_provider_denied: 'Cancelaste el inicio de sesión.',
              error_callback_failed: 'No se pudo completar la autenticación. Inténtalo de nuevo.',
            },
          },
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OAuthCallbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    handleOAuthCallback = jest.fn();
    fetchCurrentUser = jest.fn();
    routerNavigate = jest.fn().mockResolvedValue(true);
    navigate = jest.fn();
  });

  it('stores the token, fetches the user, and navigates to /home on success', () => {
    fetchCurrentUser.mockReturnValue(of({ id: 1, name: 'Lucia', email: 'l@e.com', role: 'client', created_at: null } as User));
    configure({ token: 'jwt-abc', expires_in: '3600', new_user: '0' });
    expect(handleOAuthCallback).toHaveBeenCalledWith('jwt-abc', 3600);
    expect(routerNavigate).toHaveBeenCalledWith(['/home']);
  });

  it('redirects to /auth/complete-profile when new_user=1', () => {
    configure({ token: 'jwt-abc', expires_in: '3600', new_user: '1' });
    expect(handleOAuthCallback).toHaveBeenCalledWith('jwt-abc', 3600);
    expect(routerNavigate).toHaveBeenCalledWith(['/auth/complete-profile']);
  });

  it('shows an error when no token is present', () => {
    configure({});
    expect(component.error).toBe('auth.oauth.error_callback_failed');
  });

  it('shows a provider-denied error when error=access_denied', () => {
    configure({ error: 'access_denied' });
    expect(component.error).toBe('auth.oauth.error_provider_denied');
  });
});
