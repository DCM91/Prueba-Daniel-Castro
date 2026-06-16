import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ClientHomeComponent } from './client-home.component';
import { AuthService } from '../../../core/services/auth.service';
import { FreelancerCatalogService } from '../../../core/services/freelancer-catalog.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import { FreelancerCard, User } from '../../../core/types/auth.types';

describe('ClientHomeComponent', () => {
  let component: ClientHomeComponent;
  let fixture: ComponentFixture<ClientHomeComponent>;
  let searchMock: jest.Mock;

  const mockUser: User = {
    id: 1,
    name: 'Ana Cliente',
    email: 'ana@example.com',
    role: 'client',
    created_at: null,
  };

  const sampleCard: FreelancerCard = {
    id: 1, user_id: 7, display_name: 'Lucia', city: 'Madrid',
    hourly_rate: 55, is_available: true, top_skills: [], skills_count: 1, profile_completion: 70,
  };

  const configure = (cards: FreelancerCard[] = [sampleCard, sampleCard, sampleCard]) => {
    searchMock = jest.fn().mockReturnValue(of({
      data: cards,
      meta: { current_page: 1, last_page: 1, per_page: 12, total: cards.length },
    }));

    TestBed.configureTestingModule({
      imports: [ClientHomeComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => mockUser,
            roleLabel: (role: string) => role,
            logout: () => ({ subscribe: () => undefined }),
          },
        },
        {
          provide: FreelancerCatalogService,
          useValue: { search: searchMock },
        },
        provideLanguageServiceMock('es', {
          roles: { client: 'Cliente', freelancer: 'Profesional' },
          topbar: { logout: 'Cerrar sesión' },
          home: {
            client: {
              hero_title: 'Encuentra al profesional perfecto para tu proyecto.',
              featured_title: 'Profesionales destacados',
              featured_loading: 'Cargando profesionales…',
              featured_empty: 'No hay profesionales destacados.',
              view_all: 'Ver todos los profesionales',
            },
          },
          skill_categories: { photo: 'Fotografía', video: 'Vídeo', edit: 'Edición', content: 'Creación de Contenido' },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('renders the welcome hero with the user name in the topbar', () => {
    configure();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ana Cliente');
  });

  it('shows the search input', () => {
    configure();
    const input = (fixture.nativeElement as HTMLElement).querySelector('.search input');
    expect(input).toBeTruthy();
  });

  it('exposes exactly 4 categories mapped to backend SkillCategory', () => {
    configure();
    expect(component.categories.length).toBe(4);
    expect(component.categories.map((c) => c.category)).toEqual(['photo', 'video', 'edit', 'content']);
  });

  it('shows the "Cerrar sesión" button', () => {
    configure();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.logout');
    expect(btn?.textContent?.trim()).toBe('Cerrar sesión');
  });

  it('loads up to 6 featured freelancers on init', () => {
    const cards = Array.from({ length: 8 }, (_, i) => ({ ...sampleCard, id: i + 1 }));
    configure(cards);
    expect(searchMock).toHaveBeenCalledWith({ sort: 'featured' });
    expect(component.featured().length).toBe(6);
  });

  it('renders the featured grid when there are results', () => {
    const cards = [sampleCard, sampleCard, sampleCard];
    configure(cards);
    const grid = (fixture.nativeElement as HTMLElement).querySelector('.featured-grid');
    expect(grid).toBeTruthy();
  });

  it('hides the featured grid when the catalog returns empty', () => {
    configure([]);
    const grid = (fixture.nativeElement as HTMLElement).querySelector('.featured-grid');
    expect(grid).toBeFalsy();
  });
});
