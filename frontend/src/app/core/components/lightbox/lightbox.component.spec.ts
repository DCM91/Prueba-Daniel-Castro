import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { provideLanguageServiceMock } from '../../testing/language-service.mock';

import { LightboxComponent } from './lightbox.component';
import { PortfolioItem } from '../../types/auth.types';

const items: PortfolioItem[] = [
  { id: 1, public_id: 'a/1', url: 'https://x/1.jpg', urls: { thumb: null, card: null, full: 'https://x/1.jpg' }, width: 800, height: 600, format: 'jpg', bytes: 1000, title: 'Primero', description: null, position: 0, created_at: null },
  { id: 2, public_id: 'a/2', url: 'https://x/2.jpg', urls: { thumb: null, card: null, full: 'https://x/2.jpg' }, width: 800, height: 600, format: 'jpg', bytes: 1000, title: null, description: 'Segunda', position: 1, created_at: null },
  { id: 3, public_id: 'a/3', url: 'https://x/3.jpg', urls: { thumb: null, card: null, full: 'https://x/3.jpg' }, width: 800, height: 600, format: 'jpg', bytes: 1000, title: 'Tercera', description: null, position: 2, created_at: null },
];

describe('LightboxComponent', () => {
  let fixture: ComponentFixture<LightboxComponent>;
  let component: LightboxComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LightboxComponent, TranslatePipe],
      providers: [
        provideLanguageServiceMock('es', {
          lightbox: {
            close: 'Cerrar',
            next: 'Siguiente',
            prev: 'Anterior',
            counter: '{{current}} de {{total}}',
            dialog_label: 'Visor de imágenes',
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LightboxComponent);
    component = fixture.componentInstance;
  });

  it('renders dialog with role and aria-modal', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('close', () => {});
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('shows the first item by default', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('close', () => {});
    fixture.componentRef.setInput('startIndex', 0);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.image') as HTMLImageElement;
    expect(img?.src).toContain('1.jpg');
  });

  it('respects the startIndex input', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('close', () => {});
    fixture.componentRef.setInput('startIndex', 2);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.image') as HTMLImageElement;
    expect(img?.src).toContain('3.jpg');
  });

  it('navigates next and prev', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('close', () => {});
    fixture.detectChanges();

    component.next();
    expect(component.currentIndex()).toBe(1);
    component.prev();
    expect(component.currentIndex()).toBe(0);
  });

  it('wraps around at the ends', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('close', () => {});
    fixture.detectChanges();

    component.prev();
    expect(component.currentIndex()).toBe(2);
    component.next();
    expect(component.currentIndex()).toBe(0);
  });

  it('emits close when calling close() input', () => {
    const closeSpy = jest.fn();
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('close', closeSpy);
    fixture.detectChanges();

    component.closeLightbox();

    expect(closeSpy).toHaveBeenCalled();
  });
});
