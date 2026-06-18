import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { CoreTopbarComponent } from './topbar.component';
import { AuthService } from '../../services/auth.service';
import { provideLanguageServiceMock } from '../../testing/language-service.mock';
import { User } from '../../types/auth.types';

const clientUser: User = {
  id: 1, name: 'Lucia Marin', email: 'l@e.com', role: 'client', created_at: null,
};

const freelancerUser: User = {
  id: 2, name: 'Diego Foto', email: 'd@e.com', role: 'freelancer', created_at: null,
};

@Component({
  standalone: true,
  imports: [CoreTopbarComponent],
  template: `<app-core-topbar />`,
})
class TestHostComponent {}

describe('CoreTopbarComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let userSignal: ReturnType<typeof signal<User | null>>;
  let routerEvents$: Subject<unknown>;
  let mockRouter: { url: string; events: Subject<unknown>; navigateByUrl: jest.Mock; navigate: jest.Mock };
  let mockActivatedRoute: { snapshot: { data: Record<string, unknown>; firstChild: unknown; queryParamMap: unknown } };
  let mockLogout: jest.Mock;

  const configure = (url: string, routeData: Record<string, unknown> = {}): void => {
    routerEvents$ = new Subject<unknown>();
    mockRouter = {
      url,
      events: routerEvents$.asObservable(),
      navigateByUrl: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
      navigate: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
    };

    mockActivatedRoute = {
      snapshot: {
        data: {},
        firstChild: null,
        queryParamMap: convertToParamMap({}),
      },
    };

    const deepSnapshot = { data: routeData, firstChild: null, queryParamMap: convertToParamMap({}) };
    mockActivatedRoute.snapshot.firstChild = deepSnapshot;

    mockLogout = jest.fn().mockReturnValue({
      subscribe: ({ next }: { next: () => void }) => next?.(),
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: AuthService, useValue: { currentUser: userSignal, logout: mockLogout } },
        provideLanguageServiceMock('es', {
          app: { brand: 'FrameMatch' },
          topbar: {
            go_home: 'Ir al inicio',
            logout: 'Cerrar sesión',
            menu_open: 'Abrir menú',
            menu_close: 'Cerrar menú',
            menu_label: 'Menú de navegación',
            back_to_briefs: '← Briefs',
            back_to_catalog: '← Volver al catálogo',
            back_to_home: '← Inicio',
            nav: {
              home: 'Inicio',
              login: 'Iniciar sesión',
              register: 'Registrarse',
              professionals: 'Profesionales',
              briefs: 'Briefs',
              new_brief: '+ Nuevo Brief',
              profile: 'Mi perfil',
              portfolio: 'Portfolio',
              account: 'Mi cuenta',
            },
          },
          roles: { client: 'Cliente', freelancer: 'Profesional' },
          avatar: { preview_alt: 'Avatar de {{name}}' },
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  };

  const emitNavigationEnd = (): void => {
    routerEvents$.next(new NavigationEnd(0, mockRouter.url, mockRouter.url));
    fixture.detectChanges();
  };

  beforeEach(() => {
    userSignal = signal<User | null>(null);
  });

  it('auto-detects public variant on /freelancers when not authenticated', () => {
    configure('/freelancers');
    emitNavigationEnd();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Profesionales');
    expect(text).toContain('Briefs');
    expect(text).toContain('Iniciar sesión');
    expect(text).toContain('Registrarse');
    expect(text).not.toContain('Cerrar sesión');
  });

  it('auto-detects auth variant on /login', () => {
    configure('/login');
    emitNavigationEnd();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Iniciar sesión');
    expect(text).not.toContain('Cerrar sesión');
    expect(text).toContain('FrameMatch');
  });

  it('auto-detects client variant on /home when authenticated as client', () => {
    userSignal.set(clientUser);
    configure('/home');
    emitNavigationEnd();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Inicio');
    expect(text).toContain('Profesionales');
    expect(text).toContain('Briefs');
    expect(text).toContain('+ Nuevo Brief');
    expect(text).toContain('Mi cuenta');
    expect(text).toContain('Lucia Marin');
    expect(text).toContain('Cliente');
    expect(text).toContain('Cerrar sesión');
  });

  it('auto-detects freelancer variant on /home when authenticated as freelancer', () => {
    userSignal.set(freelancerUser);
    configure('/home');
    emitNavigationEnd();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Inicio');
    expect(text).toContain('Profesionales');
    expect(text).toContain('Briefs');
    expect(text).toContain('Mi perfil');
    expect(text).toContain('Portfolio');
    expect(text).toContain('Mi cuenta');
    expect(text).toContain('Diego Foto');
    expect(text).toContain('Cerrar sesión');
  });

  it('handles logout by calling auth.logout and navigating to /', () => {
    userSignal.set(clientUser);
    configure('/home');
    emitNavigationEnd();
    const logoutBtn = (fixture.nativeElement as HTMLElement).querySelector('.logout-btn') as HTMLButtonElement;
    expect(logoutBtn).toBeTruthy();
    logoutBtn?.click();
    fixture.detectChanges();
    expect(mockLogout).toHaveBeenCalled();
  });

  it('renders back link from route data', () => {
    configure('/briefs/1', { backLink: '/briefs' });
    emitNavigationEnd();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('← Briefs');
  });

  it('renders back link to catalog from route data', () => {
    configure('/freelancers/1', { backLink: '/freelancers' });
    emitNavigationEnd();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('← Volver al catálogo');
  });

  it('resolves /home back link to role-specific path', () => {
    userSignal.set(freelancerUser);
    configure('/freelancer/profile/edit', { backLink: '/home' });
    emitNavigationEnd();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('← Inicio');
  });

  it('toggles mobile menu on hamburger click', () => {
    userSignal.set(clientUser);
    configure('/home');
    emitNavigationEnd();

    const hamburger = (fixture.nativeElement as HTMLElement).querySelector('.hamburger') as HTMLButtonElement;
    expect(hamburger).toBeTruthy();

    hamburger?.click();
    fixture.detectChanges();

    const panel = (fixture.nativeElement as HTMLElement).querySelector('.mobile-panel');
    expect(panel).toBeTruthy();

    const overlay = (fixture.nativeElement as HTMLElement).querySelector('.mobile-overlay');
    expect(overlay).toBeTruthy();
  });

  it('closes mobile menu when overlay is clicked', () => {
    userSignal.set(clientUser);
    configure('/home');
    emitNavigationEnd();

    const hamburger = (fixture.nativeElement as HTMLElement).querySelector('.hamburger') as HTMLButtonElement;
    hamburger?.click();
    fixture.detectChanges();

    const overlay = (fixture.nativeElement as HTMLElement).querySelector('.mobile-overlay') as HTMLElement;
    overlay?.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.mobile-panel')).toBeFalsy();
  });

  it('closes mobile menu on Escape key', () => {
    userSignal.set(clientUser);
    configure('/home');
    emitNavigationEnd();

    const hamburger = (fixture.nativeElement as HTMLElement).querySelector('.hamburger') as HTMLButtonElement;
    hamburger?.click();
    fixture.detectChanges();

    const panel = (fixture.nativeElement as HTMLElement).querySelector('.mobile-panel') as HTMLElement;
    panel?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.mobile-panel')).toBeFalsy();
  });

  it('computes initials from the user name', () => {
    userSignal.set(freelancerUser);
    configure('/home');
    emitNavigationEnd();
    const avatar = (fixture.nativeElement as HTMLElement).querySelector('.avatar');
    expect(avatar?.textContent?.trim()).toBe('DF');
  });

  it('hides on landing route /', () => {
    configure('/');
    emitNavigationEnd();
    expect((fixture.nativeElement as HTMLElement).querySelector('.topbar')).toBeFalsy();
  });

  it('hides on briefs list route /briefs', () => {
    configure('/briefs');
    emitNavigationEnd();
    expect((fixture.nativeElement as HTMLElement).querySelector('.topbar')).toBeFalsy();
  });

  it('shows on /briefs/123 (detail page)', () => {
    configure('/briefs/1', { backLink: '/briefs' });
    emitNavigationEnd();
    expect((fixture.nativeElement as HTMLElement).querySelector('.topbar')).toBeTruthy();
  });
});
