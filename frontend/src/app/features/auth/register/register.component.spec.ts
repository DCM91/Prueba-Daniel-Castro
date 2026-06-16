import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { RegisterComponent } from './register.component';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        provideLanguageServiceMock('es', {
          auth: {
            register: {
              error_generic: 'No se pudo completar el registro.',
            },
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    fixture.detectChanges();
  });

  it('initial role defaults to client', () => {
    expect(component.selectedRole()).toBe('client');
  });

  it('selectRole updates the selected role and form value', () => {
    component.selectRole('freelancer');
    expect(component.selectedRole()).toBe('freelancer');
    expect(component.form.controls.role.value).toBe('freelancer');
  });

  it('rejects role values not in client/freelancer (server-side enforcement)', () => {
    component.form.setValue({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'password123',
      password_confirmation: 'password123',
      role: 'admin',
    });

    component.submit();

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.body.role).toBe('admin');
    req.flush(
      { message: 'The given data was invalid.', errors: { role: ['Invalid role.'] } },
      { status: 422, statusText: 'Unprocessable Entity' }
    );

    expect(component.errorMessage()).toBe('Invalid role.');
  });

  it('blocks submit when password_confirmation does not match', () => {
    component.form.setValue({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'password123',
      password_confirmation: 'different',
      role: 'client',
    });

    component.submit();
    httpMock.expectNone('/api/auth/register');
    expect(component.form.touched).toBe(true);
  });

  it('submits valid payload and navigates to dashboard', () => {
    component.form.setValue({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'password123',
      password_confirmation: 'password123',
      role: 'freelancer',
    });

    component.submit();

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.body).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'password123',
      password_confirmation: 'password123',
      role: 'freelancer',
    });
    req.flush({
      data: {
        user: { id: 1, name: 'Ana', email: 'ana@example.com', role: 'freelancer', created_at: null },
        access_token: 'tok',
        token_type: 'bearer',
        expires_in: 3600,
      },
    });

    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('shows server validation error message on 422', () => {
    component.form.setValue({
      name: 'Ana',
      email: 'duplicada@example.com',
      password: 'password123',
      password_confirmation: 'password123',
      role: 'client',
    });

    component.submit();

    const req = httpMock.expectOne('/api/auth/register');
    req.flush(
      { message: 'The given data was invalid.', errors: { email: ['El email ya está en uso.'] } },
      { status: 422, statusText: 'Unprocessable Entity' }
    );

    expect(component.errorMessage()).toBe('El email ya está en uso.');
  });
});
