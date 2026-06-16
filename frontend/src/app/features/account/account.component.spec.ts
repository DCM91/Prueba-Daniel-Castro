import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { AccountComponent } from './account.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/types/auth.types';
import { provideLanguageServiceMock } from '../../core/testing/language-service.mock';

describe('AccountComponent', () => {
  let component: AccountComponent;
  let fixture: ComponentFixture<AccountComponent>;
  let httpMock: HttpTestingController;

  const baseUser: User = {
    id: 7,
    name: 'Ana Cliente',
    email: 'ana@example.com',
    phone: null,
    city: null,
    role: 'client',
    created_at: '2026-06-14T00:00:00+00:00',
  };

  const freelancerUser: User = {
    ...baseUser,
    id: 8,
    role: 'freelancer',
  };

  function mockAuth(user: User | null) {
    const currentUser = signal<User | null>(user);
    return {
      provide: AuthService,
      useValue: {
        currentUser,
        setCurrentUser: jest.fn((u: User) => currentUser.set(u)),
        logout: jest.fn(),
      },
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        mockAuth(baseUser),
        provideLanguageServiceMock('es', {
          account: {
            title: 'Mi cuenta',
            section_personal: 'Datos personales',
            section_professional: 'Perfil profesional',
            save_changes: 'Guardar cambios',
            cancel: 'Cancelar',
            success: 'Datos actualizados.',
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders the personal section for clients without professional link', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Mi cuenta');
    expect(text).toContain('Datos personales');
    expect(text).not.toContain('Perfil profesional');
  });

  it('prefills the form with the current user values', () => {
    expect(component.form.controls.name.value).toBe('Ana Cliente');
    expect(component.form.controls.email.value).toBe('ana@example.com');
    expect(component.form.controls.phone.value).toBe('');
    expect(component.form.controls.city.value).toBe('');
  });

  it('PUTs /api/me on submit, refreshes the auth user and shows success', () => {
    component.form.setValue({
      name: 'Ana Editada',
      email: 'ana.new@example.com',
      phone: '+34 600 000 000',
      city: 'Madrid',
    });

    component.submit();

    const req = httpMock.expectOne('/api/me');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      name: 'Ana Editada',
      email: 'ana.new@example.com',
      phone: '+34 600 000 000',
      city: 'Madrid',
    });
    req.flush({
      data: {
        ...baseUser,
        name: 'Ana Editada',
        email: 'ana.new@example.com',
        phone: '+34 600 000 000',
        city: 'Madrid',
      },
    });

    const auth = TestBed.inject(AuthService);
    expect(auth.setCurrentUser).toHaveBeenCalled();
    expect(component.submitting()).toBe(false);
    expect(component.savedAt()).not.toBeNull();
  });

  it('converts empty phone/city to null in the payload', () => {
    component.form.setValue({
      name: 'Ana',
      email: 'ana@example.com',
      phone: '   ',
      city: '',
    });

    component.submit();
    const req = httpMock.expectOne('/api/me');
    expect(req.request.body).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      phone: null,
      city: null,
    });
    req.flush({ data: baseUser });
  });

  it('shows server-side validation errors', () => {
    component.form.setValue({
      name: 'Ana',
      email: 'taken@example.com',
      phone: '',
      city: '',
    });

    component.submit();
    const req = httpMock.expectOne('/api/me');
    req.flush(
      {
        message: 'Datos inválidos.',
        errors: { email: ['Este email ya está en uso por otra cuenta.'] },
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(component.fieldErrors()['email']?.[0]).toContain('Este email');
    expect(component.errorMessage()).toBe('Datos inválidos.');
    expect(component.submitting()).toBe(false);
  });

  it('renders the professional link only for freelancers', () => {
    TestBed.resetTestingModule();
    const userSignal = signal<User | null>(freelancerUser);
    TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: userSignal,
            setCurrentUser: jest.fn((u: User) => userSignal.set(u)),
            logout: jest.fn(),
          },
        },
        provideLanguageServiceMock('es', {
          account: {
            section_professional: 'Perfil profesional',
            open_professional_editor: 'Editar perfil profesional',
          },
        }),
      ],
    }).compileComponents();

    const freelancerFixture = TestBed.createComponent(AccountComponent);
    freelancerFixture.detectChanges();
    const text = freelancerFixture.nativeElement.textContent ?? '';
    expect(text).toContain('Perfil profesional');
    expect(text).toContain('Editar perfil profesional');
  });
});
