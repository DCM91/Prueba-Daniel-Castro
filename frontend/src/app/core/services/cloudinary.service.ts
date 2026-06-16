import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CLOUDINARY_CONFIG, CloudinaryImageType } from '../config/cloudinary.config';

export interface CloudinaryUploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface CloudinaryUploadOptions {
  /** Generate a deterministic public_id. Used for avatars to overwrite the same slot. */
  deterministicId?: string;
  /** Max bytes allowed for this upload (client-side guard). */
  maxBytes?: number;
  /** Allowed MIME types (client-side guard). */
  acceptedFormats?: readonly string[];
  /** Optional progress callback (0..100). */
  onProgress?: (pct: number) => void;
}

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private readonly http = inject(HttpClient);

  /**
   * Upload an image file directly to Cloudinary using an unsigned upload preset.
   * Returns the metadata needed to persist the resource server-side.
   */
  uploadImage(
    file: File,
    type: CloudinaryImageType,
    options: CloudinaryUploadOptions = {},
  ): Observable<CloudinaryUploadResult> {
    this.assertValidFile(file, type, options);

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', CLOUDINARY_CONFIG.presets[type]);
    if (options.deterministicId) {
      form.append('public_id', options.deterministicId);
    }

    return this.http.post<CloudinaryUploadResult>(
      CLOUDINARY_CONFIG.uploadEndpoint,
      form,
    );
  }

  private assertValidFile(
    file: File,
    type: CloudinaryImageType,
    options: CloudinaryUploadOptions,
  ): void {
    const maxBytes =
      options.maxBytes ?? this.defaultMaxBytesFor(type);
    const accepted =
      options.acceptedFormats ?? this.defaultAcceptedFormatsFor(type);

    if (file.size > maxBytes) {
      throw new Error(
        `La imagen pesa ${(file.size / 1024 / 1024).toFixed(2)} MB y el máximo permitido es ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`,
      );
    }

    if (!accepted.includes(file.type)) {
      throw new Error(
        `El formato ${file.type || 'desconocido'} no está permitido. Formatos aceptados: ${accepted.join(', ')}.`,
      );
    }
  }

  private defaultMaxBytesFor(type: CloudinaryImageType): number {
    const map = {
      avatar:    CLOUDINARY_CONFIG.upload.maxAvatarBytes,
      cover:     CLOUDINARY_CONFIG.upload.maxCoverBytes,
      portfolio: CLOUDINARY_CONFIG.upload.maxPortfolioBytes,
      brief:     CLOUDINARY_CONFIG.upload.maxBriefBytes,
    } as const;
    return map[type];
  }

  private defaultAcceptedFormatsFor(type: CloudinaryImageType): readonly string[] {
    return type === 'portfolio' || type === 'brief'
      ? CLOUDINARY_CONFIG.upload.acceptedFormatsWithGif
      : CLOUDINARY_CONFIG.upload.acceptedFormats;
  }
}
