import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { BriefsSubBarComponent, BriefsScope } from './briefs-sub-bar.component';
import { provideLanguageServiceMock } from '../../testing/language-service.mock';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { User } from '../../types/auth.types';

@Component({
  standalone: true,
  imports: [BriefsSubBarComponent],
  template: `
    <app-briefs-sub-bar
      [scope]="scope"
      [currentUser]="user"
      (scopeChange)="onScopeChange($event)"
    />
  `,
})
class TestHostComponent {
  scope: BriefsScope = 'all';
  user: User | null = null;
  lastEmitted: BriefsScope | null = null;

  onScopeChange(scope: BriefsScope): void {
    this.lastEmitted = scope;
  }
}

describe('BriefsSubBarComponent', () => {
  let host: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  const configure = (user: User | null): void => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent, TranslatePipe],
      providers: [
        provideRouter([]),
        provideLanguageServiceMock('es', {
          briefs: {
            list: {
              scope_all: 'Todos',
              scope_mine: 'Mis proyectos',
              new_brief: '+ Nuevo proyecto',
              sub_bar_aria: 'Filtros y acciones de proyectos',
            },
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    host.user = user;
    fixture.detectChanges();
  };

  it('renders only the "Todos" tab for anonymous users', () => {
    configure(null);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Todos');
    expect(text).not.toContain('Mis proyectos');
    expect(text).not.toContain('+ Nuevo proyecto');
  });

  it('renders both tabs and the CTA for client users', () => {
    configure({ id: 1, name: 'Cliente', email: 'c@e.com', role: 'client', created_at: null });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Todos');
    expect(text).toContain('Mis proyectos');
    expect(text).toContain('+ Nuevo proyecto');
  });

  it('hides the "Mis proyectos" tab and the CTA for freelancer users', () => {
    configure({ id: 2, name: 'Pro', email: 'p@e.com', role: 'freelancer', created_at: null });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Todos');
    expect(text).not.toContain('Mis proyectos');
    expect(text).not.toContain('+ Nuevo proyecto');
  });

  it('emits scopeChange when the "Mis proyectos" tab is clicked', () => {
    configure({ id: 1, name: 'Cliente', email: 'c@e.com', role: 'client', created_at: null });
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('.sub-bar__tab');
    (buttons[1] as HTMLButtonElement).click();
    expect(host.lastEmitted).toBe('mine');
  });

  it('does not emit scopeChange when the already-active tab is clicked', () => {
    configure({ id: 1, name: 'Cliente', email: 'c@e.com', role: 'client', created_at: null });
    host.scope = 'all';
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('.sub-bar__tab');
    (buttons[0] as HTMLButtonElement).click();
    expect(host.lastEmitted).toBeNull();
  });
});
