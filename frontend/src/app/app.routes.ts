import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { redirectIfAuthenticatedGuard } from './core/guards/redirect-if-authenticated.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [redirectIfAuthenticatedGuard],
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    canActivate: [redirectIfAuthenticatedGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [redirectIfAuthenticatedGuard],
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/oauth-callback/oauth-callback.component').then((m) => m.OAuthCallbackComponent),
  },
  {
    path: 'auth/complete-profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/oauth-complete-profile/oauth-complete-profile.component').then((m) => m.OAuthCompleteProfileComponent),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account.component').then((m) => m.AccountComponent),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home-redirect.component').then((m) => m.HomeRedirectComponent),
      },
      {
        path: 'client',
        canActivate: [authGuard, roleGuard(['client', 'agency', 'company', 'admin'])],
        loadComponent: () => import('./features/home/client/client-home.component').then((m) => m.ClientHomeComponent),
      },
      {
        path: 'freelancer',
        canActivate: [authGuard, roleGuard(['freelancer'])],
        loadComponent: () => import('./features/home/freelancer/freelancer-home.component').then((m) => m.FreelancerHomeComponent),
      },
    ],
  },
  {
    path: 'freelancer/profile/edit',
    canActivate: [authGuard, roleGuard(['freelancer'])],
    loadComponent: () => import('./features/freelancer/profile-editor/profile-editor.component').then((m) => m.ProfileEditorComponent),
  },
  {
    path: 'freelancer/portfolio',
    canActivate: [authGuard, roleGuard(['freelancer'])],
    loadComponent: () => import('./features/freelancer/portfolio-editor/portfolio-editor.component').then((m) => m.PortfolioEditorComponent),
  },
  {
    path: 'freelancers',
    loadComponent: () => import('./features/freelancers/list/freelancer-list.component').then((m) => m.FreelancerListComponent),
  },
  {
    path: 'freelancers/:id',
    loadComponent: () => import('./features/freelancers/detail/freelancer-detail.component').then((m) => m.FreelancerDetailComponent),
  },
  {
    path: 'briefs',
    loadComponent: () => import('./features/briefs/list/brief-list.component').then((m) => m.BriefListComponent),
  },
  {
    path: 'briefs/new',
    canActivate: [authGuard, roleGuard(['client'])],
    loadComponent: () => import('./features/briefs/form/brief-form.component').then((m) => m.BriefFormComponent),
  },
  {
    path: 'briefs/:id',
    loadComponent: () => import('./features/briefs/detail/brief-detail.component').then((m) => m.BriefDetailComponent),
  },
  { path: '**', redirectTo: '' },
];
