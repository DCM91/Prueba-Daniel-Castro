import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ProposalFormComponent } from './proposal-form.component';
import { ProposalsService } from '../../../core/services/proposals.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

describe('ProposalFormComponent', () => {
  let component: ProposalFormComponent;
  let fixture: ComponentFixture<ProposalFormComponent>;
  let createMock: jest.Mock;

  const configure = (mode: 'ok' | 'error' = 'ok'): void => {
    createMock = jest.fn().mockReturnValue(
      mode === 'ok'
        ? of({ id: 1, brief_id: 1, freelancer_id: 2, message: 'msg', price: 100, status: 'pending', created_at: '2026-06-19T10:00:00Z' })
        : throwError(() => ({ error: { message: 'Error del servidor.' } })),
    );

    TestBed.configureTestingModule({
      imports: [ProposalFormComponent, TranslatePipe],
      providers: [
        { provide: ProposalsService, useValue: { create: createMock } },
        provideLanguageServiceMock('es', {
          briefs: {
            proposal_form: {
              title: 'Tu propuesta',
              label_message: 'Mensaje',
              placeholder_message: 'Cuéntale...',
              label_price: 'Precio (€)',
              submit: 'Enviar propuesta',
              submitting: 'Enviando…',
              error_generic: 'No se pudo enviar la propuesta.',
            },
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProposalFormComponent);
    component = fixture.componentInstance;
    component.briefId = 5;
    fixture.detectChanges();
  };

  it('marks the form as invalid when message is shorter than 20 chars', () => {
    configure();
    component.form.patchValue({ message: 'corto', price: 100 });
    expect(component.form.invalid).toBe(true);
    component.submit();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates a proposal with valid data and emits submitted', () => {
    configure();
    const emitSpy = jest.fn();
    component.submitted.subscribe(emitSpy);
    component.form.patchValue({
      message: 'Tengo experiencia relevante y puedo empezar mañana mismo con disponibilidad completa.',
      price: 350,
    });
    component.submit();
    expect(createMock).toHaveBeenCalledWith(5, {
      message: 'Tengo experiencia relevante y puedo empezar mañana mismo con disponibilidad completa.',
      price: 350,
    });
    expect(emitSpy).toHaveBeenCalled();
  });

  it('surfaces the backend error message in the global error element', () => {
    configure('error');
    component.form.patchValue({
      message: 'Tengo experiencia relevante y puedo empezar mañana mismo con disponibilidad completa.',
      price: 350,
    });
    component.submit();
    fixture.detectChanges();
    const errorEl = (fixture.nativeElement as HTMLElement).querySelector('.error--global');
    expect(errorEl?.textContent).toContain('Error del servidor.');
  });
});
