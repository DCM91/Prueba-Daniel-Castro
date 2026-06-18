import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BriefDetailComponent } from './brief-detail.component';
import { BriefsService } from '../../../core/services/briefs.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { AuthService } from '../../../core/services/auth.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Brief, Proposal, User } from '../../../core/types/auth.types';

describe('BriefDetailComponent', () => {
  let component: BriefDetailComponent;
  let fixture: ComponentFixture<BriefDetailComponent>;

  const ownerUser: User = { id: 1, name: 'Owner', email: 'o@e.com', role: 'client', created_at: null };

  const brief: Brief = {
    id: 1, client_id: 1, title: 'Brief Test', description: 'Descripcion detallada del brief',
    category: 'photo', city: 'Madrid', budget_min: 200, budget_max: 800,
    deadline: null, status: 'published', published_at: '2026-01-01T00:00:00Z', created_at: null,
    client: { id: 1, name: 'Owner' },
  };

  const pendingProposal: Proposal = {
    id: 10,
    brief_id: 1,
    freelancer_id: 7,
    message: 'Tengo experiencia y puedo empezar mañana.',
    price: 350,
    status: 'pending',
    created_at: '2026-01-02T00:00:00Z',
    freelancer: { id: 7, display_name: 'Lucia Marin' },
  };

  const configure = (user: User, briefResp: Brief | null = brief, err = false, proposals: Proposal[] = []) => {
    const getByIdMock = err
      ? jest.fn().mockReturnValue(throwError(() => ({ status: 404 })))
      : jest.fn().mockReturnValue(of(briefResp!));
    const proposalsMock = jest.fn().mockReturnValue(of(proposals));
    const updateStatusMock = jest.fn().mockReturnValue(of({
      proposal: { ...pendingProposal, status: 'accepted' },
      brief:   { status: 'assigned' },
    }));

    TestBed.configureTestingModule({
      imports: [BriefDetailComponent, TranslatePipe],
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
          useValue: {
            getById: getByIdMock,
            attachImage: jest.fn().mockReturnValue(of({})),
            detachImage: jest.fn().mockReturnValue(of({})),
            reorderAttachments: jest.fn().mockReturnValue(of([])),
          },
        },
        {
          provide: ProposalsService,
          useValue: { listForBrief: proposalsMock, updateStatus: updateStatusMock },
        },
        provideLanguageServiceMock('es', {
          briefs: {
            detail: {
              loading: 'Cargando brief…',
              not_found: 'Brief no encontrado.',
              proposals_title: 'Propuestas recibidas ({{count}})',
              proposals_empty: 'Aún no has recibido propuestas.',
            },
            proposals: {
              accept: 'Aceptar',
              reject: 'Rechazar',
              status_pending: 'Pendiente',
              status_accepted: 'Aceptada',
              status_rejected: 'Rechazada',
            },
          },
          brief_attachments: {
            section_title: 'Imágenes de referencia',
            add: 'Añadir imagen',
            uploading: 'Subiendo…',
            empty: 'Todavía no has añadido imágenes.',
            remove: 'Eliminar',
            reorder_help: 'Arrastra para reordenar.',
            drag_handle_label: 'Reordenar imagen',
            image_alt: 'Imagen de referencia {{n}}',
            error_remove: 'No se pudo eliminar la imagen.',
            error_reorder: 'No se pudo reordenar las imágenes.',
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

  it('renders pending proposals with accept/reject buttons when owner', () => {
    configure(ownerUser, brief, false, [pendingProposal]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aceptar');
    expect(text).toContain('Rechazar');
    expect(text).toContain('Pendiente');
  });

  it('calls ProposalsService.updateStatus with accepted when accept clicked', () => {
    const updateStatusMock = jest.fn().mockReturnValue(of({
      proposal: { ...pendingProposal, status: 'accepted' },
      brief:   { status: 'assigned' },
    }));
    configure(ownerUser, brief, false, [pendingProposal]);
    (TestBed.inject(ProposalsService) as { updateStatus: jest.Mock }).updateStatus = updateStatusMock;

    component.updateProposalStatus(pendingProposal, 'accepted');

    expect(updateStatusMock).toHaveBeenCalledWith(1, 10, 'accepted');
  });

  it('updates the local proposal list and brief status after accepting', () => {
    configure(ownerUser, brief, false, [pendingProposal]);
    (TestBed.inject(ProposalsService) as { updateStatus: jest.Mock }).updateStatus = jest.fn().mockReturnValue(of({
      proposal: { ...pendingProposal, status: 'accepted' },
      brief:   { status: 'assigned' },
    }));

    component.updateProposalStatus(pendingProposal, 'accepted');

    const list = (component as unknown as { proposalsList: () => Proposal[] }).proposalsList();
    expect(list[0].status).toBe('accepted');
    const b = (component as unknown as { brief: () => Brief | null }).brief();
    expect(b?.status).toBe('assigned');
  });
});
