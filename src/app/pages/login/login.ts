import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Auth } from '../../core/auth/auth';
import { APP_ROUTES } from '../../core/constants/app-constants';

type LoginError = 'invalid_credentials' | 'rate_limited' | 'network_error' | null;

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<LoginError>(null);

  protected async submit(): Promise<void> {
    if (this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigate([`/${APP_ROUTES.HOME}`]);
    } catch (err: unknown) {
      this.error.set(this.mapError(err));
    } finally {
      this.loading.set(false);
    }
  }

  private mapError(err: unknown): LoginError {
    const status = (err as { status?: number })?.status;
    if (status === 401) return 'invalid_credentials';
    if (status === 429) return 'rate_limited';
    return 'network_error';
  }
}
