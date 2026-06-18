import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';

import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { BriefsService } from '../../../core/services/briefs.service';
import { BriefAttachment } from '../../../core/types/auth.types';

import { BriefAttachmentUploaderComponent } from './brief-attachment-uploader.component';

function makeAttachment(overrides: Partial<BriefAttachment> = {}): BriefAttachment {
  return {
    id: 1,
    brief_id: 1,
    public_id: 'framematch/briefs/1',
    url: 'https://res.cloudinary.com/demo/brief/1.jpg',
    urls: {
      thumb: 'https://res.cloudinary.com/demo/brief/1-thumb.jpg',
      card: 'https://res.cloudinary.com/demo/brief/1-card.jpg',
      full: 'https://res.cloudinary.com/demo/brief/1-full.jpg',
    },
    width: 1200,
    height: 800,
    format: 'jpg',
    bytes: 120000,
    title: null,
    position: 0,
    created_at: '2026-06-18T00:00:00Z',
    ...overrides,
  };
}

describe('BriefAttachmentUploaderComponent', () => {
  let fixture: ComponentFixture<BriefAttachmentUploaderComponent>;
  let component: BriefAttachmentUploaderComponent;
  let cloudinaryUploadMock: jest.Mock;
  let attachImageMock: jest.Mock;
  let detachImageMock: jest.Mock;
  let reorderMock: jest.Mock;

  beforeEach(async () => {
    cloudinaryUploadMock = jest.fn();
    attachImageMock = jest.fn();
    detachImageMock = jest.fn();
    reorderMock = jest.fn();

    await TestBed.configureTestingModule({
      imports: [BriefAttachmentUploaderComponent, TranslatePipe],
      providers: [
        provideLanguageServiceMock('es', {
          brief_attachments: {
            section_title: 'Imágenes de referencia',
            section_help: 'Sube hasta 10 imágenes.',
            add: 'Añadir imagen',
            uploading: 'Subiendo…',
            empty: 'Todavía no has añadido imágenes.',
            limit_reached: 'Has alcanzado el límite.',
            error_upload: 'No se pudo subir la imagen.',
            error_save: 'No se pudo guardar la imagen.',
            error_remove: 'No se pudo eliminar la imagen.',
            error_reorder: 'No se pudo reordenar las imágenes.',
            error_limit: 'Has alcanzado el límite de imágenes.',
            error_filetype: 'Tipo de archivo no permitido.',
            error_size: 'La imagen es demasiado grande.',
            remove: 'Eliminar',
            reorder_help: 'Arrastra para reordenar.',
            drag_handle_label: 'Reordenar imagen',
            image_alt: 'Imagen de referencia {{n}}',
          },
        }),
        { provide: CloudinaryService, useValue: { uploadImage: cloudinaryUploadMock } },
        {
          provide: BriefsService,
          useValue: {
            attachImage: attachImageMock,
            detachImage: detachImageMock,
            reorderAttachments: reorderMock,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BriefAttachmentUploaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('briefId', 1);
    fixture.componentRef.setInput('initialAttachments', []);
    fixture.detectChanges();
  });

  it('renders initial attachments', () => {
    fixture.componentRef.setInput('initialAttachments', [
      makeAttachment({ id: 1, public_id: 'a/1', position: 0 }),
      makeAttachment({ id: 2, public_id: 'a/2', position: 1, title: 'Moodboard' }),
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-test="brief-attachment-item"]');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('img').getAttribute('src')).toContain('1.jpg');
    expect(items[1].textContent).toContain('Moodboard');
  });

  it('shows empty state when no attachments', () => {
    expect(component.attachments().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Todavía no has añadido imágenes.');
  });

  it('moves attachment up and persists new order', () => {
    const list = [makeAttachment({ id: 1, position: 0 }), makeAttachment({ id: 2, position: 1 })];
    fixture.componentRef.setInput('initialAttachments', list);
    fixture.detectChanges();

    reorderMock.mockReturnValue(of([list[1], list[0]]));
    component.moveDown(list[0]);

    expect(component.attachments()[0].id).toBe(2);
    expect(component.attachments()[1].id).toBe(1);
    expect(reorderMock).toHaveBeenCalledWith(1, [2, 1]);
  });

  it('moves attachment down and persists new order', () => {
    const list = [makeAttachment({ id: 1, position: 0 }), makeAttachment({ id: 2, position: 1 })];
    fixture.componentRef.setInput('initialAttachments', list);
    fixture.detectChanges();

    reorderMock.mockReturnValue(of([list[1], list[0]]));
    component.moveDown(list[0]);

    expect(component.attachments()[0].id).toBe(2);
    expect(component.attachments()[1].id).toBe(1);
    expect(reorderMock).toHaveBeenCalledWith(1, [2, 1]);
  });

  it('removes attachment via service and updates signal', () => {
    const att = makeAttachment({ id: 5 });
    fixture.componentRef.setInput('initialAttachments', [att]);
    fixture.detectChanges();

    detachImageMock.mockReturnValue(of({ message: 'Imagen eliminada.' }));
    component.remove(att);

    expect(component.attachments().length).toBe(0);
    expect(detachImageMock).toHaveBeenCalledWith(1, 5);
  });

  it('surfaces error when remove fails', () => {
    const att = makeAttachment({ id: 5 });
    fixture.componentRef.setInput('initialAttachments', [att]);
    fixture.detectChanges();

    detachImageMock.mockReturnValue(throwError(() => ({ status: 500 })));
    component.remove(att);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo eliminar la imagen.');
  });

  it('exposes remainingSlots = 1 and canAdd = true when there are 9 attachments', () => {
    const list = Array.from({ length: 9 }, (_, i) => makeAttachment({ id: i + 1, position: i }));
    fixture.componentRef.setInput('initialAttachments', list);
    fixture.detectChanges();

    expect(component.remainingSlots()).toBe(1);
    expect(component.canAdd()).toBe(true);
  });

  it('exposes canAdd = false when there are 10 attachments', () => {
    const full = Array.from({ length: 10 }, (_, i) => makeAttachment({ id: i + 1, position: i }));
    fixture.componentRef.setInput('initialAttachments', full);
    fixture.detectChanges();

    expect(component.canAdd()).toBe(false);
  });
});
