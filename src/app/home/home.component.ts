import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {

  activeSlide = 0;
  progressWidth = 0;

  private progressInterval: any;
  private readonly SLIDE_DURATION = 4000; // ms per slide
  private readonly PROGRESS_TICK = 50;    // ms tick for progress bar

  stats = [
    { img: 'assets/Images/PAD.jpeg',       label: 'SMS Care Pads — Premium Pack' },
    { img: 'assets/Images/LOGO/Logo.jpeg', label: 'SMS Foundation — ISO Certified' },
    { img: 'assets/Images/PAD.jpeg',       label: 'Anion Technology Pads' },
    { img: 'assets/Images/LOGO/Logo.jpeg', label: 'Day & Night Protection' },
  ];

  features = [
    { icon: 'fas fa-leaf',               title: 'Eco Friendly',     description: 'Sustainable materials caring for both women and the environment.' },
    { icon: 'fas fa-shield-alt',         title: 'ISO Certified',    description: 'ISO 9001:2015 certified quality ensuring the highest standards.' },
    { icon: 'fas fa-heartbeat',          title: 'Health First',     description: 'Advanced Anion technology for superior health protection.' },
    { icon: 'fas fa-users',              title: 'Community Driven', description: 'Pan-India network empowering thousands of women.' },
    { icon: 'fas fa-award',              title: 'Trusted Brand',    description: 'Trusted by 10,000+ members nationwide with proven quality.' },
    { icon: 'fas fa-hand-holding-heart', title: 'Social Impact',    description: 'Every purchase contributes to women empowerment.' },
  ];

  constructor(private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.startCarousel();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
  }

  startCarousel(): void {
    this.progressWidth = 0;
    let elapsed = 0;

    // Run outside Angular zone for performance, then re-enter when state changes
    this.ngZone.runOutsideAngular(() => {
      this.progressInterval = setInterval(() => {
        elapsed += this.PROGRESS_TICK;

        this.ngZone.run(() => {
          this.progressWidth = (elapsed / this.SLIDE_DURATION) * 100;

          if (elapsed >= this.SLIDE_DURATION) {
            elapsed = 0;
            this.progressWidth = 0;
            this.activeSlide = (this.activeSlide + 1) % this.stats.length;
          }

          this.cdr.markForCheck();
        });
      }, this.PROGRESS_TICK);
    });
  }

  stopCarousel(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  nextSlide(): void {
    this.stopCarousel();
    this.activeSlide = (this.activeSlide + 1) % this.stats.length;
    this.progressWidth = 0;
    this.startCarousel();
  }

  prevSlide(): void {
    this.stopCarousel();
    this.activeSlide = (this.activeSlide - 1 + this.stats.length) % this.stats.length;
    this.progressWidth = 0;
    this.startCarousel();
  }

  goToSlide(index: number): void {
    if (index === this.activeSlide) return;
    this.stopCarousel();
    this.activeSlide = index;
    this.progressWidth = 0;
    this.startCarousel();
  }
}
