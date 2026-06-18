import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { FreelancerDetailComponent } from './freelancer-detail.component';
import { FreelancerCatalogService } from '../../../core/services/freelancer-catalog.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import { FreelancerDetail } from '../../../core/types/auth.types';

describe('FreelancerDetailComponent', () => {
  let component: FreelancerDetailComponent;
  let fixture: ComponentFixture<FreelancerDetailComponent>;
  let getByIdMock: jest.Mock;

  const detail: FreelancerDetail = {
    id: 1, user_id: 7,
    display_name: 'Lucia Marin Foto',
    bio: 'Bio de prueba con mas de 240 caracteres para que aparezca el boton de ver mas. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    city: 'Madrid',
    hourly_rate: 55,
    price_per_project: 420,
    is_available: true,
    created_at: '2026-01-15T00:00:00.000Z',
    skills: [
      { id: 1, name: 'Foto producto', slug: 'foto-producto', category: 'photo', level: 'senior', years_experience: 5 },
      { id: 2, name: 'Edicion',       slug: 'edicion',       category: 'edit',  level: 'mid',    years_experience: 3 },
    ],
  };

  const lang = provideLanguageServiceMock('es', {
    'freelancers.detail': {
      loading: 'Cargando perfil…',
      not_found_title: 'Perfil no disponible',
      not_found_body: 'No hemos encontrado este profesional.',
      back_btn: 'Volver al catálogo',
      rate_consult: 'Consultar',
      rate_project_fallback: 'A convenir',
      rate_project_value: '{{price}}€ por proyecto',
      bio_title: 'Sobre mí',
      skills_title: 'Skills',
      available: 'Disponible',
      busy: 'Ocupado',
      member_since: 'Miembro desde {{date}}',
      skill_years_one: '{{n}} año',
      skill_years_other: '{{n}} años',
    },
    'topbar.back_to_catalog': '← Volver al catálogo',
    'freelancers.card.initials_fallback': '?',
    'skill_levels': { junior: 'Junior', mid: 'Mid', senior: 'Senior' },
    'common.see_more': 'Ver más',
    'common.see_less': 'Ver menos',
  });

  const configure = (id: string, mock: jest.Mock) => {
    getByIdMock = mock;

    TestBed.configureTestingModule({
      imports: [FreelancerDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id }) },
            paramMap: of(convertToParamMap({ id })),
          },
        },
        {
          provide: FreelancerCatalogService,
          useValue: { getById: getByIdMock },
        },
        lang,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FreelancerDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('renders the detail when the service returns a freelancer', () => {
    configure('1', jest.fn().mockReturnValue(of(detail)));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Lucia Marin Foto');
    expect(text).toContain('Madrid');
    expect(text).toContain('55€/h');
    expect(text).toContain('Foto producto');
    expect(component.hourlyRateLabel()).toBe('55€/h');
  });

  it('shows the not-found state when the service errors with 404', () => {
    configure('999', jest.fn().mockReturnValue(throwError(() => ({ status: 404 }))));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Perfil no disponible');
  });

  it('shows the not-found state for invalid id', () => {
    configure('abc', jest.fn().mockReturnValue(of(detail)));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Perfil no disponible');
  });

  it('renders the "Ver más" button for a long bio and toggles it', () => {
    configure('1', jest.fn().mockReturnValue(of(detail)));
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.bio .btn--ghost');
    expect(btn).toBeTruthy();
    expect(btn?.textContent?.trim()).toBe('Ver más');
    btn?.click();
    fixture.detectChanges();
    expect(component.bioExpanded()).toBe(true);
    const btn2 = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.bio .btn--ghost');
    expect(btn2?.textContent?.trim()).toBe('Ver menos');
  });

  it('shows "Consultar" when hourly_rate is null', () => {
    configure('1', jest.fn().mockReturnValue(of({ ...detail, hourly_rate: null })));
    expect(component.hourlyRateLabel()).toBe('Consultar');
  });
});
