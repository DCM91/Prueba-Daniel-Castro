import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { CoreTopbarComponent } from './core/components/topbar/topbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CoreTopbarComponent],
  template: `
    <app-core-topbar />
    <router-outlet />
  `,
  styles: [':host { display: block; }'],
})
export class App {
  constructor() {
    inject(AuthService).restoreSession();
  }
}
