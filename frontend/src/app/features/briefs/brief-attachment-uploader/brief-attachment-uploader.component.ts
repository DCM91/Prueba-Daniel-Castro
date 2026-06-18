import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { BriefsService } from '../../../core/services/briefs.service';
import { BriefAttachment } from '../../../core/types/auth.types';

interface UploadTask {
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorKey: string | null;
}

const MAX_ATTACHMENTS = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = /^image\/(jpeg|png|webp|gif|avif)$/;

@Component({
  selector: 'app-brief-attachment-uploader',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brief-attachment-uploader.component.html',
  styleUrl: './brief-attachment-uploader.component.css',
})
export class BriefAttachmentUploaderComponent implements OnInit, OnChanges {
  private readonly cloudinary = inject(CloudinaryService);
  private readonly briefs = inject(BriefsService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly briefId = input.required<number>();
  readonly initialAttachments = input<BriefAttachment[]>([]);

  readonly attachments = signal<BriefAttachment[]>([]);
  readonly queue = signal<UploadTask[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly dragOver = signal<boolean>(false);

  readonly titleControl: FormControl<string> = this.fb.control('', [
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(120),
  ]);

  readonly maxItems = MAX_ATTACHMENTS;
  readonly maxMb = Math.round(MAX_BYTES / 1024 / 1024);

  readonly currentTotal = computed<number>(() => this.attachments().length + this.queue().length);
  readonly canAdd = computed<boolean>(() => this.currentTotal() < this.maxItems);
  readonly isProcessing = computed<boolean>(() =>
    this.queue().some((t) => t.status === 'uploading'),
  );
  readonly remainingSlots = computed<number>(() => this.maxItems - this.attachments().length);

  readonly attachmentChange = output<BriefAttachment[]>();

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  ngOnInit(): void {
    this.attachments.set([...this.initialAttachments()]);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const initial = changes['initialAttachments'];
    if (initial && this.attachments().length === 0 && this.initialAttachments().length > 0) {
      this.attachments.set([...this.initialAttachments()]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length > 0) {
      void this.enqueue(files);
    }
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
    if (files.length > 0) {
      void this.enqueue(files);
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
      if (this.canAdd()) {
        this.fileInput()?.nativeElement.click();
      }
    }
  }

  openPicker(): void {
    if (this.canAdd()) {
      this.fileInput()?.nativeElement.click();
    }
  }

  moveUp(attachment: BriefAttachment): void {
    const list = [...this.attachments()];
    const index = list.findIndex((a) => a.id === attachment.id);
    if (index <= 0) return;
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
    this.attachments.set(list);
    this.persistOrder(list);
  }

  moveDown(attachment: BriefAttachment): void {
    const list = [...this.attachments()];
    const index = list.findIndex((a) => a.id === attachment.id);
    if (index < 0 || index >= list.length - 1) return;
    [list[index], list[index + 1]] = [list[index + 1], list[index]];
    this.attachments.set(list);
    this.persistOrder(list);
  }

  remove(attachment: BriefAttachment): void {
    this.briefs.detachImage(this.briefId(), attachment.id).subscribe({
      next: () => {
        const list = this.attachments().filter((a) => a.id !== attachment.id);
        this.attachments.set(list);
        this.attachmentChange.emit(list);
        this.errorMessage.set(null);
      },
      error: (err: unknown) => {
        this.errorMessage.set(this.errorText(err, 'brief_attachments.error_remove'));
      },
    });
  }

  private async enqueue(files: File[]): Promise<void> {
    const slots = this.remainingSlots();
    if (slots <= 0) {
      this.errorMessage.set('brief_attachments.error_limit');
      return;
    }

    const accepted: UploadTask[] = [];
    for (const file of files.slice(0, slots)) {
      if (!ACCEPTED_MIME.test(file.type)) {
        this.errorMessage.set('brief_attachments.error_filetype');
        return;
      }
      if (file.size > MAX_BYTES) {
        this.errorMessage.set('brief_attachments.error_size');
        return;
      }
      accepted.push({
        file,
        previewUrl: this.readPreview(file),
        status: 'pending',
        errorKey: null,
      });
    }

    this.queue.set([...this.queue(), ...accepted]);
    this.errorMessage.set(null);

    for (const task of accepted) {
      await this.processTask(task);
    }
  }

  private async processTask(task: UploadTask): Promise<void> {
    this.updateTask(task, { status: 'uploading' });
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
        this.cloudinary.uploadImage(task.file, 'brief').subscribe({
          next: (res) => resolve(res),
          error: (err: Error) => reject(err),
        });
      });

      const attachment = await new Promise<BriefAttachment>((resolve, reject) => {
        this.briefs
          .attachImage(this.briefId(), {
            public_id: uploaded.public_id,
            url: uploaded.secure_url || uploaded.url,
            width: uploaded.width,
            height: uploaded.height,
            format: uploaded.format,
            bytes: uploaded.bytes,
            title: this.titleControl.value.trim(),
          })
          .subscribe({
            next: (res) => resolve(res),
            error: (err) => reject(err),
          });
      });

      const list = [...this.attachments(), attachment];
      this.attachments.set(list);
      this.attachmentChange.emit(list);
      this.titleControl.reset('');
      this.titleControl.markAsUntouched();
      this.updateTask(task, { status: 'done' });
    } catch (err) {
      this.updateTask(task, {
        status: 'error',
        errorKey: this.errorText(err, 'brief_attachments.error_save'),
      });
      this.errorMessage.set(this.errorText(err, 'brief_attachments.error_save'));
    } finally {
      this.cleanupQueue();
    }
  }

  private updateTask(task: UploadTask, patch: Partial<UploadTask>): void {
    this.queue.set(this.queue().map((t) => (t === task ? { ...t, ...patch } : t)));
  }

  private cleanupQueue(): void {
    setTimeout(() => {
      this.queue.set(
        this.queue().filter((t) => t.status === 'pending' || t.status === 'uploading'),
      );
    }, 1200);
  }

  private persistOrder(list: BriefAttachment[]): void {
    this.attachmentChange.emit(list);
    this.briefs
      .reorderAttachments(
        this.briefId(),
        list.map((a) => a.id),
      )
      .subscribe({
        error: (err: unknown) => {
          this.errorMessage.set(this.errorText(err, 'brief_attachments.error_reorder'));
        },
      });
  }

  private readPreview(file: File): string {
    const reader = new FileReader();
    const result = reader.readAsDataURL(file);
    void result;
    return URL.createObjectURL(file);
  }

  private errorText(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'uploader.error_network';
      if (err.status === 422) {
        return (err.error as { message?: string } | null)?.message ?? fallback;
      }
      if (err.status === 403) {
        return (err.error as { message?: string } | null)?.message ?? fallback;
      }
      return fallback;
    }
    if (err instanceof Error) return err.message;
    return fallback;
  }
}
