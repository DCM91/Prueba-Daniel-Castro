import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe } from '../../pipes/translate.pipe';

import { CloudinaryService } from '../../services/cloudinary.service';
import { FreelancerProfileService } from '../../services/freelancer-profile.service';
import { AuthService } from '../../services/auth.service';
import { CoverUrls, FreelancerProfile } from '../../types/auth.types';

type UploadStatus =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

@Component({
  selector: 'app-cover-uploader',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cover-uploader.component.html',
  styleUrl: './cover-uploader.component.css',
})
export class CoverUploaderComponent {
  private readonly cloudinary = inject(CloudinaryService);
  private readonly profile = inject(FreelancerProfileService);
  private readonly auth = inject(AuthService);

  readonly currentCoverUrl = input<string | null>(null);
  readonly currentCoverUrls = input<CoverUrls | null>(null);
  readonly maxBytes = input<number>(10 * 1024 * 1024);

  readonly coverUpdated = output<FreelancerProfile>();

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly status = signal<UploadStatus>({ kind: 'idle' });
  readonly dragOver = signal<boolean>(false);
  readonly previewUrl = signal<string | null>(null);

  readonly isUploading = computed<boolean>(() => this.status().kind === 'uploading');
  readonly errorMessage = computed<string | null>(() => {
    const s = this.status();
    return s.kind === 'error' ? s.message : null;
  });
  readonly maxMb = computed<number>(() => Math.round(this.maxBytes() / 1024 / 1024));

  readonly displayUrl = computed<string | null>(() => {
    const preview = this.previewUrl();
    if (preview !== null) return preview;
    const urls = this.currentCoverUrls();
    if (urls?.lg) return urls.lg;
    return this.currentCoverUrl();
  });

  @HostBinding('attr.data-drag-over') get dragOverAttr(): string {
    return this.dragOver() ? 'true' : 'false';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.handleFile(file);
    }
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void this.handleFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.fileInput()?.nativeElement.click();
    }
  }

  openPicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  remove(): void {
    if (this.isUploading()) return;

    this.status.set({ kind: 'uploading' });
    this.profile.removeCover().subscribe({
      next: (updated) => {
        this.previewUrl.set(null);
        this.status.set({ kind: 'success' });
        this.auth.setFreelancerProfile(updated);
        this.coverUpdated.emit(updated);
        this.resetStatusAfterDelay();
      },
      error: (err: unknown) => {
        this.status.set({ kind: 'error', message: this.errorText(err) });
      },
    });
  }

  private async handleFile(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      this.status.set({ kind: 'error', message: 'uploader.error_format' });
      return;
    }

    this.showLocalPreview(file);
    this.status.set({ kind: 'uploading' });

    try {
      const uploaded = await new Promise<{
        public_id: string;
        url: string;
        secure_url: string;
        width: number;
        height: number;
        format: string;
        bytes: number;
      }>((resolve, reject) => {
        this.cloudinary.uploadImage(file, 'cover').subscribe({
          next: (res) => resolve(res),
          error: (err: Error) => reject(err),
        });
      });

      this.profile
        .setCover({
          public_id: uploaded.public_id,
          url: uploaded.secure_url || uploaded.url,
          width: uploaded.width,
          height: uploaded.height,
          format: uploaded.format,
          bytes: uploaded.bytes,
        })
        .subscribe({
          next: (updated) => {
            this.status.set({ kind: 'success' });
            this.auth.setFreelancerProfile(updated);
            this.coverUpdated.emit(updated);
            this.resetStatusAfterDelay();
          },
          error: (err: unknown) => {
            this.revertLocalPreview();
            this.status.set({ kind: 'error', message: this.errorText(err) });
          },
        });
    } catch (err) {
      this.revertLocalPreview();
      this.status.set({
        kind: 'error',
        message: err instanceof Error ? err.message : 'uploader.error_unknown',
      });
    }
  }

  private showLocalPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        this.previewUrl.set(result);
      }
    };
    reader.readAsDataURL(file);
  }

  private revertLocalPreview(): void {
    this.previewUrl.set(null);
  }

  private resetStatusAfterDelay(): void {
    setTimeout(() => {
      const current = this.status();
      if (current.kind === 'success') {
        this.status.set({ kind: 'idle' });
      }
    }, 1800);
  }

  private errorText(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'uploader.error_network';
      if (err.status === 403) {
        return (err.error as { message?: string } | null)?.message ?? 'uploader.error_unknown';
      }
      return 'uploader.error_unknown';
    }
    if (err instanceof Error) return err.message;
    return 'uploader.error_unknown';
  }
}
