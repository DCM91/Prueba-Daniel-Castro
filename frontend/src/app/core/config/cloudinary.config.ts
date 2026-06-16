/**
 * Public Cloudinary configuration for the FrameMatch SPA.
 *
 * These values are PUBLIC by design — they appear in every image URL we serve and
 * in every direct-to-Cloudinary upload request. The signed `api_secret` NEVER
 * lives here; it stays in the backend `.env` and is used by CloudinaryService to
 * verify uploads via the Admin API.
 *
 * To change the cloud, edit these constants (or load from environment at build
 * time if you add environments later).
 */
export const CLOUDINARY_CONFIG = {
  cloudName: 'dftvmkc1c',
  uploadEndpoint: 'https://api.cloudinary.com/v1_1/dftvmkc1c/image/upload',
  presets: {
    avatar: 'fm_av_upl',
    cover: 'fm_cv_upl',
    portfolio: 'fm_pf_upl',
    brief: 'fm_br_upl',
  },
  folders: {
    avatar: 'framematch/avatars',
    cover: 'framematch/covers',
    portfolio: 'framematch/portfolios',
    brief: 'framematch/briefs',
  },
  upload: {
    maxAvatarBytes: 2 * 1024 * 1024,
    maxCoverBytes: 5 * 1024 * 1024,
    maxPortfolioBytes: 8 * 1024 * 1024,
    maxBriefBytes: 5 * 1024 * 1024,
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'] as const,
    acceptedFormatsWithGif: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ] as const,
  },
} as const;

export type CloudinaryImageType = keyof typeof CLOUDINARY_CONFIG.presets;
export type CloudinaryAcceptedFormat =
  (typeof CLOUDINARY_CONFIG.upload.acceptedFormats)[number];
