import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ReviewFormComponent } from './review-form.component';
import { ReviewsService } from '../../../core/services/reviews.service';
import { Review } from '../../../core/types/auth.types';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 42,
    brief_id: 1,
    reviewer_id: 7,
    reviewee_id: 1,
    rating: 4,
    comment: 'Comentario inicial',
    created_at: '2026-06-18T10:00:00Z',
    updated_at: null,
    reviewer: { id: 7, name: 'Lucia', avatar_url: null },
    reviewee: { id: 1, name: 'Ana', avatar_url: null },
    ...overrides,
  };
}

describe('ReviewFormComponent', () => {
  let fixture: ComponentFixture<ReviewFormComponent>;
  let component: ReviewFormComponent;
  let createMock: jest.Mock;
  let updateMock: jest.Mock;

  const configureTestBed = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ReviewFormComponent],
      providers: [
        {
          provide: ReviewsService,
          useValue: {
            get create() { return createMock; },
            get update() { return updateMock; },
            delete: jest.fn().mockReturnValue(of(undefined)),
          },
        },
        provideLanguageServiceMock('es', {
          reviews: {
            form_title: 'Deja tu reseña',
            form_subtitle: 'Comparte tu experiencia.',
            edit_title: 'Edita tu reseña',
            submit: 'Publicar reseña',
            save_changes: 'Guardar cambios',
            submitting: 'Publicando…',
            delete_cta: 'Eliminar reseña',
            error_save: 'No se pudo publicar.',
            error_update: 'No se pudo actualizar.',
            rating_label: 'Puntuación',
            rating_helper: '1 = muy mal, 5 = excelente',
            rating_required: 'Selecciona puntuación.',
            comment_label: 'Comentario',
            comment_placeholder: 'Cuéntanos…',
          },
          'rating.aria_label': 'Puntuación: {{n}} de 5',
        }),
      ],
    }).compileComponents();
  };

  const mount = (existing: Review | null = null): void => {
    fixture = TestBed.createComponent(ReviewFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('briefId', 1);
    if (existing !== null) {
      fixture.componentRef.setInput('existing', existing);
    }
    fixture.detectChanges();
  };

  beforeEach(() => {
    createMock = jest.fn().mockReturnValue(of(makeReview()));
    updateMock = jest.fn().mockReturnValue(of(makeReview({ rating: 5, comment: 'editado' })));
  });

  it('shows the "create" title and submit label when there is no existing review', async () => {
    await configureTestBed();
    mount(null);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Deja tu reseña');
    expect(text).toContain('Publicar reseña');
    expect(text).not.toContain('Guardar cambios');
    expect(text).not.toContain('Eliminar reseña');
  });

  it('patches the form with the existing review on init', async () => {
    await configureTestBed();
    mount(makeReview({ rating: 3, comment: 'Antes' }));
    expect(component.form.controls.rating.value).toBe(3);
    expect(component.form.controls.comment.value).toBe('Antes');
  });

  it('shows the "edit" title, save-changes label and delete button when an existing review is provided', async () => {
    await configureTestBed();
    mount(makeReview());
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Edita tu reseña');
    expect(text).toContain('Guardar cambios');
    expect(text).toContain('Eliminar reseña');
  });

  it('calls ReviewsService.create when submitting without an existing review', async () => {
    await configureTestBed();
    mount(null);
    component.form.patchValue({ rating: 5, comment: 'Nuevo' });
    component.submit();
    expect(createMock).toHaveBeenCalledWith(1, { rating: 5, comment: 'Nuevo' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('calls ReviewsService.update (not create) when submitting with an existing review', async () => {
    const existing = makeReview();
    await configureTestBed();
    mount(existing);
    component.form.patchValue({ rating: 2, comment: 'Corregido' });
    component.submit();
    expect(updateMock).toHaveBeenCalledWith(42, { rating: 2, comment: 'Corregido' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('surfaces error_save when create fails', async () => {
    await configureTestBed();
    createMock = jest.fn().mockReturnValue(throwError(() => ({ status: 500 })));
    mount(null);
    component.form.patchValue({ rating: 4, comment: 'X' });
    component.submit();
    expect(component.errorMessage()).toBe('reviews.error_save');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No se pudo publicar.');
  });

  it('surfaces error_update when update fails', async () => {
    await configureTestBed();
    updateMock = jest.fn().mockReturnValue(throwError(() => ({ status: 500 })));
    mount(makeReview());
    component.form.patchValue({ rating: 1, comment: 'X' });
    component.submit();
    expect(component.errorMessage()).toBe('reviews.error_update');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No se pudo actualizar.');
  });

  it('does not call the service when the form is invalid', async () => {
    await configureTestBed();
    mount(null);
    component.form.patchValue({ rating: 0, comment: '' });
    component.submit();
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('emits deleteRequested with the existing review when the delete button is clicked', async () => {
    const existing = makeReview();
    await configureTestBed();
    mount(existing);
    const emitted: Review[] = [];
    component.deleteRequested.subscribe((r) => emitted.push(r));
    component.requestDelete();
    expect(emitted).toEqual([existing]);
  });

  it('does not emit deleteRequested when there is no existing review', async () => {
    await configureTestBed();
    mount(null);
    const emitted: Review[] = [];
    component.deleteRequested.subscribe((r) => emitted.push(r));
    component.requestDelete();
    expect(emitted).toEqual([]);
  });
});
