import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '@app/services/auth.service';

export interface LoginRequiredDialogData {
  returnUrl?: string | null;
}

@Component({
  selector: 'app-login-required-dialog',
  templateUrl: './login-required-dialog.component.html',
  styleUrls: ['./login-required-dialog.component.scss']
})
export class LoginRequiredDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<LoginRequiredDialogComponent>,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: LoginRequiredDialogData
  ) {}

  /** Display label for the protected page (e.g. "boardsets" from "/boardsets" or "/boardsets/123"). */
  get pageSlug(): string {
    const url = this.data?.returnUrl?.trim() || '';
    const segment = url.replace(/^\//, '').split('/')[0];
    return segment || 'app';
  }

  login(): void {
    this.dialogRef.close();
    this.authService.login(this.data?.returnUrl ?? undefined);
  }

  close(): void {
    this.dialogRef.close();
  }
}
