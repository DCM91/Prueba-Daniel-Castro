import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { LoginComponent } from './login.component';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideLanguageServiceMock('es', {
          auth: {
            login: {
              error_generic: 'No se pudo iniciar sesión.',
            },
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockImplementation(() => Promise.resolve(true));
    fixture.detectChanges();
  });

  it('marks form as touched when submitting invalid form', () => {
    component.submit();
    expect(component.form.touched).toBe(true);
  });

  it('submits valid credentials and navigates to /home', () => {
    component.form.setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    component.submit();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({
      data: {
        user: { id: 1, name: 'T', email: 'test@example.com', role: 'client', created_at: null },
        access_token: 'tok',
        token_type: 'bearer',
        expires_in: 3600,
      },
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('shows server error message on 401', () => {
    component.form.setValue({
      email: 'bad@example.com',
      password: 'wrong',
    });

    component.submit();

    const req = httpMock.expectOne('/api/auth/login');
    req.flush({ message: 'Credenciales inválidas.' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.errorMessage()).toBe('Credenciales inválidas.');
    expect(component.submitting()).toBe(false);
  });
});
