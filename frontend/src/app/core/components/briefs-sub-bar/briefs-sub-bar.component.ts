import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '../../pipes/translate.pipe';
import { User } from '../../types/auth.types';

export type BriefsScope = 'all' | 'mine';

@Component({
  selector: 'app-briefs-sub-bar',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="sub-bar" role="navigation" [attr.aria-label]="'briefs.sub_bar.aria' | t">
      <div class="sub-bar__tabs">
        <button
          type="button"
          class="sub-bar__tab"
          [class.sub-bar__tab--active]="scope() === 'all'"
          (click)="onScopeClick('all')"
        >
          {{ 'briefs.list.scope_all' | t }}
        </button>
        @if (showMine()) {
          <button
            type="button"
            class="sub-bar__tab"
            [class.sub-bar__tab--active]="scope() === 'mine'"
            (click)="onScopeClick('mine')"
          >
            {{ 'briefs.list.scope_mine' | t }}
          </button>
        }
      </div>
      @if (canCreate()) {
        <a routerLink="/briefs/new" class="sub-bar__cta">
          {{ 'briefs.list.new_brief' | t }}
        </a>
      }
    </nav>
  `,
  styles: [`
    :host { display: block; }
    .sub-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      max-width: 1100px;
      margin: 0 auto;
      padding: 16px 24px;
    }
    .sub-bar__tabs {
      display: flex;
      gap: 8px;
    }
    .sub-bar__tab {
      background: transparent;
      border: 0;
      color: #a1a1aa;
      font-size: 14px;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-family: inherit;
      transition: color 0.15s, background 0.15s;
    }
    .sub-bar__tab:hover { color: #f4f4f5; background: rgba(255,255,255,0.04); }
    .sub-bar__tab--active {
      color: #c4b5fd;
      background: rgba(124, 58, 237, 0.18);
    }
    .sub-bar__cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      padding: 10px 18px;
      border-radius: 10px;
      text-decoration: none;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .sub-bar__cta:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px -6px rgba(124, 58, 237, 0.6);
    }
    @media (max-width: 720px) {
      .sub-bar { flex-wrap: wrap; padding: 12px 18px; }
      .sub-bar__cta { width: 100%; justify-content: center; }
    }
  `],
})
export class BriefsSubBarComponent {
  readonly scope = input.required<BriefsScope>();
  readonly currentUser = input<User | null>(null);

  @Output() readonly scopeChange = new EventEmitter<BriefsScope>();

  readonly showMine = computed(() => this.currentUser()?.role === 'client');
  readonly canCreate = computed(() => this.currentUser()?.role === 'client');

  onScopeClick(scope: BriefsScope): void {
    if (scope !== this.scope()) {
      this.scopeChange.emit(scope);
    }
  }
}
