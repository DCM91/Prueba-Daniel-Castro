import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';

export type BrandSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="brand" [attr.data-size]="size()" [attr.data-show-wordmark]="showWordmark() ? 'true' : 'false'">
      <svg
        class="mark"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="brandMarkGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7c3aed" />
            <stop offset="100%" stop-color="#67e8f9" />
          </linearGradient>
          <linearGradient id="brandMarkGradInner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a78bfa" />
            <stop offset="100%" stop-color="#0f0f12" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#brandMarkGrad)" />
        <path
          d="M14 12h7.2c4.4 0 7.4 2.6 7.4 6.8 0 4.2-3 6.8-7.4 6.8H18V32h-4V12zm4 10h3.1c2 0 3.4-1.2 3.4-3.2 0-2-1.4-3.2-3.4-3.2H18V22z"
          fill="url(#brandMarkGradInner)"
        />
        <circle cx="30" cy="12" r="2" fill="#fff" fill-opacity="0.85" />
      </svg>
      @if (showWordmark()) {
        <span class="wordmark" aria-label="FrameMatch">FrameMatch</span>
      }
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: inherit;
    }
    .mark {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      filter: drop-shadow(0 2px 8px rgba(124, 58, 237, 0.4));
    }
    .wordmark {
      font-weight: 700;
      letter-spacing: -0.01em;
      background: linear-gradient(135deg, #c4b5fd 0%, #67e8f9 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .brand[data-size='sm'] .mark     { width: 22px; height: 22px; }
    .brand[data-size='sm'] .wordmark { font-size: 14px; }
    .brand[data-size='md'] .mark     { width: 28px; height: 28px; }
    .brand[data-size='md'] .wordmark { font-size: 18px; }
    .brand[data-size='lg'] .mark     { width: 36px; height: 36px; }
    .brand[data-size='lg'] .wordmark { font-size: 24px; }
    .brand[data-size='xl'] .mark     { width: 56px; height: 56px; }
    .brand[data-size='xl'] .wordmark { font-size: 40px; letter-spacing: -0.02em; }
  `],
})
export class BrandLogoComponent {
  readonly size = signal<BrandSize>('md');
  readonly showWordmark = signal<boolean>(true);

  @Input()
  set brandSize(value: BrandSize) {
    this.size.set(value);
  }

  @Input()
  set hideWordmark(value: boolean) {
    this.showWordmark.set(!value);
  }
}
