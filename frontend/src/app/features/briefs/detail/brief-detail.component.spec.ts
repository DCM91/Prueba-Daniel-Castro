import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BriefDetailComponent } from './brief-detail.component';
import { BriefsService } from '../../../core/services/briefs.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { AuthService } from '../../../core/services/auth.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import { Brief, User } from '../../../core/types/auth.types';

describe('BriefDetailComponent', () => {
  let component: BriefDetailComponent;
  let fixture: ComponentFixture<BriefDetailComponent>;

  const ownerUser: User = { id: 1, name: 'Owner', email: 'o@e.com', role: 'client', created_at: null };
  const freelanceUser: User = { id: 2, name: 'Pro', email: 'p@e.com', role: 'freelancer', created_at: null };

  const brief: Brief = {
    id: 1, client_id: 1, title: 'Brief Test', description: 'Descripcion detallada del brief',
    category: 'photo', city: 'Madrid', budget_min: 200, budget_max: 800,
    deadline: null, status: 'published', published_at: '2026-01-01T00:00:00Z', created_at: null,
    client: { id: 1, name: 'Owner' },
  };

  const configure = (user: User, briefResp: Brief | null = brief, err = false) => {
    const getByIdMock = err
      ? jest.fn().mockReturnValue(throwError(() => ({ status: 404 })))
      : jest.fn().mockReturnValue(of(briefResp!));
    const proposalsMock = jest.fn().mockReturnValue(of([]));

    TestBed.configureTestingModule({
      imports: [BriefDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: '1' }) },
            paramMap: of(convertToParamMap({ id: '1' })),
          },
        },
        {
          provide: AuthService,
          useValue: { currentUser: () => user },
        },
        {
          provide: BriefsService,
          useValue: { getById: getByIdMock },
        },
        {
          provide: ProposalsService,
          useValue: { listForBrief: proposalsMock },
        },
        provideLanguageServiceMock('es', {
          briefs: {
            detail: {
              loading: 'Cargando brief…',
              not_found: 'Brief no encontrado.',
            },
          },
          topbar: {
            back_to_briefs: '← Briefs',
          },
          skill_categories: { photo: 'Fotografía', video: 'Vídeo', edit: 'Edición', content: 'Creación de Contenido' },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BriefDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('renders the brief when loaded as the owner', () => {
    configure(ownerUser);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Brief Test');
    expect(text).toContain('Madrid');
  });

  it('shows the not-found state when the brief does not exist', () => {
    configure(ownerUser, null, true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Brief no encontrado');
  });
});
