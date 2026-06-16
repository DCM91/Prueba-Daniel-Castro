import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { Observable, of } from 'rxjs';

import { FreelancerListComponent } from './freelancer-list.component';
import { FreelancerCatalogService } from '../../../core/services/freelancer-catalog.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import { FreelancerCard, Paginated } from '../../../core/types/auth.types';

describe('FreelancerListComponent', () => {
  let component: FreelancerListComponent;
  let fixture: ComponentFixture<FreelancerListComponent>;
  let searchMock: jest.Mock;

  const card: FreelancerCard = {
    id: 1, user_id: 7, display_name: 'Lucia', city: 'Madrid',
    hourly_rate: 55, is_available: true, top_skills: [], skills_count: 0, profile_completion: 50,
  };

  const defaultResult: Paginated<FreelancerCard> = {
    data: [card],
    meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
  };

  const emptyResult: Paginated<FreelancerCard> = {
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: 12, total: 0 },
  };

  const lang = provideLanguageServiceMock('es', {
    'freelancers.list': {
      results_count_one: '1 profesional encontrado.',
      results_count_other: '{{total}} profesionales encontrados.',
      empty_title: 'Sin resultados',
      empty_body: 'No hay profesionales.',
      error_body: 'Error al cargar el catálogo.',
      loading: 'Cargando...',
    },
  });

  const configure = (queryParams: Record<string, string | null> = {}, result: Paginated<FreelancerCard> = defaultResult) => {
    searchMock = jest.fn().mockReturnValue(of(result) as Observable<Paginated<FreelancerCard>>);

    TestBed.configureTestingModule({
      imports: [FreelancerListComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap(queryParams)) },
        },
        {
          provide: FreelancerCatalogService,
          useValue: { search: searchMock },
        },
        lang,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FreelancerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('loads and renders results on init when no filters', () => {
    configure({}, defaultResult);
    expect(searchMock).toHaveBeenCalledWith({});
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Lucia');
    expect(text).toContain('1 profesional encontrado.');
  });

  it('shows the empty state when the result has zero items', () => {
    configure({ q: 'nobody' }, emptyResult);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sin resultados');
  });

  it('reads filters from queryParams on init and forwards them to search()', () => {
    configure({ q: 'video', category: 'video', city: 'Madrid', max_rate: '80' });
    expect(searchMock).toHaveBeenCalledWith({
      q: 'video',
      category: 'video',
      city: 'Madrid',
      max_rate: 80,
    });
  });

  it('exposes hasActiveFilters as true when any filter is set', () => {
    configure({ q: 'video' });
    expect(component.hasActiveFilters()).toBe(true);
  });
});
