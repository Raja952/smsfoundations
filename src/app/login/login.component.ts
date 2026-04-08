import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;
  loading      = false;
  errorMessage = '';
  showPassword = false;

   private apiUrl = 'https://vgfurnitureapi.runasp.net/api/Auth/login';
  //private apiUrl = 'https://localhost:7200/api/Auth/login';

  constructor(
    private fb:     FormBuilder,
    private http:   HttpClient,
    private router: Router,
    private cdr:    ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  isInvalid(field: string): boolean {
    const c = this.loginForm.get(field);
    return !!(c && c.invalid && c.touched);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading      = true;
    this.errorMessage = '';

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const payload = {
      email:    this.loginForm.value.email.trim().toLowerCase(),
      password: this.loginForm.value.password
    };

    try {
      const response = await firstValueFrom(
        this.http.post<any>(this.apiUrl, payload, { headers })
      );

      this.loading = false;

      console.log('Login response:', response); // remove after testing

      // ── FIX 1: API returns flat UserResponseDto — read directly from response.
      //    Fall back to response.user if your API wraps it.
      const userData = response.user || response;

      const userType       = (userData.userType       || userData.UserType       || '').trim();
      const fullName       = userData.fullName         || userData.FullName       || userData.firstName || '';
      const email          = userData.email            || userData.Email          || payload.email;
      const registrationNo = userData.registrationNo   || userData.RegistrationNo || userData.registrationNumber || '';
      const id             = userData.id               || userData.Id             || userData.nId || 0;

      // ── FIX 2: Save to 'sms_user' — same key the dashboard reads ──
      localStorage.setItem('sms_user', JSON.stringify({
        id,
        fullName,
        email,
        userType,           // 'Admin' | 'Member' | 'Worker'
        registrationNo,
        isActive:      userData.isActive      ?? true,
        paymentStatus: userData.paymentStatus || '',
      }));

      if (response.token) {
        localStorage.setItem('auth_token', response.token);
      }

      // ── FIX 3: Always navigate to /dashboard ──────────────────
      // Dashboard component reads userType from localStorage and
      // shows Admin view OR Member/Worker profile accordingly.
      this.router.navigate(['/dashboard']);

    } catch (error: any) {
      this.loading = false;

      if (error.status === 0) {
        this.errorMessage = 'Cannot reach the server. Please check your connection.';
      } else if (error.status === 400) {
        this.errorMessage = error.error?.error ?? error.error?.message ?? 'Invalid request.';
      } else if (error.status === 401) {
        this.errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.status === 404) {
        this.errorMessage = 'Account not found. Please register first.';
      } else if (error.status === 500) {
        this.errorMessage = 'Server error. Please try again later.';
      } else {
        this.errorMessage = error.error?.error ?? error.error?.message ?? 'Login failed. Please try again.';
      }

      this.cdr.detectChanges();
    }
  }
}
