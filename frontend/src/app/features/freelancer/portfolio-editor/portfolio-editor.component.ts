import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LightboxComponent } from '../../../core/components/lightbox/lightbox.component';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { FreelancerProfileService } from '../../../core/services/freelancer-profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { PortfolioItem } from '../../../core/types/auth.types';

interface PortfolioFormGroup {
  title: FormControl<string>;
  description: FormControl<string>;
}

const MAX_PORTFOLIO_ITEMS = 30;

@Component({
  selector: 'app-portfolio-editor',
  standalone: true,
  imports: [ReactiveFormsModule, LightboxComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-editor.component.html',
  styleUrl: './portfolio-editor.component.css',
})
export class PortfolioEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly profile = inject(FreelancerProfileService);
  private readonly cloudinary = inject(CloudinaryService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly maxItems = MAX_PORTFOLIO_ITEMS;
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly items = signal<PortfolioItem[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly globalMessage = signal<string | null>(null);
  readonly draggingId = signal<number | null>(null);
  readonly lightboxIndex = signal<number | null>(null);

  readonly form: FormGroup<PortfolioFormGroup> = this.fb.group({
    title: this.fb.control('', [Validators.maxLength(120)]),
    description: this.fb.control('', [Validators.maxLength(500)]),
  });

  readonly canAdd = computed<boolean>(() => this.items().length < this.maxItems && !this.uploading());

  readonly currentUser = this.auth.currentUser;

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.profile.listMyPortfolios().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar tu portfolio. Inténtalo de nuevo.');
        this.loading.set(false);
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.handleUpload(file);
    }
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void this.handleUpload(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private async handleUpload(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('uploader.error_format');
      return;
    }

    if (!this.canAdd()) {
      this.errorMessage.set('portfolio.max_items' as never);
      return;
    }

    this.uploading.set(true);
    this.errorMessage.set(null);
    this.globalMessage.set(null);

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
        this.cloudinary.uploadImage(file, 'portfolio').subscribe({
          next: (res) => resolve(res),
          error: (err: Error) => reject(err),
        });
      });

      const payload = this.form.getRawValue();
      this.profile
        .addPortfolioItem({
          public_id: uploaded.public_id,
          url: uploaded.secure_url || uploaded.url,
          width: uploaded.width,
          height: uploaded.height,
          format: uploaded.format,
          bytes: uploaded.bytes,
          title: payload.title.trim() || null,
          description: payload.description.trim() || null,
        })
        .subscribe({
          next: (item) => {
            this.items.set([...this.items(), item]);
            this.form.reset({ title: '', description: '' });
            this.uploading.set(false);
            this.globalMessage.set('uploader.success');
            this.flashGlobalMessage();
            const current = this.auth.currentUser();
            if (current?.freelancer_profile) {
              this.auth.setFreelancerProfile({
                ...current.freelancer_profile,
                portfolios: this.items(),
              });
            }
          },
          error: (err: unknown) => {
            this.uploading.set(false);
            this.errorMessage.set(this.errorText(err));
          },
        });
    } catch (err) {
      this.uploading.set(false);
      this.errorMessage.set(
        err instanceof Error ? err.message : 'uploader.error_unknown',
      );
    }
  }

  saveItem(item: PortfolioItem, input: { title: string; description: string }): void {
    this.profile
      .updatePortfolioItem(item.id, {
        title: input.title.trim() || null,
        description: input.description.trim() || null,
      })
      .subscribe({
        next: (updated) => {
          this.items.set(this.items().map((it) => (it.id === updated.id ? updated : it)));
          this.globalMessage.set('uploader.success');
          this.flashGlobalMessage();
        },
        error: (err: unknown) => {
          this.errorMessage.set(this.errorText(err));
        },
      });
  }

  deleteItem(item: PortfolioItem): void {
    this.profile.deletePortfolioItem(item.id).subscribe({
      next: () => {
        this.items.set(this.items().filter((it) => it.id !== item.id));
        this.globalMessage.set('portfolio.delete_confirm');
        this.flashGlobalMessage();
      },
      error: (err: unknown) => {
        this.errorMessage.set(this.errorText(err));
      },
    });
  }

  moveUp(index: number): void {
    if (index === 0) return;
    const next = [...this.items()];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    this.items.set(next);
    this.persistOrder(next);
  }

  moveDown(index: number): void {
    if (index === this.items().length - 1) return;
    const next = [...this.items()];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    this.items.set(next);
    this.persistOrder(next);
  }

  openLightbox(index: number): void {
    this.lightboxIndex.set(index);
  }

  closeLightbox(): void {
    this.lightboxIndex.set(null);
  }

  private persistOrder(items: PortfolioItem[]): void {
    this.profile.reorderPortfolioItems(items.map((i) => i.id)).subscribe({
      error: (err: unknown) => {
        this.errorMessage.set(this.errorText(err));
        this.refresh();
      },
    });
  }

  private flashGlobalMessage(): void {
    setTimeout(() => this.globalMessage.set(null), 1800);
  }

  private errorText(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { message?: string } }).error;
      if (e?.message) return e.message;
    }
    return 'uploader.error_unknown';
  }
}
