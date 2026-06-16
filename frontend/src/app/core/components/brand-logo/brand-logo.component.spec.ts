import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandLogoComponent } from './brand-logo.component';

describe('BrandLogoComponent', () => {
  let component: BrandLogoComponent;
  let fixture: ComponentFixture<BrandLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandLogoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BrandLogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the FrameMatch wordmark by default', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('FrameMatch');
  });

  it('renders the SVG mark', () => {
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg.mark');
    expect(svg).toBeTruthy();
  });

  it('hides the wordmark when hideWordmark input is true', () => {
    component.hideWordmark = true;
    fixture.detectChanges();
    const wordmark = (fixture.nativeElement as HTMLElement).querySelector('.wordmark');
    expect(wordmark).toBeFalsy();
    expect(component.showWordmark()).toBe(false);
  });

  it('defaults to medium size', () => {
    const brand = (fixture.nativeElement as HTMLElement).querySelector('.brand');
    expect(brand?.getAttribute('data-size')).toBe('md');
  });

  it('applies the requested size via brandSize input', () => {
    component.brandSize = 'xl';
    fixture.detectChanges();
    const brand = (fixture.nativeElement as HTMLElement).querySelector('.brand');
    expect(brand?.getAttribute('data-size')).toBe('xl');
    expect(component.size()).toBe('xl');
  });
});
