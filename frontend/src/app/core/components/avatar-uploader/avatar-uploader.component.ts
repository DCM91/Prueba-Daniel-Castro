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

import { AuthService } from '../../services/auth.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { UserService } from '../../services/user.service';
import { AvatarUrls, User } from '../../types/auth.types';

type UploadStatus =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

@Component({
  selector: 'app-avatar-uploader',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar-uploader.component.html',
  styleUrl: './avatar-uploader.component.css',
})
export class AvatarUploaderComponent {
  private readonly cloudinary = inject(CloudinaryService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);

  readonly currentAvatarUrl = input<string | null>(null);
  readonly currentAvatarUrls = input<AvatarUrls | null>(null);
  readonly userName = input<string>('');
  readonly maxBytes = input<number>(2 * 1024 * 1024);

  readonly avatarUpdated = output<User>();

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly status = signal<UploadStatus>({ kind: 'idle' });
  readonly dragOver = signal<boolean>(false);
  readonly previewUrl = signal<string | null>(null);

  readonly initials = computed<string>(() => {
    const name = this.userName().trim();
    if (!name) return '?';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?';
  });

  readonly displayUrl = computed<string | null>(() => {
    const preview = this.previewUrl();
    if (preview !== null) return preview;
    const urls = this.currentAvatarUrls();
    if (urls?.md) return urls.md;
    return this.currentAvatarUrl();
  });

  readonly isUploading = computed<boolean>(() => this.status().kind === 'uploading');
  readonly errorMessage = computed<string | null>(() => {
    const s = this.status();
    return s.kind === 'error' ? s.message : null;
  });
  readonly maxMb = computed<number>(() => Math.round(this.maxBytes() / 1024 / 1024));

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
    this.userService.removeAvatar().subscribe({
      next: (user) => {
        this.previewUrl.set(null);
        this.status.set({ kind: 'success' });
        this.auth.setCurrentUser(user);
        this.avatarUpdated.emit(user);
        this.resetStatusAfterDelay();
      },
      error: (err: unknown) => {
        this.status.set({ kind: 'error', message: this.errorText(err) });
      },
    });
  }

  private async handleFile(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      this.status.set({ kind: 'error', message: 'avatar.error_format' });
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
        this.cloudinary.uploadImage(file, 'avatar').subscribe({
          next: (res) => resolve(res),
          error: (err: Error) => reject(err),
        });
      });

      this.userService
        .setAvatar({
          public_id: uploaded.public_id,
          url: uploaded.secure_url || uploaded.url,
          width: uploaded.width,
          height: uploaded.height,
          format: uploaded.format,
          bytes: uploaded.bytes,
        })
        .subscribe({
          next: (user) => {
            this.status.set({ kind: 'success' });
            this.auth.setCurrentUser(user);
            this.avatarUpdated.emit(user);
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
    if (err instanceof Error) return err.message;
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'uploader.error_network';
      if (err.status === 403) {
        return (
          (err.error as { message?: string } | null)?.message ??
          'uploader.error_unknown'
        );
      }
      return 'uploader.error_unknown';
    }
    return 'uploader.error_unknown';
  }
}
