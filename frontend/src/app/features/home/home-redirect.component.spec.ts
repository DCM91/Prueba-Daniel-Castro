import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { HomeRedirectComponent } from './home-redirect.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/types/auth.types';

describe('HomeRedirectComponent', () => {
  const makeUser = (role: User['role']): User => ({
    id: 1,
    name: 'Test',
    email: 'test@example.com',
    role,
    created_at: null,
  });

  const createComponent = (user: User | null) => {
    const navigateByUrl = jest.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: () => user, homePathFor: (r: User['role']) => `/home/${r === 'freelancer' ? 'freelancer' : 'client'}` } },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });
    TestBed.createComponent(HomeRedirectComponent);
    return navigateByUrl;
  };

  it('redirects freelancers to /home/freelancer', () => {
    const navigateByUrl = createComponent(makeUser('freelancer'));
    expect(navigateByUrl).toHaveBeenCalledWith('/home/freelancer');
  });

  it('redirects clients to /home/client', () => {
    const navigateByUrl = createComponent(makeUser('client'));
    expect(navigateByUrl).toHaveBeenCalledWith('/home/client');
  });

  it('redirects to /login when there is no authenticated user', () => {
    const navigateByUrl = createComponent(null);
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
