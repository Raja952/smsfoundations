import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {

  signupForm!: FormGroup;
  isWorker       = false;
  loading        = false;
  successMessage = '';
  errorMessage   = '';
  selfCodeLoading = false;
  selectedTitle = '';

  activeTab: 'registration' | 'payment' | 'done' = 'registration';
  registrationNumber = '';
  selfCode = '';

  get upiLink(): string {
    const amount = this.isWorker ? '1200' : '200';
    return `upi://pay?pa=9594704311.etb@icici&pn=SMS Foundation&am=${amount}&cu=INR&tn=Registration Fee`;
  }
  get phonePeLink(): string {
    const amount = this.isWorker ? '1200' : '200';
    return `phonepe://pay?pa=9594704311.etb@icici&pn=SMS Foundation&am=${amount}&cu=INR&tn=Registration Fee`;
  }
  get gpayLink(): string {
    const amount = this.isWorker ? '1200' : '200';
    return `tez://upi/pay?pa=9594704311.etb@icici&pn=SMS Foundation&am=${amount}&cu=INR&tn=Registration Fee`;
  }
  get paytmLink(): string {
    const amount = this.isWorker ? '1200' : '200';
    return `paytmmp://pay?pa=9594704311.etb@icici&pn=SMS Foundation&am=${amount}&cu=INR&tn=Registration Fee`;
  }

  /*private apiUrl = 'https://vgfurnitureapi.runasp.net/api/Auth/register';*/
  private apiUrl = 'https://localhost:7200/api/Auth/register';
  private generateSelfCodeUrl = 'https://localhost:7200/api/Auth/generate-ourcode';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      this.isWorker = segments.some(s => s.path === 'worker');

      if (!this.signupForm) {
        this.buildForm();
        this.setConditionalValidators();
        this.setupTitleWatch();
      }
    });
  }

  switchTab(tab: 'registration' | 'payment' | 'done'): void {
    if (tab === 'payment' && !this.registrationNumber) return;
    if (tab === 'done' && !this.registrationNumber) return;
    this.activeTab = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private buildForm(): void {
    const defaultAmount = this.isWorker ? 1200 : 200;

    this.signupForm = this.fb.group({
      // Personal Information
      title: ['', Validators.required],
      fatherName: [''],
      husbandName: [''],
      fullName:   ['', Validators.required],
      dob:        ['', Validators.required],
      mobile:     ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email:      ['', [Validators.required, Validators.email]],
      aadhar:     ['', [Validators.required, Validators.pattern(/^[0-9]{12}$/)]],
      pan:        ['', [Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]],
      accountNo:  ['', [Validators.required, Validators.minLength(9), Validators.maxLength(20)]],
      address:    ['', Validators.required],

      // Worker Fields
      skill:        [''],
      workArea:     [''],
      experience:   [''],
      availability: [''],

      // Member Fields
      designation: [''],

      // Code Information Fields
      selfCode:           ['', Validators.required],
      selfRankName:       ['', Validators.required],
      referenceCode:      ['', Validators.required],
      referenceRankName:  ['', Validators.required],

      // Payment
      utr:    [''],
      amount: [defaultAmount, Validators.required],

      // Terms
      terms: [false, Validators.requiredTrue],
    });
  }

  private setupTitleWatch(): void {
    // Watch for title changes to manage father/husband name validators
    this.signupForm.get('title')?.valueChanges.subscribe(title => {
      this.selectedTitle = title;
      
      const fatherNameControl = this.signupForm.get('fatherName');
      const husbandNameControl = this.signupForm.get('husbandName');
      
      if (title === 'Mr') {
        // For Mr: Father name is required, husband name is not
        fatherNameControl?.setValidators([Validators.required]);
        husbandNameControl?.clearValidators();
        husbandNameControl?.setValue('');
      } else if (title === 'Miss') {
        // For Miss: Husband name is required, father name is not
        husbandNameControl?.setValidators([Validators.required]);
        fatherNameControl?.clearValidators();
        fatherNameControl?.setValue('');
      } else {
        // No title selected: clear both
        fatherNameControl?.clearValidators();
        husbandNameControl?.clearValidators();
      }
      
      fatherNameControl?.updateValueAndValidity();
      husbandNameControl?.updateValueAndValidity();
    });
  }

  private setConditionalValidators(): void {
    if (this.isWorker) {
      // Worker validators
      const workerFields = ['skill', 'workArea', 'experience', 'availability'];
      workerFields.forEach(f => {
        this.signupForm.get(f)?.setValidators(Validators.required);
        this.signupForm.get(f)?.updateValueAndValidity();
      });
      
      // Clear member field validators
      this.signupForm.get('designation')?.clearValidators();
      this.signupForm.get('designation')?.updateValueAndValidity();
      
      this.signupForm.get('amount')?.setValue(1200);
      
    } else {
      // Member validators
      const workerFields = ['skill', 'workArea', 'experience', 'availability'];
      workerFields.forEach(f => {
        this.signupForm.get(f)?.clearValidators();
        this.signupForm.get(f)?.setValue('');
        this.signupForm.get(f)?.updateValueAndValidity();
      });
      
      // Set member field validators
      this.signupForm.get('designation')?.setValidators(Validators.required);
      this.signupForm.get('designation')?.updateValueAndValidity();
      
      this.signupForm.get('amount')?.setValue(200);
    }

    // Code fields are always required
    const codeFields = ['selfCode', 'selfRankName', 'referenceCode', 'referenceRankName'];
    codeFields.forEach(field => {
      this.signupForm.get(field)?.setValidators(Validators.required);
      this.signupForm.get(field)?.updateValueAndValidity();
    });
  }

  isInvalid(field: string): boolean {
    const control = this.signupForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  toUpperCase(field: string): void {
    const control = this.signupForm.get(field);
    if (control) {
      control.setValue(control.value?.toUpperCase(), { emitEvent: false });
    }
  }

  onQrClick(event: MouseEvent): void {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) {
      event.preventDefault();
    }
  }

  private getInvalidFields(): string[] {
    return Object.keys(this.signupForm.controls)
      .filter(key => this.signupForm.get(key)?.invalid)
      .map(key => `${key}: ${JSON.stringify(this.signupForm.get(key)?.errors)}`);
  }

  private prepareRegistrationData(): RegisterUserDto {
    const f = this.signupForm.value;

    let formattedDob = '';
    try {
      formattedDob = new Date(f.dob).toISOString().split('T')[0];
    } catch {
      formattedDob = f.dob;
    }

    // Determine father/husband name based on title
    let fatherName = '';
    let husbandName = '';
    
    if (f.title === 'Mr') {
      fatherName = f.fatherName?.trim() || '';
      husbandName = '';
    } else if (f.title === 'Miss') {
      fatherName = '';
      husbandName = f.husbandName?.trim() || '';
    }

    return {
      userType: this.isWorker ? 'Worker' : 'Member',
      title: f.title,
      fullName: f.fullName?.trim(),
      fatherName: fatherName,
      husbandName: husbandName,
      dateOfBirth: formattedDob,
      mobileNumber: f.mobile?.trim(),
      email: f.email?.trim().toLowerCase(),
      aadhaarNumber: f.aadhar?.trim(),
      panNumber: f.pan?.trim().toUpperCase() || null,
      accountNumber: f.accountNo?.trim(),
      address: f.address?.trim(),
      skill: f.skill || null,
      workArea: f.workArea?.trim() || null,
      experience: f.experience || null,
      availability: f.availability || null,
      designation: f.designation?.trim() || null,
      selfCode: f.selfCode?.trim(),
      selfRankName: f.selfRankName?.trim(),
      referenceCode: f.referenceCode?.trim(),
      referenceRankName: f.referenceRankName?.trim(),
      utrNumber: f.utr?.trim() || 'PENDING',
      amount: parseFloat(f.amount) || (this.isWorker ? 1200 : 200),
      termsAccepted: f.terms
    };
  }

  async onSubmit(): Promise<void> {
    // Validate title is selected
    const titleControl = this.signupForm.get('title');
    if (!titleControl?.value) {
      titleControl?.markAsTouched();
      this.errorMessage = 'Please select a title (Mr./Miss)';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      console.error('Invalid fields →', this.getInvalidFields());
      this.errorMessage = 'Please fill all required fields correctly.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    try {
      const payload = this.prepareRegistrationData();
      console.log('Payload →', payload);

      const response = await firstValueFrom(
        this.http.post<ApiResponse>(this.apiUrl, payload, { headers })
      );

      this.loading = false;

      this.registrationNumber = response.user?.registrationNumber ?? '';
      this.selfCode = response.user?.selfCode ?? response.selfCode ?? this.selfCode;

      if (this.selfCode && this.signupForm.get('selfCode')?.value !== this.selfCode) {
        this.signupForm.get('selfCode')?.setValue(this.selfCode);
        this.cdr.detectChanges();
      }

      this.successMessage = response.message ??
        (this.isWorker
          ? 'Worker registration successful! Proceeding to payment...'
          : 'Member registration successful! Proceeding to payment...');

      if (this.registrationNumber) {
        this.successMessage += ` | Reg No: ${this.registrationNumber}`;
      }
      if (this.selfCode) {
        this.successMessage += ` | Self Code: ${this.selfCode}`;
      }

      setTimeout(() => {
        this.activeTab = 'payment';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.cdr.detectChanges();
      }, 1500);

    } catch (error: any) {
      this.loading = false;
      console.error('API Error →', error);

      if (error.status === 0) {
        this.errorMessage = 'Cannot reach the server. Please check your connection.';
      } else if (error.status === 400) {
        if (error.error?.errors) {
          const ve = error.error.errors as Record<string, string[]>;
          this.errorMessage = Object.values(ve).flat().join(' ');
        } else {
          this.errorMessage = error.error?.error ?? error.error?.message ?? 'Bad request. Please check your inputs.';
        }
      } else if (error.status === 409) {
        this.errorMessage = 'This email or Aadhaar is already registered.';
      } else if (error.status === 500) {
        this.errorMessage = 'Server error. Please try again later.';
      } else {
        this.errorMessage = error.error?.error ?? error.error?.message ?? 'Registration failed. Please try again.';
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.cdr.detectChanges();
    }
  }

  confirmPayment(): void {
    const utrControl = this.signupForm.get('utr');
    utrControl?.setValidators(Validators.required);
    utrControl?.updateValueAndValidity();

    if (!utrControl?.value?.trim()) {
      utrControl?.markAsTouched();
      this.errorMessage = 'Please enter the UTR / Transaction number before confirming.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.loading = false;
      this.successMessage = `Payment confirmed! Registration No: ${this.registrationNumber}`;
      this.activeTab = 'done';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.cdr.detectChanges();
    }, 1000);
  }

  hasError(field: string, error: string): boolean {
    const control = this.signupForm.get(field);
    return !!(control?.hasError(error) && control.touched);
  }

  getErrorMessage(field: string): string {
    const control = this.signupForm.get(field);
    if (!control?.errors || !control.touched) return '';
    
    if (control.hasError('required')) {
      if (field === 'fatherName') return 'Father name is required';
      if (field === 'husbandName') return 'Husband name is required';
      return `${this.getFieldLabel(field)} is required`;
    }
    
    if (control.hasError('email')) return 'Please enter a valid email address';
    
    if (control.hasError('pattern')) {
      switch (field) {
        case 'mobile': return 'Please enter a valid 10-digit mobile number';
        case 'aadhar': return 'Please enter a valid 12-digit Aadhaar number';
        case 'pan': return 'Please enter a valid PAN (e.g., ABCDE1234F)';
        case 'accountNo': return 'Account number must be between 9 and 20 digits';
        default: return `Invalid ${this.getFieldLabel(field)}`;
      }
    }
    
    if (control.hasError('minlength')) return `${this.getFieldLabel(field)} is too short`;
    if (control.hasError('maxlength')) return `${this.getFieldLabel(field)} is too long`;
    
    return 'Invalid input';
  }

  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      title: 'Title',
      fullName: 'Full name',
      fatherName: "Father's name",
      husbandName: "Husband's name",
      dob: 'Date of birth',
      mobile: 'Mobile number',
      email: 'Email',
      aadhar: 'Aadhaar number',
      pan: 'PAN number',
      accountNo: 'Account number',
      address: 'Address',
      skill: 'Skill',
      workArea: 'Work area',
      experience: 'Experience',
      availability: 'Availability',
      designation: 'Designation',
      selfCode: 'Self code',
      selfRankName: 'Self rank name',
      referenceCode: 'Reference code',
      referenceRankName: 'Reference rank name',
      utr: 'UTR number',
      amount: 'Amount',
      terms: 'Terms acceptance'
    };
    return labels[field] ?? field;
  }

  // Helper method to get the appropriate parent name label based on title
  getParentNameLabel(): string {
    return this.selectedTitle === 'Miss' ? 'Husband Name' : 'Father Name';
  }
}

// ── Updated Interfaces ────────────────────────────────────────────────────────────────

interface RegisterUserDto {
  userType: string;
  title: string;
  fullName: string;
  fatherName: string;
  husbandName: string;
  dateOfBirth: string;
  mobileNumber: string;
  email: string;
  aadhaarNumber: string;
  panNumber: string | null;
  accountNumber: string;
  address: string;
  skill: string | null;
  workArea: string | null;
  experience: string | null;
  availability: string | null;
  designation: string | null;
  selfCode: string | null;
  selfRankName: string;
  referenceCode: string;
  referenceRankName: string;
  utrNumber: string;
  amount: number;
  termsAccepted: boolean;
}

interface SelfCodeResponse { 
  selfCode?: string;
  code?: string;
}

interface ApiResponse {
  message?: string;
  selfCode?: string;
  user?: { registrationNumber?: string; selfCode?: string; [key: string]: any; };
}