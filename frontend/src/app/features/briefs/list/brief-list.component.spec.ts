import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { BriefListComponent } from './brief-list.component';
import { BriefsService } from '../../../core/services/briefs.service';
import { AuthService } from '../../../core/services/auth.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import { Brief, User } from '../../../core/types/auth.types';

describe('BriefListComponent', () => {
  let component: BriefListComponent;
  let fixture: ComponentFixture<BriefListComponent>;

  const mockUser: User = { id: 1, name: 'Ana', email: 'a@e.com', role: 'client', created_at: null };

  const sampleBrief: Brief = {
    id: 1, client_id: 1, title: 'Brief 1', description: 'Descripcion detallada del brief',
    category: 'photo', city: 'Madrid', budget_min: 200, budget_max: 800,
    deadline: null, status: 'published', published_at: '2026-01-01T00:00:00Z', created_at: null,
  };

  const configure = (briefs: Brief[] = [sampleBrief]) => {
    const listMock = jest.fn().mockReturnValue(of({
      data: briefs,
      meta: { current_page: 1, last_page: 1, per_page: 12, total: briefs.length },
    }));

    TestBed.configureTestingModule({
      imports: [BriefListComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({})) },
        },
        {
          provide: AuthService,
          useValue: { currentUser: () => mockUser },
        },
        {
          provide: BriefsService,
          useValue: { list: listMock },
        },
        provideLanguageServiceMock('es', {
          briefs: {
            list: {
              title: 'Briefs',
              scope_all: 'Todos',
              scope_mine: 'Mis briefs',
              new_brief: '+ Nuevo brief',
              empty: 'No hay briefs disponibles.',
              proposal_count_one: '{{n}} propuesta',
              proposal_count_other: '{{n}} propuestas',
              deadline_label: 'Fecha límite:',
            },
          },
          skill_categories: { photo: 'Fotografía', video: 'Vídeo', edit: 'Edición', content: 'Creación de Contenido' },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BriefListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('loads and renders briefs on init', () => {
    configure();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Brief 1');
    expect(text).toContain('Madrid');
  });

  it('shows the empty state when there are no briefs', () => {
    configure([]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No hay briefs disponibles.');
  });

  it('uses the i18n "propuesta/propuestas" plural', () => {
    const multi: Brief = { ...sampleBrief, id: 2, proposals_count: 3 };
    const single: Brief = { ...sampleBrief, id: 3, proposals_count: 1 };
    configure([multi, single]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('3 propuestas');
    expect(text).toContain('1 propuesta');
    expect(text).not.toContain('1 propuestas');
  });

  it('translates the category pill via skill_categories i18n key', () => {
    configure();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Fotografía');
    expect(text).not.toContain('>photo<');
  });
});
