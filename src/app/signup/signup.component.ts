import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PaymentServiceComponent } from '../payment-service/payment-service.component'; // adjust path

declare var Razorpay: any;


@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {

  signupForm!: FormGroup;
  isWorker = false;
  loading = false;
  successMessage = '';
  errorMessage = '';
  registrationNoLoading = false;
  selfCodeLoading = false;
  selectedTitle = '';

  activeTab: 'registration' | 'payment' | 'done' = 'registration';

  photoFile: File | null = null;
  photoPreviewUrl: string | null = null;
  photoBase64: string | null = null;
  photoUploading = false;
  photoError = '';

  registrationNumber = '';
  confirmationNumber = '';
  generatedSelfCode = '';
  isGuestPayment = false;


get amount(): string {
  return this.isWorker ? '1200' : '200';
}

get upiLink(): string {
  return `upi://pay?pa=9594704311@axl&pn=SMS Foundation&am=${this.amount}&cu=INR`;
}

openUpiApp(): void {
  window.location.href = this.upiLink;
}

  // ── API URLs ───────────────────────────────────────────────────────────────
  private apiUrl                    = 'https://vgfurnitureapi.runasp.net/api/Auth/register';
  private generateRegistrationNoUrl = 'https://vgfurnitureapi.runasp.net/api/Auth/generate-ourcode';
  private generateSelfCodeUrl       = 'https://vgfurnitureapi.runasp.net/api/Auth/generate-selfcode';
  private updateUtrUrl              = 'https://vgfurnitureapi.runasp.net/api/Auth/update-utr';
  private guestPaymentUrl           = 'https://vgfurnitureapi.runasp.net/api/Auth/record-guest-payment';



// private apiUrl                    = 'http://localhost:7200/api/Auth/register';
// private generateRegistrationNoUrl = 'http://localhost:7200/api/Auth/generate-ourcode';
// private generateSelfCodeUrl       = 'http://localhost:7200/api/Auth/generate-selfcode';
// private updateUtrUrl              = 'http://localhost:7200/api/Auth/update-utr';
// private guestPaymentUrl           = 'http://localhost:7200/api/Auth/record-guest-payment';
 razorpayLoading = false; //

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private paymentService: PaymentServiceComponent
  ) {}

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      this.isWorker = segments.some(s => s.path === 'worker');
      if (!this.signupForm) {
        this.buildForm();
        this.setConditionalValidators();
        this.setupTitleWatch();
        setTimeout(() => {
          if (!this.isWorker) {
            this.loadRegistrationNumber();
          } else {
            this.loadSelfCode();
          }
        }, 100);
      }
    });
  }



// ── Razorpay ───────────────────────────────────────────────────────────────
payWithRazorpay(): void {
  const amt = this.isWorker ? 1200 : 200;
  this.errorMessage = '';
  this.razorpayLoading = true;
  this.cdr.detectChanges();

  this.paymentService.createOrder(amt).subscribe({
    next: (order) => {
      this.razorpayLoading = false;
      this.cdr.detectChanges();

      const options: any = {
        key: order.keyId,
        amount: Math.round(order.amount * 100), // Razorpay wants paise
        currency: order.currency,
        name: 'SMS Foundation',
        description: this.isWorker ? 'Worker Registration Fee' : 'Member Joining Fee',
        order_id: order.orderId,
        prefill: {
          name: this.signupForm.get('fullName')?.value || '',
          email: this.signupForm.get('email')?.value || '',
          contact: this.signupForm.get('mobile')?.value || ''
        },
        theme: { color: '#1a73e8' },
        handler: (response: any) => {
          // response.razorpay_payment_id
          // response.razorpay_order_id
          // response.razorpay_signature
          this.handleRazorpaySuccess(response);
        },
        modal: {
          ondismiss: () => {
            this.razorpayLoading = false;
            this.errorMessage = 'Payment cancelled.';
            this.cdr.detectChanges();
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        this.razorpayLoading = false;
        this.errorMessage = resp?.error?.description || 'Payment failed. Please try again.';
        this.cdr.detectChanges();
      });
      rzp.open();
    },
    error: (err) => {
      this.razorpayLoading = false;
      this.errorMessage = 'Could not start payment. Please try again.';
      this.cdr.detectChanges();
    }
  });
}

private handleRazorpaySuccess(response: any): void {
  // Validate response
  if (!response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
    this.errorMessage = 'Invalid payment response. Please contact support.';
    this.cdr.detectChanges();
    return;
  }

  // Store the Razorpay payment id as the transaction reference
  this.signupForm.get('utr')?.setValue(response.razorpay_payment_id, { emitEvent: false });
  
  // Call confirmPayment with the razorpay response
  this.confirmPayment(response);
}

// ── Confirm Payment ──────────────────────────────────────────────────────
async confirmPayment(razorpayResponse?: any): Promise<void> {
  const utrControl = this.signupForm.get('utr');
  let utrValue = utrControl?.value;

  // Check if we have a UTR value or a Razorpay response
  if ((!utrValue || utrValue.toString().trim() === '') && !razorpayResponse) {
    this.errorMessage = 'Please complete the payment before confirming.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // If we have a Razorpay response but no UTR, use the payment ID as UTR
  if (razorpayResponse && (!utrValue || utrValue.toString().trim() === '')) {
    utrValue = razorpayResponse.razorpay_payment_id;
    this.signupForm.get('utr')?.setValue(utrValue, { emitEvent: false });
  }

  this.errorMessage = '';
  this.successMessage = '';
  this.loading = true;
  this.cdr.detectChanges();

  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  try {
    let payload: any;
    let url: string;

    if (this.isGuestPayment) {
      payload = {
        utrNumber: utrValue.trim(),
        amount: this.isWorker ? 1200 : 200,
        isGuest: true,
        email: this.signupForm.get('email')?.value,
        mobileNumber: this.signupForm.get('mobile')?.value,
        razorpayOrderId: razorpayResponse?.razorpay_order_id || null,
        razorpayPaymentId: razorpayResponse?.razorpay_payment_id || null,
        razorpaySignature: razorpayResponse?.razorpay_signature || null
      };
      url = this.guestPaymentUrl;
    } else {
      if (!this.registrationNumber) {
        throw new Error('Registration number is required');
      }
      
      payload = {
        registrationNumber: this.registrationNumber,
        utrNumber: utrValue.trim(),
        amount: this.isWorker ? 1200 : 200,
        razorpayOrderId: razorpayResponse?.razorpay_order_id || null,
        razorpayPaymentId: razorpayResponse?.razorpay_payment_id || null,
        razorpaySignature: razorpayResponse?.razorpay_signature || null
      };
      url = this.updateUtrUrl;
    }

    const response = await firstValueFrom(this.http.post<any>(url, payload, { headers }));
    this.loading = false;
    
    // Handle success response
    if (response?.success !== false) {
      this.successMessage = response?.message || 'Payment confirmed! A confirmation email has been sent.';
      
      // Clear payment form after success
      this.signupForm.get('utr')?.setValue('', { emitEvent: false });

      if (this.isGuestPayment) {
        setTimeout(() => {
          this.activeTab = 'registration';
          this.successMessage = 'Payment recorded! Please complete your registration.';
          this.cdr.detectChanges();
        }, 2000);
      } else {
        setTimeout(() => {
          this.activeTab = 'done';
          window.scrollTo({ top: 0, behavior: 'smooth' });
          this.cdr.detectChanges();
        }, 1000);
      }
    } else {
      this.errorMessage = response?.message || 'Payment confirmation failed.';
    }
    
    this.cdr.detectChanges();
  } catch (error: any) {
    this.loading = false;
    this.cdr.detectChanges();
    
    // Improved error handling
    if (error.status === 0) {
      this.errorMessage = 'Cannot reach the server. Please check your connection.';
    } else if (error.status === 400) {
      this.errorMessage = error.error?.error || error.error?.message || 'Invalid payment details.';
    } else if (error.status === 404) {
      this.errorMessage = error.error?.error || 'Registration not found. Please contact support.';
    } else if (error.status === 409) {
      this.errorMessage = error.error?.error || 'This payment has already been recorded.';
    } else if (error.status === 500) {
      this.errorMessage = 'Server error. Please try again later.';
    } else {
      this.errorMessage = error.error?.error || error.error?.message || error.message || 'Payment confirmation failed.';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
  // ── Photo ──────────────────────────────────────────────────────────────────
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) { return; }
    const file = input.files[0];
    this.photoError = '';
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.photoError = 'Only JPG or PNG images are allowed.';
      this.clearPhoto();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.photoError = 'Photo must be under 5 MB.';
      this.clearPhoto();
      return;
    }
    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoPreviewUrl = e.target.result as string;
      this.photoBase64 = (e.target.result as string).split(',')[1];
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearPhoto(): void {
    this.photoFile       = null;
    this.photoPreviewUrl = null;
    this.photoBase64     = null;
    this.photoError      = '';
    const input = document.getElementById('photoInput') as HTMLInputElement;
    if (input) { input.value = ''; }
    this.cdr.detectChanges();
  }

  // ── Load Codes ─────────────────────────────────────────────────────────────
  loadRegistrationNumber(): void {
    if (!this.signupForm) { return; }
    this.registrationNoLoading = true;
    this.errorMessage = '';
    this.http.get<any>(this.generateRegistrationNoUrl, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).subscribe({
      next: (response) => {
        const code = response.ourCode || response.registrationNo || response.code || response.registrationNumber || null;
        if (code) {
          this.registrationNumber = code;
          this.signupForm.patchValue({ registrationNo: code });
          this.signupForm.get('registrationNo')?.markAsTouched();
          this.signupForm.get('registrationNo')?.updateValueAndValidity();
        } else {
          this.errorMessage = 'Invalid response from server. Please refresh.';
        }
        this.registrationNoLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.errorMessage = `Failed to load registration number: ${err.message || 'Please refresh.'}`;
        this.registrationNoLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadSelfCode(): void {
    if (!this.signupForm) { return; }
    this.selfCodeLoading = true;
    this.errorMessage = '';
    this.http.get<any>(this.generateSelfCodeUrl, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).subscribe({
      next: (response) => {
        const code = response.selfCode || response.SelfCode || response.code || null;
        if (code) {
          this.generatedSelfCode  = code;
          this.registrationNumber = code;
          this.signupForm.patchValue({ selfCode: code });
          this.signupForm.get('selfCode')?.markAsTouched();
          this.signupForm.get('selfCode')?.updateValueAndValidity();
        } else {
          this.errorMessage = 'Could not generate self code. Please refresh.';
        }
        this.selfCodeLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.errorMessage = `Failed to generate worker code: ${err.message || 'Please refresh.'}`;
        this.selfCodeLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Tab ────────────────────────────────────────────────────────────────────
  switchTab(tab: 'registration' | 'payment' | 'done'): void {
    if (tab === 'payment' && !this.confirmationNumber && !this.isGuestPayment) { return; }
    if (tab === 'done'    && !this.confirmationNumber) { return; }
    this.activeTab = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onGuestPaymentToggle(): void {
    this.cdr.detectChanges();
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  private buildForm(): void {
    const defaultAmount = this.isWorker ? 1200 : 200;
    this.signupForm = this.fb.group({
      title:             ['', Validators.required],
      fatherName:        [''],
      husbandName:       [''],
      relation:          ['', Validators.required],
      nominee:           ['', Validators.required],
      fullName:          ['', Validators.required],
      dob:               ['', Validators.required],
      mobile:            ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email:             ['', [Validators.required, Validators.email]],
      aadhar:            ['', [Validators.required, Validators.pattern(/^[0-9]{12}$/)]],
      pan:               ['', [Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]],
      accountNo:         ['', [Validators.required, Validators.minLength(9), Validators.maxLength(20)]],
      address:           ['', Validators.required],
      skill:             [''],
      workArea:          [''],
      experience:        [''],
      availability:      [''],
      designation:       [''],
      registrationNo:    [''],
      referenceName:     [''],
      referenceCode:     [''],
      selfCode:          [''],
      selfRankName:      [''],
      referenceRankName: [''],
      utr:               [''],
      amount:            [defaultAmount, Validators.required],
      terms:             [false, Validators.requiredTrue],
    });
  }

  private setupTitleWatch(): void {
    this.signupForm.get('title')?.valueChanges.subscribe((title: string) => {
      this.selectedTitle = title;
      const fatherCtrl  = this.signupForm.get('fatherName');
      const husbandCtrl = this.signupForm.get('husbandName');
      fatherCtrl?.clearValidators();
      husbandCtrl?.clearValidators();
      fatherCtrl?.setValue('');
      husbandCtrl?.setValue('');
      if (title === 'Mr' || title === 'Miss') {
        fatherCtrl?.setValidators([Validators.required]);
      } else if (title === 'Mrs') {
        husbandCtrl?.setValidators([Validators.required]);
      }
      fatherCtrl?.updateValueAndValidity();
      husbandCtrl?.updateValueAndValidity();
      this.cdr.detectChanges();
    });
  }

  private setConditionalValidators(): void {
    if (this.isWorker) {
      ['skill', 'workArea', 'experience', 'availability'].forEach(f => {
        this.signupForm.get(f)?.setValidators(Validators.required);
        this.signupForm.get(f)?.updateValueAndValidity();
      });
      this.signupForm.get('designation')?.clearValidators();
      this.signupForm.get('designation')?.setValue('');
      this.signupForm.get('designation')?.updateValueAndValidity();
      this.signupForm.get('amount')?.setValue(1200);
    } else {
      ['skill', 'workArea', 'experience', 'availability'].forEach(f => {
        this.signupForm.get(f)?.clearValidators();
        this.signupForm.get(f)?.setValue('');
        this.signupForm.get(f)?.updateValueAndValidity();
      });
      this.signupForm.get('designation')?.setValidators(Validators.required);
      this.signupForm.get('designation')?.updateValueAndValidity();
      this.signupForm.get('amount')?.setValue(200);
    }
    ['registrationNo', 'referenceName', 'referenceCode',
     'selfCode', 'selfRankName', 'referenceRankName'].forEach(f => {
      this.signupForm.get(f)?.clearValidators();
      this.signupForm.get(f)?.updateValueAndValidity();
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  isInvalid(field: string): boolean {
    const control = this.signupForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  hasError(field: string, error: string): boolean {
    const control = this.signupForm.get(field);
    return !!(control && control.hasError(error) && control.touched);
  }

  toUpperCase(field: string): void {
    const control = this.signupForm.get(field);
    if (control) {
      control.setValue(control.value?.toUpperCase(), { emitEvent: false });
    }
  }

//   openUpiPayment(): void {
//   const amt = this.isWorker ? '1200' : '200';
//   window.location.href = `upi://pay?pa=9594704311.etb%40icici&pn=SMS%20Foundation&am=${amt}&cu=INR&tn=Registration%20Fee`;
// }


  // // openUpiApp(): void {

  // //   const isAndroid = /Android/i.test(navigator.userAgent);
  // //   const isiPhone = /iPhone|iPad|iPod/i.test(navigator.userAgent);


  // //   window.location.href = this.upiLink;
  // // }

  // // openPhonePe(): void {
  // //   const upiUrl = this.upiLink;

  // //   window.location.href =
  // //     `intent://${upiUrl.replace('upi://', '')}` +
  // //     '#Intent;scheme=upi;package=com.phonepe.app;end';
  // // }

  // // openGPay(): void {
  // //   const upiUrl = this.upiLink;

  // //   window.location.href =
  // //     `intent://${upiUrl.replace('upi://', '')}` +
  // //     '#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end';
  // // }

  // // openPaytm(): void {
  // //   const upiUrl = this.upiLink;

  // //   window.location.href =
  // //     `intent://${upiUrl.replace('upi://', '')}` +
  // //     '#Intent;scheme=upi;package=net.one97.paytm;end';
  // // }


  onUtrInput(event: any): void {
    const value = event.target.value;
    const utrControl = this.signupForm.get('utr');
    if (utrControl) {
      utrControl.setValue(value, { emitEvent: false });
    }
  }

  getParentNameLabel(): string {
    if (this.selectedTitle === 'Mr' || this.selectedTitle === 'Miss') { return 'Father Name'; }
    if (this.selectedTitle === 'Mrs') { return 'Husband Name'; }
    return 'Parent Name';
  }

  private getInvalidAngularFields(): string[] {
    const codeFields = ['registrationNo', 'referenceName', 'referenceCode', 'selfCode', 'selfRankName', 'referenceRankName'];
    return Object.keys(this.signupForm.controls)
      .filter(key => !codeFields.includes(key) && this.signupForm.get(key)?.invalid)
      .map(key => `${key}: ${JSON.stringify(this.signupForm.get(key)?.errors)}`);
  }

  // ── Prepare DTO ────────────────────────────────────────────────────────────
  private prepareRegistrationData(): RegisterUserDto {
    const f = this.signupForm.getRawValue();
    let formattedDob = '';
    try {
      formattedDob = new Date(f.dob).toISOString().split('T')[0];
    } catch (e) {
      formattedDob = f.dob;
    }
    return {
      userType:          this.isWorker ? 'Worker' : 'Member',
      title:             f.title,
      fullName:          f.fullName?.trim(),
      fatherName:        (f.title === 'Mr' || f.title === 'Miss') ? (f.fatherName?.trim() || '') : '',
      husbandName:       f.title === 'Mrs' ? (f.husbandName?.trim() || '') : '',
      relation:          f.relation?.trim(),
      nominee:           f.nominee?.trim(),
      dateOfBirth:       formattedDob,
      mobileNumber:      f.mobile?.trim(),
      email:             f.email?.trim().toLowerCase(),
      aadhaarNumber:     f.aadhar?.trim(),
      panNumber:         f.pan?.trim().toUpperCase() || null,
      accountNumber:     f.accountNo?.trim(),
      address:           f.address?.trim(),
      skill:             f.skill            || null,
      workArea:          f.workArea?.trim() || null,
      experience:        f.experience       || null,
      availability:      f.availability     || null,
      designation:       this.isWorker ? null : (f.designation?.trim() || null),
      registrationNo:    this.isWorker
        ? (f.selfCode?.trim() || this.generatedSelfCode || null)
        : (f.registrationNo?.trim() || this.registrationNumber || null),
      referenceName:     this.isWorker ? null : (f.referenceName?.trim() || null),
      referenceCode:     f.referenceCode?.trim() || null,
      selfCode:          this.isWorker ? (f.selfCode?.trim() || null) : null,
      selfRankName:      this.isWorker ? (f.selfRankName?.trim() || null) : null,
      referenceRankName: this.isWorker ? (f.referenceRankName?.trim() || null) : null,
      photoBase64:       this.photoBase64 || null,
      photoFileName:     this.photoFile ? this.photoFile.name : null,
      photoMimeType:     this.photoFile ? this.photoFile.type : null,
      utrNumber:         'PENDING',
      amount:            parseFloat(f.amount) || (this.isWorker ? 1200 : 200),
      termsAccepted:     f.terms
    };
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    Object.keys(this.signupForm.controls).forEach(key => {
      this.signupForm.get(key)?.markAsTouched();
    });
    this.errorMessage = '';
    if (!this.photoBase64) {
      this.photoError = 'Please upload a passport-size photo before submitting.';
      document.getElementById('photo-upload-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const title = this.signupForm.get('title')?.value;
    if (!title) {
      this.errorMessage = 'Please select a title (Mr./Miss/Mrs.)';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const fatherName  = this.signupForm.get('fatherName')?.value;
    const husbandName = this.signupForm.get('husbandName')?.value;
    if ((title === 'Mr' || title === 'Miss') && !fatherName?.trim()) {
      this.errorMessage = `Father name is required for ${title}.`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (title === 'Mrs' && !husbandName?.trim()) {
      this.errorMessage = 'Husband name is required for Mrs.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const coreFields: { field: string; msg: string }[] = [
      { field: 'fullName',  msg: 'Full name is required.' },
      { field: 'dob',       msg: 'Date of birth is required.' },
      { field: 'mobile',    msg: 'Valid 10-digit mobile number is required.' },
      { field: 'email',     msg: 'Valid email address is required.' },
      { field: 'aadhar',    msg: 'Valid 12-digit Aadhaar number is required.' },
      { field: 'accountNo', msg: 'Bank account number is required (9-20 digits).' },
      { field: 'address',   msg: 'Address is required.' },
      { field: 'relation',  msg: 'Nominee name is required.' },
      { field: 'nominee',   msg: 'Relation is required.' },
    ];
    for (const item of coreFields) {
      if (this.signupForm.get(item.field)?.invalid) {
        this.errorMessage = item.msg;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    if (this.isWorker) {
      const workerFields: { field: string; msg: string }[] = [
        { field: 'skill',        msg: 'Skill is required.' },
        { field: 'workArea',     msg: 'Work area is required.' },
        { field: 'experience',   msg: 'Experience is required.' },
        { field: 'availability', msg: 'Availability is required.' },
      ];
      for (const item of workerFields) {
        if (this.signupForm.get(item.field)?.invalid) {
          this.errorMessage = item.msg;
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    }
    if (!this.isWorker && !this.signupForm.get('designation')?.value?.trim()) {
      this.errorMessage = 'Designation is required.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!this.isWorker && !this.isGuestPayment) {
      const regNo = this.signupForm.getRawValue().registrationNo;
      if (!regNo?.trim() && !this.registrationNumber?.trim()) {
        this.errorMessage = 'Registration number not loaded. Please refresh the page.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!this.signupForm.get('referenceCode')?.value?.trim()) {
        this.errorMessage = 'Reference code is required.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!this.signupForm.get('referenceName')?.value?.trim()) {
        this.errorMessage = 'Reference name is required.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    if (this.isWorker) {
      const selfCode = this.signupForm.get('selfCode')?.value?.trim() || this.generatedSelfCode;
      if (!selfCode) {
        this.errorMessage = 'Worker code not loaded. Please refresh the page.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!this.signupForm.get('selfRankName')?.value?.trim()) {
        this.errorMessage = 'Self rank name is required.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!this.signupForm.get('referenceCode')?.value?.trim()) {
        this.errorMessage = 'Reference code is required.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!this.signupForm.get('referenceRankName')?.value?.trim()) {
        this.errorMessage = 'Reference rank name is required.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    if (!this.signupForm.get('terms')?.value) {
      this.errorMessage = 'You must accept the Terms & Conditions.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const remainingInvalid = this.getInvalidAngularFields();
    if (remainingInvalid.length > 0) {
      this.errorMessage = 'Please fill all required fields correctly.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      const payload  = this.prepareRegistrationData();
      const response = await firstValueFrom(
        this.http.post<ApiResponse>(this.apiUrl, payload, { headers })
      );
      this.loading = false;
      if (this.isWorker) { this.registrationNumber = this.generatedSelfCode; }
      const returnedConfNo = response.user?.confirmationNumber || response.confirmationNumber || null;
      this.confirmationNumber = returnedConfNo || this.registrationNumber;
      this.successMessage = `Registration saved! Your Confirmation Number is ${this.confirmationNumber}. Please complete payment.`;
      setTimeout(() => {
        this.activeTab = 'payment';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.cdr.detectChanges();
      }, 1200);
    } catch (error: any) {
      this.loading = false;
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



// Add this method to your SignupComponent class

/**
 * Auto-fills the form with random test data for testing purposes
 */
fillRandomTestData(): void {
  const randomNames = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh', 'Ananya Mehta', 'Rahul Verma', 'Neha Gupta'];
  const randomTitles = ['Mr', 'Miss', 'Mrs'];
  const randomRelations = ['Father', 'Mother', 'Husband', 'Wife', 'Son', 'Daughter', 'Brother', 'Sister'];
  const randomSkills = ['Sales & Marketing', 'Distribution', 'Field Work', 'Awareness Campaigns', 'Other'];
  const randomWorkAreas = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad'];
  const randomExperiences = ['Fresher', 'Less than 1 year', '1-3 years', '3+ years'];
  const randomAvailabilities = ['Full Time', 'Part Time', 'Weekends Only'];
  const randomDesignations = ['Manager', 'Executive', 'Associate', 'Coordinator', 'Supervisor'];
  const randomReferenceNames = ['Suresh Sharma', 'Lakshmi Rao', 'Gopal Singh', 'Meena Iyer', 'Ravi Das'];
  
  const randomIndex = (arr: any[]) => Math.floor(Math.random() * arr.length);
  
  // Generate random phone number (10 digits starting with 7,8,9)
  const mobileNumber = `9${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;
  
  // Generate random Aadhaar (12 digits)
  const aadhaar = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
  
  // Generate random PAN (format: ABCDE1234F)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const pan = `${letters.charAt(Math.floor(Math.random() * 26))}${letters.charAt(Math.floor(Math.random() * 26))}${letters.charAt(Math.floor(Math.random() * 26))}${letters.charAt(Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${letters.charAt(Math.floor(Math.random() * 26))}`;
  
  // Generate random account number (9-15 digits)
  const accountNo = Math.floor(Math.random() * 1000000000000000).toString().padStart(9, '0').slice(0, 15);
  
  // Generate random date of birth (person between 18-60 years old)
  const dob = new Date();
  const age = 18 + Math.floor(Math.random() * 42); // 18-60 years
  dob.setFullYear(dob.getFullYear() - age);
  dob.setMonth(Math.floor(Math.random() * 12));
  dob.setDate(1 + Math.floor(Math.random() * 28));
  const dobString = dob.toISOString().split('T')[0];
  
  // Select random title
  const title = randomTitles[randomIndex(randomTitles)];
  const isWorker = this.isWorker;
  
  // Get random name
  let fullName = randomNames[randomIndex(randomNames)];
  
  // Generate random father/husband name based on title
  let fatherName = '';
  let husbandName = '';
  if (title === 'Mr' || title === 'Miss') {
    fatherName = `${randomNames[randomIndex(randomNames)]}`;
  } else if (title === 'Mrs') {
    husbandName = `${randomNames[randomIndex(randomNames)]}`;
  }
  
  // Generate random reference code (6-8 alphanumeric)
  const referenceCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Set form values
  this.signupForm.patchValue({
    title: title,
    fullName: fullName,
    fatherName: fatherName,
    husbandName: husbandName,
    relation: randomNames[randomIndex(randomNames)],
    nominee: randomRelations[randomIndex(randomRelations)],
    dob: dobString,
    mobile: mobileNumber,
    email: `${fullName.toLowerCase().replace(' ', '.')}${Math.floor(Math.random() * 100)}@testmail.com`,
    aadhar: aadhaar,
    pan: pan,
    accountNo: accountNo,
    address: `${Math.floor(Math.random() * 1000)} ${['Main Street', 'Park Avenue', 'MG Road', 'Linking Road', 'Banjara Hills'][randomIndex(['Main Street', 'Park Avenue', 'MG Road', 'Linking Road', 'Banjara Hills'])]}, ${randomWorkAreas[randomIndex(randomWorkAreas)]}, ${['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana'][randomIndex(['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana'])]} - ${Math.floor(Math.random() * 900000 + 100000)}`,
    terms: true,
    amount: isWorker ? 1200 : 200,
    utr: `RZP${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`
  });
  
  // Set worker-specific fields
  if (isWorker) {
    this.signupForm.patchValue({
      skill: randomSkills[randomIndex(randomSkills)],
      workArea: randomWorkAreas[randomIndex(randomWorkAreas)],
      experience: randomExperiences[randomIndex(randomExperiences)],
      availability: randomAvailabilities[randomIndex(randomAvailabilities)],
      selfRankName: `${randomNames[randomIndex(randomNames)]}`,
      referenceCode: referenceCode,
      referenceRankName: randomReferenceNames[randomIndex(randomReferenceNames)]
    });
  } else {
    // Set member-specific fields
    this.signupForm.patchValue({
      designation: randomDesignations[randomIndex(randomDesignations)],
      referenceCode: referenceCode,
      referenceName: randomReferenceNames[randomIndex(randomReferenceNames)]
    });
  }
  
  // Mark all fields as touched to trigger validation
  Object.keys(this.signupForm.controls).forEach(key => {
    const control = this.signupForm.get(key);
    control?.markAsTouched();
  });
  
  // Update confirmation number if available
  if (this.confirmationNumber) {
    // If confirmation number already exists, keep it
  }
  
  // Set random photo (optional - can create a dummy blob if needed)
  // this.createDummyPhoto();
  
  this.errorMessage = '';
  this.successMessage = '✅ Test data filled successfully!';
  this.cdr.detectChanges();
  
  // Auto-scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Helper function to create a dummy photo blob (optional)
 */
private createDummyPhoto(): void {
  // Create a simple canvas image as dummy photo
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Draw a simple avatar
    ctx.fillStyle = '#1a73e8';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = 'white';
    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', 100, 100);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'test-photo.jpg', { type: 'image/jpeg' });
        // Convert to base64 for preview
        const reader = new FileReader();
        reader.onload = () => {
          this.photoPreviewUrl = reader.result as string;
          // You can also set the file to a variable if needed
        };
        reader.readAsDataURL(file);
      }
    }, 'image/jpeg', 0.8);
  }
}



 }

// ── Interfaces ─────────────────────────────────────────────────────────────
interface RegisterUserDto {
  userType:          string;
  title:             string;
  fullName:          string;
  fatherName:        string;
  husbandName:       string;
  relation:          string;
  nominee:           string;
  dateOfBirth:       string;
  mobileNumber:      string;
  email:             string;
  aadhaarNumber:     string;
  panNumber:         string | null;
  accountNumber:     string;
  address:           string;
  skill:             string | null;
  workArea:          string | null;
  experience:        string | null;
  availability:      string | null;
  designation:       string | null;
  registrationNo:    string | null;
  referenceName:     string | null;
  referenceCode:     string | null;
  selfCode:          string | null;
  selfRankName:      string | null;
  referenceRankName: string | null;
  photoBase64:       string | null;
  photoFileName:     string | null;
  photoMimeType:     string | null;
  utrNumber:         string;
  amount:            number;
  termsAccepted:     boolean;
}

interface ApiResponse {
  message?:            string;
  registrationNumber?: string;
  confirmationNumber?: string;
  user?: {
    registrationNumber?: string;
    confirmationNumber?: string;
    [key: string]: any;
  };
}