import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {

  // ── Current user (from localStorage) ──────────────────────────────────────
  currentUser: any   = null;
  isAdmin      = false;
  isMember     = false;
  isWorker     = false;
  userName     = 'User';
  adminName    = 'Admin';

  // ── Member/Worker own profile ──────────────────────────────────────────────
  profile:        any  = null;
  profileLoading       = false;
  profileError         = '';

  // ── Admin stats ────────────────────────────────────────────────────────────
  totalMembers         = 0;
  totalWorkers         = 0;
  totalRevenue         = 0;
  pendingVerifications = 0;
  newThisMonth         = 0;
  newWorkersThisMonth  = 0;
  revenueGrowth        = 0;

  // ── Admin table data ───────────────────────────────────────────────────────
  allMembers:      any[] = [];
  filteredMembers: any[] = [];

  // ── Filters ────────────────────────────────────────────────────────────────
  searchTerm     = '';
  userTypeFilter = 'all';

  // ── Pagination ─────────────────────────────────────────────────────────────
  currentPage   = 1;
  pageSize      = 10;
  totalPages    = 1;
  totalFiltered = 0;

  // ── Sorting ────────────────────────────────────────────────────────────────
  sortField     = 'registeredAt';
  sortDirection = 'desc';

  // ── Charts ─────────────────────────────────────────────────────────────────
  trendsChart:       any;
  distributionChart: any;

  // ── View modal ─────────────────────────────────────────────────────────────
  showViewModal   = false;
  selectedMember: any = null;

  // ── Edit modal ─────────────────────────────────────────────────────────────
  showEditModal = false;
  editForm: any = {};
  editLoading   = false;
  editError     = '';
  editSuccess   = '';

  // ── Delete modal ───────────────────────────────────────────────────────────
  showDeleteModal  = false;
  memberToDelete: any = null;
  deleteLoading    = false;
  deleteError      = '';

  // ── Approve modal ──────────────────────────────────────────────────────────
  showApproveModal  = false;
  memberToApprove: any = null;
  approveLoading    = false;
  approveError      = '';
  approvingId: any  = null;

  // ── Toast ──────────────────────────────────────────────────────────────────
  toastMessage                   = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  // ── API ────────────────────────────────────────────────────────────────────
  private base = 'https://vgfurnitureapi.runasp.net/api/Auth';
   //private base = 'https://localhost:7200/api/Auth';

  private get headers() {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  constructor(private http: HttpClient, private router: Router) {}

  // ══════════════════════════════════════════════════════════════
  // INIT — detect role from localStorage, load accordingly
  // ══════════════════════════════════════════════════════════════
  ngOnInit(): void {
    // Read stored login info
    const stored = localStorage.getItem('sms_user');
    if (!stored) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUser = JSON.parse(stored);
    this.userName    = this.currentUser.fullName || this.currentUser.firstName || 'User';
    this.adminName   = this.userName;

    const role = (this.currentUser.userType || '').toLowerCase();
    this.isAdmin  = role === 'admin';
    this.isMember = role === 'member';
    this.isWorker = role === 'worker';

    if (this.isAdmin) {
      // Admin → load all registrations
      this.loadAllData();
    } else {
      // Member / Worker → load only their own profile
      this.loadMyProfile();
    }
  }

  ngAfterViewInit(): void {}

  // ══════════════════════════════════════════════════════════════
  // LOGOUT
  // ══════════════════════════════════════════════════════════════
  logout(): void {
    localStorage.removeItem('sms_user');
    this.router.navigate(['/login']);
  }

  // ══════════════════════════════════════════════════════════════
  // MEMBER / WORKER — load own profile
  // ══════════════════════════════════════════════════════════════
  loadMyProfile(): void {
    const regNo = this.currentUser.registrationNo;
    if (!regNo) {
      this.profileError = 'Registration number not found. Please contact support.';
      return;
    }

    this.profileLoading = true;
    this.profileError   = '';

    const params = new HttpParams().set('registrationNo', regNo);

    this.http.get<any>(`${this.base}/get-registration`, { params }).subscribe({
      next: (data) => {
        this.profile        = data;
        this.profileLoading = false;
      },
      error: (err) => {
        this.profileLoading = false;
        this.profileError   = err.error?.error || 'Failed to load your profile.';
      }
    });
  }

  getProfileStatusClass(): string {
    const s = (this.profile?.paymentStatus || '').toLowerCase();
    if (s === 'approved')  { return 'status-approved'; }
    if (s === 'confirmed') { return 'status-confirmed'; }
    return 'status-pending';
  }

  getProfileStatusLabel(): string {
    const s = (this.profile?.paymentStatus || '').toLowerCase();
    if (s === 'approved')  { return 'Approved ✓'; }
    if (s === 'confirmed') { return 'Payment Received'; }
    return 'Pending';
  }

  // ══════════════════════════════════════════════════════════════
  // ADMIN — load all registrations
  // ══════════════════════════════════════════════════════════════
  loadAllData(): void {
    this.http.get<any[]>(`${this.base}/get-all-registrations`).subscribe({
      next:  (res) => { this.allMembers = res; this.calculateStats(); this.filterMembers(); this.initCharts(); },
      error: ()    => { this.loadMockData(); }
    });
  }

  // alias kept for compatibility
  loadData(): void { this.loadAllData(); }

  loadMockData(): void {
    this.allMembers = [
      { id: 1, registrationNo: 'SMS-202604-0001', confirmationNumber: 'CONF-202604-0001', fullName: 'Rajesh Kumar',  userType: 'Member', email: 'rajesh@example.com',  mobileNumber: '9876543210', aadhaarNumber: '123456789012', panNumber: 'ABCDE1234F', accountNumber: '1234567890', address: 'Mumbai, Maharashtra', designation: 'Manager', skill: null, workArea: null, experience: null, availability: null, registeredAt: new Date('2024-04-01'), paymentStatus: 'Confirmed',  utrNumber: 'UTR111111111', paymentAmount: 200,  paymentDate: new Date('2024-04-01'), approvalToken: 'tok-001', approvedAt: null, approvedBy: null },
      { id: 2, registrationNo: 'WRK-001',          confirmationNumber: 'CONF-202604-0002', fullName: 'Priya Sharma',  userType: 'Worker', email: 'priya@example.com',   mobileNumber: '9876543211', aadhaarNumber: '123456789013', panNumber: null, accountNumber: '1234567891', address: 'Delhi, India', designation: null, skill: 'Field Work', workArea: 'Andheri', experience: '1-3 years', availability: 'Full Time', registeredAt: new Date('2024-04-02'), paymentStatus: 'Approved', utrNumber: 'UTR222222222', paymentAmount: 1200, paymentDate: new Date('2024-04-02'), approvalToken: 'tok-002', approvedAt: new Date('2024-04-03'), approvedBy: 'Admin' },
      { id: 3, registrationNo: 'SMS-202604-0002', confirmationNumber: 'CONF-202604-0003', fullName: 'Amit Verma',   userType: 'Member', email: 'amit@example.com',    mobileNumber: '9876543212', aadhaarNumber: '123456789014', panNumber: 'FGHIJ5678K', accountNumber: '1234567892', address: 'Pune, Maharashtra', designation: 'Agent', skill: null, workArea: null, experience: null, availability: null, registeredAt: new Date('2024-04-03'), paymentStatus: 'Pending', utrNumber: 'PENDING', paymentAmount: 200, paymentDate: null, approvalToken: null, approvedAt: null, approvedBy: null },
    ];
    this.calculateStats();
    this.filterMembers();
    this.initCharts();
  }

  // ══════════════════════════════════════════════════════════════
  // STATS
  // ══════════════════════════════════════════════════════════════
  calculateStats(): void {
    this.totalMembers         = this.allMembers.filter(m => m.userType === 'Member').length;
    this.totalWorkers         = this.allMembers.filter(m => m.userType === 'Worker').length;
    this.totalRevenue         = this.allMembers.reduce((s, m) => s + (m.paymentAmount || 0), 0);
    this.pendingVerifications = this.allMembers.filter(m => this.isPending(m) || this.isConfirmed(m)).length;

    const now = new Date();
    const mo  = now.getMonth();
    const yr  = now.getFullYear();

    this.newThisMonth = this.allMembers.filter(m => {
      const d = new Date(m.registeredAt);
      return d.getMonth() === mo && d.getFullYear() === yr && m.userType === 'Member';
    }).length;

    this.newWorkersThisMonth = this.allMembers.filter(m => {
      const d = new Date(m.registeredAt);
      return d.getMonth() === mo && d.getFullYear() === yr && m.userType === 'Worker';
    }).length;

    this.revenueGrowth = 15;
  }

  // ══════════════════════════════════════════════════════════════
  // STATUS HELPERS
  // ══════════════════════════════════════════════════════════════
  isApproved(m: any):  boolean { const s = (m.paymentStatus||'').toLowerCase(); return s === 'approved'; }
  isConfirmed(m: any): boolean { const s = (m.paymentStatus||'').toLowerCase(); return s === 'confirmed' || s === 'payment received'; }
  isPending(m: any):   boolean { return !this.isApproved(m) && !this.isConfirmed(m); }
  canApprove(m: any):  boolean { return !this.isApproved(m); }

  getStatusLabel(m: any): string {
    if (this.isApproved(m))  { return 'Approved'; }
    if (this.isConfirmed(m)) { return 'Payment Received'; }
    return 'Pending';
  }

  // ══════════════════════════════════════════════════════════════
  // FILTER / SORT / PAGINATE
  // ══════════════════════════════════════════════════════════════
  filterMembers(): void {
    let f = [...this.allMembers];

    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      f = f.filter(m =>
        (m.fullName       ||'').toLowerCase().includes(t) ||
        (m.email          ||'').toLowerCase().includes(t) ||
        (m.registrationNo ||'').toLowerCase().includes(t) ||
        (m.mobileNumber   ||'').includes(t)
      );
    }

    if (this.userTypeFilter !== 'all') {
      f = f.filter(m => m.userType === this.userTypeFilter);
    }

    f.sort((a, b) => {
      let av = a[this.sortField];
      let bv = b[this.sortField];
      if (this.sortField === 'registeredAt') { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
      if (av < bv) { return this.sortDirection === 'asc' ? -1 : 1; }
      if (av > bv) { return this.sortDirection === 'asc' ?  1 : -1; }
      return 0;
    });

    this.totalFiltered = f.length;
    this.totalPages    = Math.ceil(this.totalFiltered / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) { this.currentPage = 1; }

    const s = (this.currentPage - 1) * this.pageSize;
    this.filteredMembers = f.slice(s, s + this.pageSize);
  }

  sortBy(field: string): void {
    this.sortDirection = this.sortField === field ? (this.sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
    this.sortField = field;
    this.filterMembers();
  }

  previousPage(): void { if (this.currentPage > 1)             { this.currentPage--; this.filterMembers(); } }
  nextPage():     void { if (this.currentPage < this.totalPages) { this.currentPage++; this.filterMembers(); } }
  get startIndex(): number { return (this.currentPage - 1) * this.pageSize; }
  get endIndex():   number { return Math.min(this.startIndex + this.pageSize, this.totalFiltered); }

  getInitials(name: string): string {
    if (!name) { return '?'; }
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  // ══════════════════════════════════════════════════════════════
  // VIEW MODAL
  // ══════════════════════════════════════════════════════════════
  openView(member: any):      void { this.selectedMember = { ...member }; this.showViewModal = true; }
  closeView():                void { this.showViewModal = false; this.selectedMember = null; }
  viewMemberDetails(m: any):  void { this.openView(m); }
  closeModal(event?: any):    void { this.closeView(); }

  // ══════════════════════════════════════════════════════════════
  // EDIT MODAL
  // ══════════════════════════════════════════════════════════════
  openEdit(member: any): void {
    this.editForm = {
      registrationNo: member.registrationNo,
      fullName:       member.fullName,
      mobileNumber:   member.mobileNumber,
      email:          member.email,
      address:        member.address,
      designation:    member.designation || '',
      skill:          member.skill        || '',
      workArea:       member.workArea     || '',
      experience:     member.experience   || '',
      availability:   member.availability || '',
      paymentStatus:  member.paymentStatus || '',
      remarks:        member.remarks       || '',
      userType:       member.userType,
    };
    this.editError = ''; this.editSuccess = '';
    this.showEditModal = true;
  }

  closeEdit(): void {
    if (this.editLoading) { return; }
    this.showEditModal = false; this.editError = ''; this.editSuccess = '';
  }

  saveEdit(): void {
    if (this.editLoading) { return; }
    if (!this.editForm.fullName?.trim())    { this.editError = 'Full name is required.';    return; }
    if (!this.editForm.mobileNumber?.trim()) { this.editError = 'Mobile number is required.'; return; }
    if (!this.editForm.email?.trim())        { this.editError = 'Email is required.';         return; }
    if (!this.editForm.address?.trim())      { this.editError = 'Address is required.';       return; }

    this.editLoading = true; this.editError = '';

    const payload = {
      registrationNo: this.editForm.registrationNo,
      fullName:       this.editForm.fullName.trim(),
      mobileNumber:   this.editForm.mobileNumber.trim(),
      email:          this.editForm.email.trim().toLowerCase(),
      address:        this.editForm.address.trim(),
      designation:    this.editForm.designation  || null,
      skill:          this.editForm.skill         || null,
      workArea:       this.editForm.workArea      || null,
      experience:     this.editForm.experience    || null,
      availability:   this.editForm.availability  || null,
      paymentStatus:  this.editForm.paymentStatus || null,
      remarks:        this.editForm.remarks        || null,
    };

    this.http.put<any>(`${this.base}/update-registration`, payload, { headers: this.headers }).subscribe({
      next: () => {
        this.editLoading = false;
        const idx = this.allMembers.findIndex(m => m.registrationNo === payload.registrationNo);
        if (idx !== -1) { this.allMembers[idx] = { ...this.allMembers[idx], ...payload }; }
        this.filterMembers();
        this.showEditModal = false;
        this.showToast(`${payload.fullName}'s record updated successfully.`, 'success');
      },
      error: (err: any) => {
        this.editLoading = false;
        this.editError   = err.error?.error || err.error?.message || 'Update failed.';
      }
    });
  }

  editMember(m: any): void { this.openEdit(m); }

  // ══════════════════════════════════════════════════════════════
  // DELETE MODAL
  // ══════════════════════════════════════════════════════════════
  openDelete(member: any): void { this.memberToDelete = member; this.deleteError = ''; this.showDeleteModal = true; }

  closeDelete(): void {
    if (this.deleteLoading) { return; }
    this.showDeleteModal = false; this.memberToDelete = null; this.deleteError = '';
  }

  confirmDelete(): void {
    if (!this.memberToDelete || this.deleteLoading) { return; }
    this.deleteLoading = true; this.deleteError = '';

    const params = new HttpParams().set('registrationNo', this.memberToDelete.registrationNo);

    this.http.delete<any>(`${this.base}/delete-registration`, { params }).subscribe({
      next: () => {
        this.deleteLoading = false;
        const name = this.memberToDelete.fullName;
        this.allMembers = this.allMembers.filter(m => m.registrationNo !== this.memberToDelete.registrationNo);
        this.calculateStats(); this.filterMembers();
        this.showDeleteModal = false; this.memberToDelete = null;
        this.showToast(`${name}'s registration has been deleted.`, 'success');
      },
      error: (err: any) => {
        this.deleteLoading = false;
        this.deleteError   = err.error?.error || err.error?.message || 'Delete failed.';
      }
    });
  }

  deleteMember(m: any): void { this.openDelete(m); }

  // ══════════════════════════════════════════════════════════════
  // APPROVE MODAL
  // ══════════════════════════════════════════════════════════════
  openApprove(member: any): void { this.memberToApprove = member; this.approveError = ''; this.showApproveModal = true; }

  closeApprove(): void {
    if (this.approveLoading) { return; }
    this.showApproveModal = false; this.memberToApprove = null; this.approveError = '';
  }

  confirmApprove(): void {
    if (!this.memberToApprove || this.approveLoading) { return; }
    this.approveLoading = true; this.approvingId = this.memberToApprove.id; this.approveError = '';

    const payload = { registrationNo: this.memberToApprove.registrationNo, approvedBy: this.adminName || 'Admin' };

    this.http.post<any>(`${this.base}/approve-by-regno`, payload, { headers: this.headers }).subscribe({
      next: () => {
        this.approveLoading = false; this.approvingId = null;
        const name = this.memberToApprove.fullName;
        const idx  = this.allMembers.findIndex(m => m.registrationNo === this.memberToApprove.registrationNo);
        if (idx !== -1) {
          this.allMembers[idx].paymentStatus = 'Approved';
          this.allMembers[idx].approvedAt    = new Date().toISOString();
          this.allMembers[idx].approvedBy    = this.adminName;
          this.allMembers[idx].isActive      = true;
        }
        this.calculateStats(); this.filterMembers();
        this.showApproveModal = false; this.memberToApprove = null;
        this.showToast(`${name} approved! Confirmation email sent.`, 'success');
      },
      error: (err: any) => {
        this.approveLoading = false; this.approvingId = null;
        this.approveError = err.error?.error || err.error?.message || 'Approval failed.';
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════════════════════════════
  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
    this.toastMessage = message; this.toastType = type;
    this.toastTimer = setTimeout(() => { this.toastMessage = ''; }, 4500);
  }

  // ══════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════
  exportToExcel(): void {
    const headers = ['Reg No', 'Full Name', 'Type', 'Email', 'Mobile', 'Registered On', 'Payment Status', 'Amount', 'UTR'];
    const rows    = this.allMembers.map(m => [
      m.registrationNo, m.fullName, m.userType, m.email, m.mobileNumber,
      new Date(m.registeredAt).toLocaleDateString('en-IN'),
      m.paymentStatus, m.paymentAmount, m.utrNumber
    ]);
    const csv  = [headers, ...rows].map(r => r.map((v: any) => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `registrations_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ══════════════════════════════════════════════════════════════
  // CHARTS
  // ══════════════════════════════════════════════════════════════
  initCharts(): void {
    if (this.trendsChart)       { this.trendsChart.destroy(); }
    if (this.distributionChart) { this.distributionChart.destroy(); }

    this.trendsChart = new Chart('trendsChart', {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          { label: 'Members', data: [12, 19, 15, 25, 22, 30], borderColor: '#1a3c6e', backgroundColor: 'rgba(26,60,110,0.08)', tension: 0.4, fill: true },
          { label: 'Workers', data: [5,  8,  7,  12, 10, 15], borderColor: '#e65100', backgroundColor: 'rgba(230,81,0,0.08)',  tension: 0.4, fill: true }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
    });

    this.distributionChart = new Chart('distributionChart', {
      type: 'doughnut',
      data: {
        labels: ['Members', 'Workers'],
        datasets: [{ data: [this.totalMembers, this.totalWorkers], backgroundColor: ['#1a3c6e', '#e65100'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }
}
