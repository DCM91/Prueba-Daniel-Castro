import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';

import { CoreTopbarComponent, TopbarBackLink, TopbarVariant } from './topbar.component';
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
  template: `
    <app-core-topbar
      [variant]="variant"
      [backLink]="backLink"
      (logoutClick)="onLogout()"
      (backClick)="onBack()"
    />
  `,
})
class TestHostComponent {
  variant: TopbarVariant = 'public';
  backLink: TopbarBackLink | null = null;
  logoutCount = 0;
  backCount = 0;
  onLogout(): void { this.logoutCount++; }
  onBack(): void { this.backCount++; }
}

describe('CoreTopbarComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let userSignal: ReturnType<typeof signal<User | null>>;

  const render = (variant: TopbarVariant, backLink: TopbarBackLink | null = null): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: AuthService, useValue: { currentUser: userSignal } },
        provideLanguageServiceMock('es', {
          app: { brand: 'FrameMatch' },
          topbar: {
            go_home: 'Ir al inicio',
            logout: 'Cerrar sesión',
            back_to_briefs: '← Briefs',
            back_to_catalog: '← Catálogo',
            back_to_home: '← Inicio',
            nav: {
              home: 'Inicio',
              professionals: 'Profesionales',
              briefs: 'Briefs',
              profile: 'Mi perfil',
            },
          },
          roles: { client: 'Cliente', freelancer: 'Profesional' },
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    host.variant = variant;
    host.backLink = backLink;
    fixture.detectChanges();
  };

  beforeEach(() => {
    userSignal = signal<User | null>(null);
  });

  it('public variant: brand + lang visible, no nav, no user', () => {
    render('public');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('FrameMatch');
    expect(text).not.toContain('Cerrar sesión');
    expect(text).not.toContain('Inicio');
  });

  it('auth variant: brand + lang visible, no nav, no user, no back', () => {
    render('auth');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('FrameMatch');
    expect(text).not.toContain('Cerrar sesión');
    expect(text).not.toContain('Inicio');
  });

  it('client variant: 3 nav links (Inicio, Profesionales, Briefs) + user-name + role-pill + logout', () => {
    userSignal.set(clientUser);
    render('client');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Inicio');
    expect(text).toContain('Profesionales');
    expect(text).toContain('Briefs');
    expect(text).toContain('Lucia Marin');
    expect(text).toContain('Cliente');
    expect(text).toContain('Cerrar sesión');
  });

  it('freelancer variant: 2 nav links (Inicio, Mi perfil) + avatar + logout (no role-pill)', () => {
    userSignal.set(freelancerUser);
    render('freelancer');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Inicio');
    expect(text).toContain('Mi perfil');
    expect(text).toContain('DF');
    expect(text).toContain('Cerrar sesión');
    expect(text).not.toContain('Profesional');
  });

  it('renders the back button with the labelKey when backLink is set', () => {
    render('public', { labelKey: 'topbar.back_to_briefs', route: '/briefs' });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('← Briefs');
  });

  it('emits logoutClick when the logout button is clicked', () => {
    userSignal.set(clientUser);
    render('client');
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.logout');
    expect(btn).toBeTruthy();
    btn?.click();
    expect(host.logoutCount).toBe(1);
  });

  it('emits backClick when the back button is clicked', () => {
    render('public', { labelKey: 'topbar.back_to_briefs', route: '/briefs' });
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.back');
    expect(btn).toBeTruthy();
    btn?.click();
    expect(host.backCount).toBe(1);
  });

  it('hides the user area when currentUser is null even on client variant', () => {
    render('client');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Inicio');
    expect(text).not.toContain('Cerrar sesión');
  });

  it('hides the nav when extraLinks is empty (default on public/auth variants)', () => {
    render('public');
    const nav = (fixture.nativeElement as HTMLElement).querySelector('.topbar-nav');
    expect(nav).toBeFalsy();
  });

  it('computes initials from the user name (max 2 chars, uppercased)', () => {
    userSignal.set(freelancerUser);
    render('freelancer');
    const avatar = (fixture.nativeElement as HTMLElement).querySelector('.avatar');
    expect(avatar?.textContent?.trim()).toBe('DF');
  });
});
