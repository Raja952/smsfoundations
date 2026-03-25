import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  isScrolled = false;
  isHeaderVisible = true;
  isMenuOpen = false;
  isDropdownOpen = false;
  isSignupOpen = false;
  isMobileProductsOpen = false;
  
  private lastScrollTop = 0;
  private scrollThreshold = 100;

  constructor(private router: Router) {}

  ngOnInit() {
    // Close mobile menu on route change
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.closeMenu();
      }
    });
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Scrolled state for navbar styling
    this.isScrolled = scrollTop > 20;
    
    // Hide/show header based on scroll direction
    if (Math.abs(scrollTop - this.lastScrollTop) > this.scrollThreshold) {
      if (scrollTop > this.lastScrollTop && scrollTop > 200) {
        this.isHeaderVisible = false;
      } else {
        this.isHeaderVisible = true;
      }
      this.lastScrollTop = scrollTop;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    // Close signup dropdown if clicked outside
    if (!target.closest('.signup-dropdown')) {
      this.isSignupOpen = false;
    }
    
    // Close products dropdown if clicked outside
    if (!target.closest('.nav-dropdown')) {
      this.isDropdownOpen = false;
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      this.isMobileProductsOpen = false;
    }
  }

  closeMenu() {
    this.isMenuOpen = false;
    document.body.style.overflow = '';
    this.isMobileProductsOpen = false;
    this.isDropdownOpen = false;
    this.isSignupOpen = false;
  }

  toggleDropdown(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.isSignupOpen = false;
    }
  }

  toggleSignupDropdown(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.isSignupOpen = !this.isSignupOpen;
    if (this.isSignupOpen) {
      this.isDropdownOpen = false;
    }
  }

  toggleMobileProducts(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.isMobileProductsOpen = !this.isMobileProductsOpen;
  }

  closeDropdown() {
    this.isDropdownOpen = false;
  }
}