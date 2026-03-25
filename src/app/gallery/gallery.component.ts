import { Component, HostListener } from '@angular/core';

interface GalleryImage {
  src: string;
  alt: string;
  category: string;
}

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss']
})
export class GalleryComponent {
  galleryImages: GalleryImage[] = [
    { src: 'assets/images/gallery/event1.jpg', alt: 'Health Awareness Camp', category: 'events' },
    { src: 'assets/images/gallery/event2.jpg', alt: 'Product Distribution Drive', category: 'events' },
    { src: 'assets/images/gallery/product1.jpg', alt: 'SMS Care Sanitary Pads', category: 'products' },
    { src: 'assets/images/gallery/product2.jpg', alt: 'Product Packaging', category: 'products' },
    { src: 'assets/images/gallery/community1.jpg', alt: 'Community Meeting', category: 'community' },
    { src: 'assets/images/gallery/community2.jpg', alt: 'Women Empowerment Program', category: 'community' },
    { src: 'assets/images/gallery/training1.jpg', alt: 'Worker Training Session', category: 'training' },
    { src: 'assets/images/gallery/training2.jpg', alt: 'Awareness Workshop', category: 'training' },
    { src: 'assets/images/gallery/team1.jpg', alt: 'Foundation Team', category: 'team' },
    { src: 'assets/images/gallery/event3.jpg', alt: 'Health Check-up Camp', category: 'events' },
    { src: 'assets/images/gallery/event4.jpg', alt: 'Distribution Event', category: 'events' },
    { src: 'assets/images/gallery/product3.jpg', alt: 'Product Display', category: 'products' }
  ];

  filteredImages: GalleryImage[] = [...this.galleryImages];
  selectedCategory = 'all';
  lightboxVisible = false;
  currentImage: GalleryImage | null = null;
  currentIndex = 0;

  filterImages(category: string) {
    this.selectedCategory = category;
    if (category === 'all') {
      this.filteredImages = [...this.galleryImages];
    } else {
      this.filteredImages = this.galleryImages.filter(img => img.category === category);
    }
    this.currentIndex = 0;
  }

  openLightbox(image: GalleryImage) {
    this.currentImage = image;
    this.lightboxVisible = true;
    this.currentIndex = this.filteredImages.findIndex(img => img.src === image.src);
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.lightboxVisible = false;
    document.body.style.overflow = 'auto';
  }

  prevImage() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.currentImage = this.filteredImages[this.currentIndex];
    }
  }

  nextImage() {
    if (this.currentIndex < this.filteredImages.length - 1) {
      this.currentIndex++;
      this.currentImage = this.filteredImages[this.currentIndex];
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    if (this.lightboxVisible) {
      this.closeLightbox();
    }
  }

  @HostListener('document:keydown.arrowleft')
  onLeftArrow() {
    if (this.lightboxVisible) {
      this.prevImage();
    }
  }

  @HostListener('document:keydown.arrowright')
  onRightArrow() {
    if (this.lightboxVisible) {
      this.nextImage();
    }
  }
}
