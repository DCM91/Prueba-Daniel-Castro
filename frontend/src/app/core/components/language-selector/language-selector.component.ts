import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LanguageService, AppLanguage, LanguageOption } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="selector" [class.selector--open]="open()">
      <button
        type="button"
        class="trigger"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="'Cambiar idioma'"
        (click)="toggle($event)"
      >
        <span class="code">{{ currentCode() }}</span>
        <span class="chev" aria-hidden="true">▾</span>
      </button>
      @if (open()) {
        <ul class="menu" role="listbox">
          @for (opt of options(); track opt.code) {
            <li>
              <button
                type="button"
                role="option"
                class="menu-item"
                [class.menu-item--active]="opt.code === current()?.code"
                (click)="select(opt.code)"
              >
                {{ opt.label }}
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; position: relative; }
    .selector { position: relative; }
    .trigger {
      appearance: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #f4f4f5;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .trigger:hover { background: rgba(255, 255, 255, 0.08); }
    .code { letter-spacing: 0.04em; }
    .chev { font-size: 10px; opacity: 0.7; }
    .menu {
      list-style: none;
      margin: 0;
      padding: 4px;
      position: absolute;
      right: 0;
      top: calc(100% + 6px);
      min-width: 140px;
      background: #18181b;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.6);
      z-index: 50;
    }
    .menu-item {
      width: 100%;
      appearance: none;
      border: 0;
      background: transparent;
      color: #f4f4f5;
      padding: 8px 10px;
      text-align: left;
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;
    }
    .menu-item:hover { background: rgba(255, 255, 255, 0.06); }
    .menu-item--active { color: #c4b5fd; background: rgba(124, 58, 237, 0.18); }
  `],
})
export class LanguageSelectorComponent {
  private readonly lang = inject(LanguageService);

  readonly current = computed<LanguageOption | undefined>(() =>
    this.lang.supported.find((opt) => opt.code === this.lang.language()),
  );
  readonly currentCode = computed<string>(() => this.current()?.code?.toUpperCase() ?? '—');
  readonly options = computed<readonly LanguageOption[]>(() => this.lang.supported);

  readonly open = signal<boolean>(false);

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  select(code: AppLanguage): void {
    this.lang.setLanguage(code);
    this.open.set(false);
  }
}
