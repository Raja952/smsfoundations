import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {

  isScrolled            = false;
  isHeaderVisible       = true;
  isMenuOpen            = false;
  isDropdownOpen        = false;
  isSignupOpen          = false;
  isUserDropdownOpen    = false;
  isMobileProductsOpen  = false;

  isLoggedIn  = false;
  userName    = '';
  userRole    = '';   // 'Admin' | 'Member' | 'Worker'

  private lastScrollTop  = 0;
  private scrollThreshold = 100;
  private routerSub!: Subscription;
  private storageListener = () => this.checkLoginStatus();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkLoginStatus();

    // Re-check on storage change (login/logout from another tab)
    window.addEventListener('storage', this.storageListener);

    // Close menu on every route change
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeMenu());
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.storageListener);
    this.routerSub?.unsubscribe();
  }

  // ── Auth ─────────────────────────────────────────────────────
  checkLoginStatus(): void {
    // ← KEY FIX: read 'sms_user' — same key login.component saves to
    const raw = localStorage.getItem('sms_user');
    if (raw) {
      try {
        const user      = JSON.parse(raw);
        this.isLoggedIn = true;
        this.userName   = user.fullName || user.firstName || user.email || 'User';
        this.userRole   = user.userType || '';
      } catch {
        this.isLoggedIn = false;
        this.userName   = '';
        this.userRole   = '';
      }
    } else {
      this.isLoggedIn = false;
      this.userName   = '';
      this.userRole   = '';
    }
  }

  logout(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    localStorage.removeItem('sms_user');
    localStorage.removeItem('auth_token');

    this.isLoggedIn        = false;
    this.userName          = '';
    this.userRole          = '';
    this.isUserDropdownOpen = false;
    this.isSignupOpen       = false;
    this.isDropdownOpen     = false;

    this.closeMenu();
    this.router.navigate(['/']);
  }

  get userInitial(): string {
    return this.userName?.charAt(0)?.toUpperCase() || 'U';
  }

  get isAdmin():  boolean { return this.userRole?.toLowerCase() === 'admin';  }
  get isMember(): boolean { return this.userRole?.toLowerCase() === 'member'; }
  get isWorker(): boolean { return this.userRole?.toLowerCase() === 'worker'; }

  // ── Scroll ───────────────────────────────────────────────────
  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    this.isScrolled = scrollTop > 20;

    if (Math.abs(scrollTop - this.lastScrollTop) > this.scrollThreshold) {
      this.isHeaderVisible = !(scrollTop > this.lastScrollTop && scrollTop > 200);
      this.lastScrollTop   = scrollTop;
    }
  }

  // ── Click outside ────────────────────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const t = event.target as HTMLElement;
    if (!t.closest('.signup-dropdown')) { this.isSignupOpen       = false; }
    if (!t.closest('.nav-dropdown'))    { this.isDropdownOpen     = false; }
    if (!t.closest('.user-dropdown'))   { this.isUserDropdownOpen = false; }
  }

  // ── Menu toggles ─────────────────────────────────────────────
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
    if (!this.isMenuOpen) { this.isMobileProductsOpen = false; }
  }

  closeMenu(): void {
    this.isMenuOpen           = false;
    this.isMobileProductsOpen = false;
    this.isDropdownOpen       = false;
    this.isSignupOpen         = false;
    this.isUserDropdownOpen   = false;
    document.body.style.overflow = '';
  }

  toggleDropdown(event: Event): void {
    event.preventDefault(); event.stopPropagation();
    this.isDropdownOpen  = !this.isDropdownOpen;
    this.isSignupOpen    = false;
    this.isUserDropdownOpen = false;
  }

  toggleSignupDropdown(event: Event): void {
    event.preventDefault(); event.stopPropagation();
    this.isSignupOpen    = !this.isSignupOpen;
    this.isDropdownOpen  = false;
    this.isUserDropdownOpen = false;
  }

  toggleUserDropdown(event: Event): void {
    event.preventDefault(); event.stopPropagation();
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
    this.isDropdownOpen     = false;
    this.isSignupOpen       = false;
  }

  toggleMobileProducts(event: Event): void {
    event.preventDefault(); event.stopPropagation();
    this.isMobileProductsOpen = !this.isMobileProductsOpen;
  }

  closeDropdown(): void { this.isDropdownOpen = false; }

  // ── Navigation ───────────────────────────────────────────────
  goToProfile(): void   { this.router.navigate(['/dashboard']); this.closeMenu(); }
  goToDashboard(): void { this.router.navigate(['/dashboard']); this.closeMenu(); }
}
