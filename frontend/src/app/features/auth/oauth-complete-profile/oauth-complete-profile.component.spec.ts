import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { OAuthCompleteProfileComponent } from './oauth-complete-profile.component';
import { AuthService } from '../../../core/services/auth.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import { User } from '../../../core/types/auth.types';

describe('OAuthCompleteProfileComponent', () => {
  let component: OAuthCompleteProfileComponent;
  let fixture: ComponentFixture<OAuthCompleteProfileComponent>;
  let completeOAuthProfile: jest.Mock;
  let routerNavigate: jest.Mock;
  const currentUser = signal<User | null>({
    id: 1, name: 'Lucia', email: 'l@e.com', role: 'client', created_at: null,
  });

  const configure = () => {
    TestBed.configureTestingModule({
      imports: [OAuthCompleteProfileComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        {
          provide: AuthService,
          useValue: {
            currentUser: currentUser,
            completeOAuthProfile,
          },
        },
        provideLanguageServiceMock('es', {
          auth: {
            oauth: {
              complete_profile_title: 'Elige tu rol',
              complete_profile_subtitle: 'Último paso',
              submit_role: 'Continuar',
              submitting_role: 'Guardando…',
            },
            register: {
              role_client_title: 'Cliente',
              role_client_body: 'Necesito un profesional.',
              role_freelancer_title: 'Profesional',
              role_freelancer_body: 'Ofrezco mis servicios.',
            },
          },
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OAuthCompleteProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    completeOAuthProfile = jest.fn();
    routerNavigate = jest.fn().mockResolvedValue(true);
  });

  it('renders the role selector with the i18n labels', () => {
    configure();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Elige tu rol');
    expect(text).toContain('Cliente');
    expect(text).toContain('Profesional');
  });

  it('submits the selected role and calls completeOAuthProfile', () => {
    configure();
    completeOAuthProfile.mockReturnValue(of({
      user: { id: 1, name: 'L', email: 'l@e.com', role: 'freelancer', created_at: null } as User,
      access_token: 't', token_type: 'bearer', expires_in: 3600,
    }));
    component.form.controls.role.setValue('freelancer');
    component.submit();
    expect(completeOAuthProfile).toHaveBeenCalledWith('freelancer');
  });

  it('shows an error when the server rejects the role', () => {
    configure();
    completeOAuthProfile.mockReturnValue(throwError(() => ({ error: { message: 'Rol inválido' } })));
    component.form.controls.role.setValue('client');
    component.submit();
    expect(component.errorMessage()).toBe('Rol inválido');
  });
});
