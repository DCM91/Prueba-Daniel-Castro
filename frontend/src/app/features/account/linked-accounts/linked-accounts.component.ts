import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { OAuthIdentity, OAuthProvider } from '../../../core/types/auth.types';

interface ProviderSlot {
  provider: OAuthProvider;
  identity: OAuthIdentity | null;
}

const ALL_PROVIDERS: OAuthProvider[] = ['google', 'facebook'];

@Component({
  selector: 'app-linked-accounts',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './linked-accounts.component.html',
  styleUrl: './linked-accounts.component.css',
})
export class LinkedAccountsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly lang = inject(LanguageService);

  readonly loading = signal<boolean>(true);
  readonly unlinkingProvider = signal<OAuthProvider | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly identities = signal<OAuthIdentity[]>([]);

  readonly currentUser = this.auth.currentUser;
  readonly providers = ALL_PROVIDERS;

  readonly slots = computed<ProviderSlot[]>(() => {
    const linked = new Map(this.identities().map((i) => [i.provider, i]));
    return this.providers.map((provider) => ({
      provider,
      identity: linked.get(provider) ?? null,
    }));
  });

  readonly isOAuthOnly = computed<boolean>(() => {
    const user = this.currentUser();
    if (!user) return false;
    if (user.oauth_only !== undefined) return user.oauth_only;
    return !user.has_password && (user.oauth_identities?.length ?? 0) > 0;
  });

  ngOnInit(): void {
    this.refresh();
    this.readUrlMessages();
  }

  refresh(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.auth.listOAuthIdentities().subscribe({
      next: (list) => {
        this.identities.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('account.oauth_error_load');
        this.loading.set(false);
      },
    });
  }

  readUrlMessages(): void {
    const params = new URLSearchParams(window.location.search);
    const linked = params.get('oauth_linked');
    const error = params.get('oauth_error');
    if (linked) {
      this.successMessage.set('account.oauth_linked_success');
    }
    if (error) {
      this.errorMessage.set('account.oauth_linked_error');
    }
    if (linked || error) {
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth_linked');
      url.searchParams.delete('oauth_error');
      url.searchParams.delete('token');
      url.searchParams.delete('expires_in');
      window.history.replaceState({}, '', url.toString());
    }
  }

  providerLabel(provider: OAuthProvider): string {
    return provider === 'google' ? 'Google' : 'Facebook';
  }

  formatDate(iso: string | null | undefined): string | null {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return null;
    }
  }

  linkProvider(provider: OAuthProvider): void {
    this.auth.linkOAuthProvider(provider);
  }

  unlink(slot: ProviderSlot): void {
    const identity = slot.identity;
    if (!identity) return;

    const label = this.providerLabel(slot.provider);
    const message = this.interpolate('account.oauth_unlink_confirm', { provider: label });
    if (!window.confirm(message)) {
      return;
    }

    this.unlinkingProvider.set(slot.provider);
    this.errorMessage.set(null);
    this.auth.unlinkOAuthProvider(slot.provider).subscribe({
      next: () => {
        this.identities.update((list) => list.filter((i) => i.provider !== slot.provider));
        this.unlinkingProvider.set(null);
        this.auth.me().subscribe({
          next: ({ data }) => this.auth.setCurrentUser(data),
          error: () => undefined,
        });
      },
      error: () => {
        this.unlinkingProvider.set(null);
        this.errorMessage.set('account.oauth_error_unlink');
      },
    });
  }

  private interpolate(key: string, params: Record<string, string | number>): string {
    return this.lang.t(key, params);
  }
}
