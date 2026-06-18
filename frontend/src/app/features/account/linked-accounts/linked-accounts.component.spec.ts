import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';

import { AuthService } from '../../../core/services/auth.service';
import { OAuthIdentity, User } from '../../../core/types/auth.types';

import { LinkedAccountsComponent } from './linked-accounts.component';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'client',
    created_at: '2026-01-01T00:00:00Z',
    avatar_url: null,
    avatar_urls: null,
    has_password: true,
    oauth_only: false,
    ...overrides,
  };
}

function makeIdentity(overrides: Partial<OAuthIdentity> = {}): OAuthIdentity {
  return {
    id: 1,
    provider: 'google',
    provider_label: 'Google',
    provider_email: 'test.google@example.com',
    linked_at: '2026-06-01T00:00:00Z',
    last_used_at: '2026-06-10T00:00:00Z',
    token_expires_at: null,
    has_refresh_token: true,
    ...overrides,
  };
}

describe('LinkedAccountsComponent', () => {
  let fixture: ComponentFixture<LinkedAccountsComponent>;
  let component: LinkedAccountsComponent;
  let listMock: jest.Mock;
  let unlinkMock: jest.Mock;
  let linkProviderMock: jest.Mock;
  let meMock: jest.Mock;
  let setCurrentUserMock: jest.Mock;

  beforeEach(async () => {
    listMock = jest.fn().mockReturnValue(of([]));
    unlinkMock = jest.fn().mockReturnValue(of({ message: 'Cuenta desvinculada.' }));
    linkProviderMock = jest.fn();
    meMock = jest.fn().mockReturnValue(of({ data: makeUser() }));
    setCurrentUserMock = jest.fn();

    await TestBed.configureTestingModule({
      imports: [LinkedAccountsComponent, TranslatePipe],
      providers: [
        provideLanguageServiceMock('es', {
          account: {
            section_oauth: 'Cuentas conectadas',
            section_oauth_hint: 'Inicia sesión más rápido.',
            oauth_link_google: 'Conectar con Google',
            oauth_link_facebook: 'Conectar con Facebook',
            oauth_unlink: 'Desvincular',
            oauth_unlink_confirm: '¿Desvincular {{provider}}?',
            oauth_linked_on: 'Vinculada el {{date}}',
            oauth_last_used: 'Último uso: {{date}}',
            oauth_never_used: 'Vinculada pero nunca usada',
            oauth_provider_email: 'Email en {{provider}}: {{email}}',
            oauth_no_accounts: 'No tienes cuentas externas vinculadas.',
            oauth_loading: 'Cargando…',
            oauth_error_load: 'No se pudieron cargar las cuentas conectadas.',
            oauth_error_unlink: 'No se pudo desvincular la cuenta.',
            oauth_linked_success: 'Vinculada correctamente.',
            oauth_linked_error: 'No se pudo vincular: {{reason}}',
            oauth_only_warning: 'Tu cuenta solo se accede con proveedores externos.',
          },
        }),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => makeUser(),
            listOAuthIdentities: listMock,
            unlinkOAuthProvider: unlinkMock,
            linkOAuthProvider: linkProviderMock,
            me: meMock,
            setCurrentUser: setCurrentUserMock,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LinkedAccountsComponent);
    component = fixture.componentInstance;
  });

  it('renders one row per supported provider', () => {
    listMock.mockReturnValue(of([makeIdentity()]));
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-test^="linked-account-"]');
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute('data-provider')).toBe('google');
    expect(rows[1].getAttribute('data-provider')).toBe('facebook');
  });

  it('shows connect CTA when provider is not linked', () => {
    listMock.mockReturnValue(of([]));
    fixture.detectChanges();

    const googleRow = fixture.nativeElement.querySelector('[data-test="linked-account-google"]');
    const connectButton = googleRow.querySelector('button.linked-accounts__btn--primary');
    expect(connectButton?.textContent).toContain('Conectar con Google');
  });

  it('shows unlink CTA when provider is linked', () => {
    listMock.mockReturnValue(of([makeIdentity({ provider: 'google' })]));
    fixture.detectChanges();

    const googleRow = fixture.nativeElement.querySelector('[data-test="linked-account-google"]');
    const unlinkButton = googleRow.querySelector('button.linked-accounts__btn--danger');
    expect(unlinkButton?.textContent).toContain('Desvincular');
  });

  it('shows last-used hint for an identity that has been used', () => {
    listMock.mockReturnValue(of([
      makeIdentity({ last_used_at: '2026-06-10T00:00:00Z' }),
    ]));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Último uso');
  });

  it('falls back to never-used when last_used_at is null', () => {
    listMock.mockReturnValue(of([
      makeIdentity({ last_used_at: null }),
    ]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Vinculada pero nunca usada');
  });

  it('shows oauth-only warning when user is OAuth-only', () => {
    const oauthOnlyUser = makeUser({ has_password: false, oauth_only: true, oauth_identities: [makeIdentity()] });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LinkedAccountsComponent, TranslatePipe],
      providers: [
        provideLanguageServiceMock('es', { account: { oauth_only_warning: 'OAuth only' } }),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => oauthOnlyUser,
            listOAuthIdentities: listMock,
            unlinkOAuthProvider: unlinkMock,
            linkOAuthProvider: linkProviderMock,
            me: meMock,
            setCurrentUser: setCurrentUserMock,
          },
        },
      ],
    }).compileComponents();

    const f2 = TestBed.createComponent(LinkedAccountsComponent);
    f2.detectChanges();
    expect(f2.nativeElement.textContent).toContain('OAuth only');
  });

  it('surfaces error when listing identities fails', () => {
    listMock.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar');
  });

  it('calls AuthService.unlinkOAuthProvider when confirmed', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    listMock.mockReturnValue(of([makeIdentity({ provider: 'google' })]));
    fixture.detectChanges();

    component.unlink({ provider: 'google', identity: makeIdentity() });

    expect(confirmSpy).toHaveBeenCalled();
    expect(unlinkMock).toHaveBeenCalledWith('google');

    confirmSpy.mockRestore();
  });

  it('does not call unlink when user cancels', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    listMock.mockReturnValue(of([makeIdentity({ provider: 'google' })]));
    fixture.detectChanges();

    component.unlink({ provider: 'google', identity: makeIdentity() });

    expect(unlinkMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('surfaces error when unlink fails', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    unlinkMock.mockReturnValue(throwError(() => ({ status: 500 })));
    listMock.mockReturnValue(of([makeIdentity({ provider: 'google' })]));
    fixture.detectChanges();

    component.unlink({ provider: 'google', identity: makeIdentity() });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo desvincular');
  });

  it('calls AuthService.linkOAuthProvider when linking a provider', () => {
    listMock.mockReturnValue(of([]));
    fixture.detectChanges();

    component.linkProvider('google');

    expect(linkProviderMock).toHaveBeenCalledWith('google');
  });
});
