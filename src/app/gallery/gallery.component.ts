import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';

interface GalleryImage {
  src: string;
  alt: string;
  category: string;
  featured?: boolean;
}

interface VideoItem {
  thumbnail: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  views: string;
  date: string;
  playing?: boolean;
  url?: string;
}

interface TrainingItem {
  image: string;
  title: string;
  description: string;
  type: string;
  date: string;
  location: string;
  participants: string;
  duration: string;
  trainer: string;
  highlights: string[];
}

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss']
})
export class GalleryComponent implements OnInit, OnDestroy {

  activeTab: 'photos' | 'videos' | 'training' = 'photos';
  tabSliderStyle = 'translateX(0%)';
  selectedCategory = 'all';
  carouselIndex = 0;
  private carouselTimer: any;

  galleryImages: GalleryImage[] = [
    { src: 'assets/Images/Gallary/1st.jpeg', alt: 'Foundation Community Meeting',        category: 'community', featured: true },
    { src: 'assets/Images/Gallary/2nd.jpeg', alt: 'SMS Foundation Awareness Session',    category: 'events',    featured: true },
    { src: 'assets/Images/Gallary/3rd.jpeg', alt: 'Product Distribution & Kit Handover', category: 'products',  featured: true },
    { src: 'assets/Images/Gallary/4th.jpeg', alt: 'Foundation Leadership',               category: 'team',      featured: true },
    { src: 'assets/Images/Gallary/5th.jpeg', alt: 'Mahila Sankalp Foundation Event',     category: 'events',    featured: true },
  ];

  filteredImages: GalleryImage[] = [...this.galleryImages];

  get featuredImages(): GalleryImage[] {
    return this.galleryImages.filter(img => img.featured);
  }

  activeVideo: VideoItem | null = null;

  videos: VideoItem[] = [
    { thumbnail: 'assets/Images/Gallary/1st.jpeg', title: 'Health Awareness Campaign 2024',     description: 'A comprehensive campaign covering menstrual health and hygiene awareness across rural communities in Maharashtra.', category: 'events',    duration: '4:32',  views: '1.2K views', date: 'Dec 2024' },
    { thumbnail: 'assets/Images/Gallary/5th.jpeg', title: 'Product Launch — SMS Care',          description: 'Official launch of our new line of affordable sanitary products with Anion technology.',                          category: 'products',  duration: '6:15',  views: '3.4K views', date: 'Nov 2024' },
    { thumbnail: 'assets/Images/Gallary/2nd.jpeg', title: 'Women Empowerment Workshop',         description: 'Field workers sharing experiences from the ground and discussing impact stories from rural Maharashtra.',           category: 'community', duration: '8:47',  views: '980 views',  date: 'Oct 2024' },
    { thumbnail: 'assets/Images/Gallary/3rd.jpeg', title: 'Distribution Drive — Kit Handover',  description: 'Monthly distribution drive reaching over 500 households in Andheri East and surrounding areas.',                  category: 'events',    duration: '3:20',  views: '2.1K views', date: 'Sep 2024' },
    { thumbnail: 'assets/Images/Gallary/4th.jpeg', title: 'Foundation Director Address',        description: 'Training session for new field workers covering product knowledge, community outreach, and reporting.',            category: 'training',  duration: '12:05', views: '760 views',  date: 'Aug 2024' },
  ];

  trainingSlide = 0;

  trainingItems: TrainingItem[] = [
    {
      image: 'assets/Images/Gallary/2nd.jpeg',
      title: 'Menstrual Health Educator Training',
      description: 'Intensive 2-day program equipping field workers with knowledge to educate communities on menstrual health, hygiene practices, and product usage.',
      type: 'health', date: 'January 15, 2025', location: 'Andheri East, Mumbai',
      participants: '42', duration: '2 Days', trainer: 'Dr. Priya',
      highlights: ['Menstrual cycle education fundamentals', 'Community communication techniques', 'Product demonstration skills', 'Record keeping and reporting'],
    },
    {
      image: 'assets/Images/Gallary/5th.jpeg',
      title: 'Field Worker Sales & Distribution',
      description: 'Hands-on training covering product distribution logistics, commission structure understanding, and sales techniques for rural markets.',
      type: 'sales', date: 'February 8, 2025', location: 'Goregaon, Mumbai',
      participants: '38', duration: '1 Day', trainer: 'Suresh M.',
      highlights: ['Commission structure deep-dive', 'Rural market sales strategy', 'Inventory management basics', 'Digital reporting tools'],
    },
    {
      image: 'assets/Images/Gallary/1st.jpeg',
      title: 'Community Leadership Workshop',
      description: 'Leadership development program for senior members and team leads, focusing on building and managing grassroots community networks.',
      type: 'leadership', date: 'March 22, 2025', location: 'Dharavi, Mumbai',
      participants: '25', duration: '3 Days', trainer: 'Meena Shah',
      highlights: ['Team building and motivation', 'Conflict resolution strategies', 'Goal setting frameworks', 'Reporting to foundation HQ'],
    },
    {
      image: 'assets/Images/Gallary/3rd.jpeg',
      title: 'Digital Literacy for Workers',
      description: 'Basic digital skills training covering smartphone usage, WhatsApp communication, online order tracking, and digital payments.',
      type: 'digital', date: 'April 5, 2025', location: 'Kurla, Mumbai',
      participants: '55', duration: '1 Day', trainer: 'Rahul K.',
      highlights: ['Smartphone basics & safety', 'WhatsApp groups management', 'Order tracking systems', 'UPI & digital payments'],
    },
  ];

  particles = Array.from({ length: 18 }, () => ({
    x: Math.random() * 100 + '%',
    y: Math.random() * 100 + '%',
    delay: Math.random() * 4 + 's',
    size: (Math.random() * 3 + 2) + 'px',
  }));

  lightboxVisible = false;
  currentImage: GalleryImage | null = null;
  currentIndex = 0;

  ngOnInit(): void {
    this.activeVideo = this.videos[0];
    this.startCarouselAuto();
  }

  ngOnDestroy(): void {
    clearInterval(this.carouselTimer);
  }

  switchTab(tab: 'photos' | 'videos' | 'training'): void {
    this.activeTab = tab;
    const idx = ['photos', 'videos', 'training'].indexOf(tab);
    this.tabSliderStyle = `translateX(${idx * 100}%)`;
  }

  filterImages(category: string): void {
    this.selectedCategory = category;
    this.filteredImages = category === 'all'
      ? [...this.galleryImages]
      : this.galleryImages.filter(img => img.category === category);
    this.carouselIndex = 0;
  }

  startCarouselAuto(): void {
    this.carouselTimer = setInterval(() => { this.nextCarousel(); }, 4000);
  }

  nextCarousel(): void {
    this.carouselIndex = (this.carouselIndex + 1) % this.featuredImages.length;
  }

  prevCarousel(): void {
    this.carouselIndex = (this.carouselIndex - 1 + this.featuredImages.length) % this.featuredImages.length;
  }

  setActiveVideo(v: VideoItem): void {
    this.activeVideo = v;
    window.scrollTo({ top: 400, behavior: 'smooth' });
  }

  playVideo(v: VideoItem): void { v.playing = !v.playing; }

  nextTraining(): void { if (this.trainingSlide < this.trainingItems.length - 1) { this.trainingSlide++; } }
  prevTraining(): void { if (this.trainingSlide > 0) { this.trainingSlide--; } }

  openLightbox(image: GalleryImage, index: number): void {
    this.currentImage = image;
    this.currentIndex = index;
    this.lightboxVisible = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxVisible = false;
    document.body.style.overflow = '';
  }

  prevImage(): void {
    if (this.currentIndex > 0) { this.currentIndex--; this.currentImage = this.filteredImages[this.currentIndex]; }
  }

  nextImage(): void {
    if (this.currentIndex < this.filteredImages.length - 1) { this.currentIndex++; this.currentImage = this.filteredImages[this.currentIndex]; }
  }

  @HostListener('document:keydown.escape') onEscape() { if (this.lightboxVisible) this.closeLightbox(); }
  @HostListener('document:keydown.arrowleft') onLeft() { if (this.lightboxVisible) this.prevImage(); }
  @HostListener('document:keydown.arrowright') onRight() { if (this.lightboxVisible) this.nextImage(); }
}
