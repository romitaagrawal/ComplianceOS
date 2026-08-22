import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, OnChanges, SimpleChanges, Input, ChangeDetectorRef, EventEmitter, Output } from '@angular/core';
import { AuthService } from '../auth/auth';
import { RegularizationService, RegularizationSubmitPayload, REGULARIZATION_REASONS } from '../regularization/regularization';
import { RegularizationRequest, RegularizationReason } from '../core/models';
import { Modal } from '../shared/modal/modal';
import { Pagination } from '../shared/pagination/pagination';

@Component({
  selector: 'app-attendance-regularization',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, Pagination],
  templateUrl: './attendance-regularization.html',
  styleUrl: './attendance-regularization.css'
})
export class AttendanceRegularization implements OnInit, OnChanges {
  // Fired after an approve/reject succeeds so the host dashboard can
  // refresh its own attendance-derived KPIs, charts and history table.
   @Input() prefillDate: string | null = null;
  @Output() decided = new EventEmitter<void>();

  reasons: RegularizationReason[] = REGULARIZATION_REASONS;
  canApprove = false;

  // ---- Submit form ----
  formDate = '';
  formReason: RegularizationReason = 'Forgot to Clock Out';
  formOtherReason = '';
  formClockInTime = '';
  formClockOutTime = '';
  formRemarks = '';
  submitting = false;
  submitError = '';
  submitSuccess = '';

  minDate = '';
  maxDate = '';

  // ---- History ----
  history: RegularizationRequest[] = [];
  historyLoading = true;
  historyError = '';

  // ---- Approvals ----
  approvals: RegularizationRequest[] = [];
  approvalsLoading = false;
  approvalsError = '';

  showRejectModal = false;
  rejectTargetId: number | null = null;
  rejectReasonText = '';
  rejectError = '';
  rejecting = false;

  historyPage = 1;
historyPageSize = 10;
historyTotalCount = 0;

  constructor(
    private authService: AuthService,
    private regularizationService: RegularizationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRole();
    // Backend authorization is fully hierarchy-based (checks ManagerId, not
    // role) — this only decides whether to show the approvals panel, since
    // only Manager/HRManager accounts have direct reports in this app today.
    this.canApprove = role === 'Manager' || role === 'HRManager';

    const today = new Date();
    this.maxDate = this.toDateInput(today);
    const past = new Date();
    past.setDate(past.getDate() - 30);
    this.minDate = this.toDateInput(past);

    this.loadHistory();
    if (this.canApprove) {
      this.loadApprovals();
    }
  }

  private toDateInput(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  get showOtherReason(): boolean {
    return this.formReason === 'Other';
  }

  // ---------- History ----------
  loadHistory(): void {
  this.historyLoading = true;
  this.regularizationService.getMyHistory(this.historyPage, this.historyPageSize).subscribe({
    next: (res) => { this.history = res.items; this.historyTotalCount = res.totalCount; this.historyLoading = false; this.cdr.detectChanges(); },
    error: () => { this.historyError = 'Failed to load your regularization history.'; this.historyLoading = false; this.cdr.detectChanges(); }
  });
}

onHistoryPageChange(page: number): void {
  this.historyPage = page;
  this.loadHistory();
}

  // ---------- Submit ----------
  submit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (!this.formDate || !this.formClockInTime || !this.formClockOutTime) {
      this.submitError = 'Please fill in the attendance date and both times.';
      return;
    }
    if (this.formReason === 'Other' && !this.formOtherReason.trim()) {
      this.submitError = "Please explain the reason when selecting 'Other'.";
      return;
    }

    const payload: RegularizationSubmitPayload = {
      attendanceDate: this.formDate,
      reason: this.formReason,
      otherReasonText: this.formReason === 'Other' ? this.formOtherReason.trim() : null,
      requestedClockIn: `${this.formDate}T${this.formClockInTime}:00`,
      requestedClockOut: `${this.formDate}T${this.formClockOutTime}:00`,
      remarks: this.formRemarks.trim() || null
    };

    this.submitting = true;
    this.regularizationService.submit(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.submitSuccess = 'Regularization request submitted.';
        this.formDate = '';
        this.formReason = 'Forgot to Clock Out';
        this.formOtherReason = '';
        this.formClockInTime = '';
        this.formClockOutTime = '';
        this.formRemarks = '';
        this.cdr.detectChanges();
        this.loadHistory();
      },
      error: (err) => { this.submitting = false; this.submitError = err.error || 'Failed to submit request.'; this.cdr.detectChanges(); }
    });
  }

  cancelRequest(req: RegularizationRequest): void {
    if (!confirm('Cancel this pending regularization request?')) return;
    this.regularizationService.cancel(req.id).subscribe({
      next: () => this.loadHistory(),
      error: (err) => { this.historyError = err.error || 'Failed to cancel request.'; this.cdr.detectChanges(); }
    });
  }

  // ---------- Approvals ----------
  loadApprovals(): void {
    this.approvalsLoading = true;
    this.regularizationService.getPendingApprovals().subscribe({
      next: (data) => { this.approvals = data; this.approvalsLoading = false; this.cdr.detectChanges(); },
      error: () => { this.approvalsError = 'Failed to load pending approvals.'; this.approvalsLoading = false; this.cdr.detectChanges(); }
    });
  }

  approve(req: RegularizationRequest): void {
    if (!confirm(`Approve ${req.employeeName}'s regularization for ${new Date(req.attendanceDate).toLocaleDateString()}?`)) return;
    this.regularizationService.approve(req.id).subscribe({
      next: () => { this.loadApprovals(); this.decided.emit(); },
      error: (err) => { this.approvalsError = err.error || 'Failed to approve request.'; this.cdr.detectChanges(); }
    });
  }

  openRejectModal(req: RegularizationRequest): void {
    this.rejectTargetId = req.id;
    this.rejectReasonText = '';
    this.rejectError = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.rejectReasonText.trim()) {
      this.rejectError = 'A rejection reason is required.';
      return;
    }
    this.rejecting = true;
    this.regularizationService.reject(this.rejectTargetId!, this.rejectReasonText.trim()).subscribe({
      next: () => {
        this.rejecting = false;
        this.showRejectModal = false;
        this.loadApprovals();
        this.decided.emit();
      },
      error: (err) => { this.rejecting = false; this.rejectError = err.error || 'Failed to reject request.'; this.cdr.detectChanges(); }
    });
  }

  // ---------- Helpers ----------
  hoursDifference(req: RegularizationRequest): string {
    if (!req.originalClockIn || !req.originalClockOut) return '—';
    const originalMinutes = (new Date(req.originalClockOut).getTime() - new Date(req.originalClockIn).getTime()) / 60000;
    const requestedMinutes = (new Date(req.requestedClockOut).getTime() - new Date(req.requestedClockIn).getTime()) / 60000;
    const diff = (requestedMinutes - originalMinutes) / 60;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}h`;
  }

  ngOnChanges(changes: SimpleChanges): void {
  if (changes['prefillDate'] && this.prefillDate) {
    this.formDate = this.prefillDate;
  }
}
onHistoryPageSizeChange(size: number): void {
  this.historyPageSize = size;
  this.historyPage = 1;
  this.loadHistory();
}

approvalsPage = 1;
approvalsPageSize = 10;

get pagedApprovals(): RegularizationRequest[] {
  const start = (this.approvalsPage - 1) * this.approvalsPageSize;
  return this.approvals.slice(start, start + this.approvalsPageSize);
}

onApprovalsPageSizeChange(size: number): void {
  this.approvalsPageSize = size;
  this.approvalsPage = 1;
}
}