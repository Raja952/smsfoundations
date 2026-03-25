import { Component, OnInit, HostListener } from '@angular/core';
import * as $ from 'jquery';
import { Modal } from 'bootstrap';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Contact {
  name: string;
  role: string;
  img: string;
  alt: string;
  bio?: string;
  phone?: string;
  email?: string;
}

interface HoverPosition {
  x: number;
  y: number;
}

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent implements OnInit {
  contactForm: FormGroup;
  submitted = false;
  loading: any = false;
  successMessage = '';
  errorMessage = '';

  // For member modal (Contact type)
  selectedMember: Contact | null = null;
  showModal = false;

  // For team member details modal (different from Contact)
  selectedMemberDetails: any = null;
  showMemberModal = false;

  // For hover functionality
  hoveredMember: Contact | null = null;
  hoverPosition: HoverPosition = { x: 0, y: 0 };
  hoverTimeout: any;

  members = [
    {
      id: 1,
      name: 'Mr. Kanahiya Lal Yadav',
      image: 'assets/Images/LOGO/Logo.jpeg',
      description: `Mr. Kanahiya Lal Yadav is a respected member of SMS Foundation.
      He actively contributes to social welfare initiatives and helps strengthen
      community support programs across Mumbai.`
    }
  ];

  Contacts: Contact[] = [
    {
      name: 'Mr. S K Maurya',
      role: 'CMD',
      img: 'assets/Images/ContactUS/Mr . Sunil Maurya.jpeg',
      alt: 'Mr. S K Maurya',
      bio: 'Mr. S K Maurya is the CMD of SMS Foundation. He has dedicated his life to social welfare and community development across India, establishing programs that empower women and provide healthcare solutions.',
      phone: '+91 XXXXX XXXXX',
      email: 'infosmsfoundations@gmail.com'
    },
    {
      name: 'Mr. K L Yadav',
      role: 'MD',
      img: 'assets/Images/ContactUS/Mr . Kanahiya LAl Yadav.jpeg',
      alt: 'Mr. K L Yadav',
      bio: 'Mr. K L Yadav is a respected MD of SMS Foundation. He actively contributes to social welfare initiatives and helps strengthen community support programs across Mumbai.',
      phone: '+91 XXXXX XXXXX',
      email: 'infosmsfoundations@gmail.com'
    },
    {
      name: 'Mr. L J Rajbhar',
      role: 'CEO',
      img: 'assets/Images/ContactUS/Mr . LalJI Rajbhar.jpeg',
      alt: 'Mr. L J Rajbhar',
      bio: 'Mr. L J Rajbhar is the CEO of SMS Foundation. He plays a vital role in expanding the foundation\'s reach and managing operations across multiple states.',
      phone: '+91 XXXXX XXXXX',
      email: 'infosmsfoundations@gmail.com'
    },
    {
      name: 'Mr. Pankaj',
      role: 'Member',
      img: '',
      alt: 'Mr. Pankaj',
      bio: 'Mr. Pankaj is an active member of SMS Foundation, contributing to health awareness campaigns and community outreach programs.'
    },
    {
      name: 'Mr. Mandeep',
      role: 'Member',
      img: '',
      alt: 'Mr. Mandeep',
      bio: 'Mr. Mandeep is a dedicated member supporting SMS Foundation\'s mission through field operations and volunteer coordination.'
    },
    {
      name: 'Ms. Anjali',
      role: 'Member',
      img: '',
      alt: 'Ms. Anjali',
      bio: 'Ms. Anjali is a passionate member of SMS Foundation focused on women empowerment and health education initiatives.'
    },
    {
      name: 'Mr. Rakesh',
      role: 'Member',
      img: '',
      alt: 'Mr. Rakesh',
      bio: 'Mr. Rakesh actively participates in social welfare activities and helps coordinate SMS Foundation programs at the grassroots level.'
    }
  ];

  constructor(private formBuilder: FormBuilder) {
    this.contactForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: [''],
      message: ['', Validators.required]
    });
  }

  ngOnInit(): void { }

  // Clean up timeout on component destroy
  ngOnDestroy(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    document.body.style.overflow = ''; // Reset body overflow
  }

  // Convenience getter for easy access to form fields
  get f() {
    return this.contactForm.controls;
  }

  // Helper methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched || this.submitted)) : false;
  }

  getFieldError(fieldName: string, errorType: string): boolean {
    const field = this.contactForm.get(fieldName);
    return field ? (field.hasError(errorType) && (field.dirty || field.touched || this.submitted)) : false;
  }

  onSubmit() {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    // Stop here if form is invalid
    if (this.contactForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      return;
    }

    this.loading = true;

    // Simulate API call
    setTimeout(() => {
      console.log('Form submitted successfully:', this.contactForm.value);
      this.loading = false;
      this.successMessage = 'Your message has been sent successfully! We will get back to you soon.';
      this.submitted = false;
      this.contactForm.reset();
    }, 2000);
  }

  openMemberModal(id: number) {
    this.selectedMemberDetails = this.members.find(m => m.id === id);
    
    if (this.selectedMemberDetails) {
      this.showMemberModal = true;
      this.GetDetails(); // Call Bootstrap modal
    }
  }

  GetDetails() {
    const modalElement = document.getElementById('memberModal');
    if (modalElement) {
      const modal = Modal.getOrCreateInstance(modalElement);
      modal.show();
    }
  }

  closeMemberModal() {
    this.showMemberModal = false;
    this.selectedMemberDetails = null;
    
    // Also close Bootstrap modal if open
    const modalElement = document.getElementById('memberModal');
    if (modalElement) {
      const modal = Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  /**
   * Opens modal with member details
   * @param member The member to display
   * @param event Optional mouse event for hover positioning
   */
  openModal(member: Contact, event?: MouseEvent): void {
    // Clear any pending hover timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }

    // Set hovered member and position if event exists
    if (event) {
      this.hoveredMember = member;
      this.hoverPosition = {
        x: event.clientX + 15,
        y: event.clientY - 50
      };
    }

    this.selectedMember = member;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  /**
   * Opens modal with hover delay (for better UX)
   */
  openModalWithHover(member: Contact, event?: MouseEvent): void {
    // Clear any existing timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }

    // Set timeout to open modal after 300ms hover
    this.hoverTimeout = setTimeout(() => {
      this.openModal(member, event);
    }, 300);
  }

  /**
   * Closes the modal
   */
  closeModal(): void {
    // Clear any pending hover timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }

    this.showModal = false;
    this.selectedMember = null;
    this.hoveredMember = null;
    document.body.style.overflow = '';
  }

  /**
   * Handles mouse enter on member card
   */
  onMouseEnter(member: Contact, event: MouseEvent): void {
    this.openModalWithHover(member, event);
  }

  /**
   * Handles mouse leave on member card
   */
  onMouseLeave(): void {
    // Clear timeout if mouse leaves before modal opens
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    
    // Only close if modal is not shown
    if (!this.showModal) {
      this.hoveredMember = null;
    }
  }

  /**
   * Handles image error - replaces with avatar
   */
  onImageError(member: Contact): void {
    member.img = ''; // This will trigger avatar display
  }

  /**
   * Gets initials from name for avatar
   */
  getInitials(name: string): string {
    if (!name) return '';
    
    return name.trim().split(' ')
      .filter(word => word.length > 0)
      .slice(0, 2)
      .map(word => word[0].toUpperCase())
      .join('');
  }

  /**
   * Truncates text to specified length
   */
  truncateText(text: string, length: number): string {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  /**
   * Handles keyboard events for accessibility
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapePress(event: KeyboardEvent): void {
    if (this.showModal) {
      this.closeModal();
    }
    if (this.showMemberModal) {
      this.closeMemberModal();
    }
  }

  /**
   * Handles click outside for modals (optional)
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const modal = document.querySelector('.member-modal');
    const backdrop = document.querySelector('.modal-backdrop');
    
    // If click is on backdrop, close modal
    if (backdrop && event.target === backdrop) {
      this.closeModal();
    }
  }
}