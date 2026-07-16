import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environment/environment';

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string;
  tenant_name: string;
  is_platform_admin: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: SessionUser;
}

const TOKEN_KEY = 'kontia_token';
const USER_KEY = 'kontia_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly user = signal<SessionUser | null>(
    JSON.parse(localStorage.getItem(USER_KEY) ?? 'null')
  );
  readonly isLoggedIn = computed(() => this.token() !== null);
  readonly isPlatformAdmin = computed(() => this.user()?.is_platform_admin ?? false);

  async login(email: string, password: string): Promise<void> {
    const r = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        email,
        password,
      })
    );
    localStorage.setItem(TOKEN_KEY, r.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(r.user));
    this.token.set(r.access_token);
    this.user.set(r.user);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }
}