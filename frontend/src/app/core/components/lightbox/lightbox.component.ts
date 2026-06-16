import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { TranslatePipe } from '../../pipes/translate.pipe';
import { PortfolioItem } from '../../types/auth.types';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lightbox.component.html',
  styleUrl: './lightbox.component.css',
})
export class LightboxComponent implements AfterViewInit {
  readonly items = input.required<readonly PortfolioItem[]>();
  readonly startIndex = input<number>(0);
  readonly close = input.required<() => void>();

  readonly currentIndex = signal<number>(0);
  readonly currentItem = computed<PortfolioItem | null>(() => {
    const list = this.items();
    const i = this.currentIndex();
    return list[i] ?? null;
  });
  readonly counter = computed<string>(() => {
    const total = this.items().length;
    return total > 0 ? `${this.currentIndex() + 1} / ${total}` : '0 / 0';
  });

  private readonly dialogRef = viewChild<ElementRef<HTMLElement>>('dialog');
  private previousFocus: HTMLElement | null = null;
  private initialized = false;

  constructor() {
    effect(() => {
      if (this.initialized) {
        const list = this.items();
        if (this.currentIndex() >= list.length && list.length > 0) {
          this.currentIndex.set(0);
        }
      }
    });
  }

  ngAfterViewInit(): void {
    const start = Math.max(0, Math.min(this.startIndex(), this.items().length - 1));
    this.currentIndex.set(start);
    this.initialized = true;

    this.previousFocus = document.activeElement as HTMLElement | null;
    const dialog = this.dialogRef()?.nativeElement;
    if (dialog) {
      const focusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close()();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    }
  }

  closeLightbox(): void {
    this.previousFocus?.focus();
    this.close()();
  }

  next(): void {
    const total = this.items().length;
    if (total === 0) return;
    this.currentIndex.set((this.currentIndex() + 1) % total);
  }

  prev(): void {
    const total = this.items().length;
    if (total === 0) return;
    this.currentIndex.set((this.currentIndex() - 1 + total) % total);
  }
}
