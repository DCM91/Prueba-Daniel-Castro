import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BriefFormComponent } from './brief-form.component';
import { BriefsService } from '../../../core/services/briefs.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Brief } from '../../../core/types/auth.types';

describe('BriefFormComponent', () => {
  let component: BriefFormComponent;
  let fixture: ComponentFixture<BriefFormComponent>;
  let createMock: jest.Mock;
  let router: Router;

  const newBrief: Brief = {
    id: 99, client_id: 1, title: 'Mi brief', description: 'Una descripción suficientemente larga.',
    category: 'photo', city: 'Madrid', budget_min: null, budget_max: null,
    deadline: null, status: 'published', published_at: '2026-06-19T10:00:00Z', created_at: null,
  };

  const configure = (mode: 'ok' | 'error' = 'ok'): void => {
    createMock = jest.fn().mockReturnValue(
      mode === 'ok'
        ? of(newBrief)
        : throwError(() => ({ error: { errors: { title: ['El título es obligatorio.'] } } })),
    );

    TestBed.configureTestingModule({
      imports: [BriefFormComponent, TranslatePipe],
      providers: [
        provideRouter([]),
        { provide: BriefsService, useValue: { create: createMock } },
        provideLanguageServiceMock('es', {
          briefs: {
            form: {
              title: 'Nuevo proyecto',
              subtitle: 'Describe tu proyecto.',
              label_title: 'Título',
              title_min: 'Mínimo 5 caracteres.',
              label_description: 'Descripción',
              description_min: 'Mínimo 20 caracteres.',
              label_category: 'Categoría',
              label_city: 'Ciudad',
              label_budget_min: 'Presupuesto mínimo (€)',
              label_budget_max: 'Presupuesto máximo (€)',
              label_deadline: 'Fecha límite',
              submit: 'Publicar proyecto',
              submitting: 'Publicando…',
              error_generic: 'No se pudo publicar el proyecto.',
            },
          },
          skill_categories: { photo: 'Foto', video: 'Vídeo', edit: 'Edición', content: 'Contenido' },
          common: { cancel: 'Cancelar' },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BriefFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  };

  it('marks the form as invalid when required fields are empty', () => {
    configure();
    expect(component.form.invalid).toBe(true);
    component.submit();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('marks title as invalid when shorter than 5 chars', () => {
    configure();
    component.form.patchValue({ title: 'abc' });
    component.submit();
    expect(component.form.controls.title.errors?.['minlength']).toBeTruthy();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('calls BriefsService.create with valid data and navigates to the new brief', () => {
    configure();
    const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    component.form.patchValue({
      title: 'Un título válido',
      description: 'Una descripción suficientemente larga para pasar la validación.',
      category: 'photo',
      city: 'Madrid',
      budget_min: 100,
      budget_max: 500,
      deadline: '',
    });
    component.submit();
    expect(createMock).toHaveBeenCalledWith({
      title: 'Un título válido',
      description: 'Una descripción suficientemente larga para pasar la validación.',
      category: 'photo',
      city: 'Madrid',
      budget_min: 100,
      budget_max: 500,
      deadline: null,
    });
    expect(navSpy).toHaveBeenCalledWith(['/briefs', 99]);
  });

  it('surfaces the first 422 error message into the global error element', () => {
    configure('error');
    component.form.patchValue({
      title: 'Un título válido',
      description: 'Una descripción suficientemente larga para pasar la validación.',
    });
    component.submit();
    fixture.detectChanges();
    const errorEl = (fixture.nativeElement as HTMLElement).querySelector('.error--global');
    expect(errorEl?.textContent).toContain('El título es obligatorio.');
  });
});
