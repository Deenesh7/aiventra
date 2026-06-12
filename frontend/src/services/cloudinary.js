// Cloudinary upload service for AIVENTRA evidence files
// Uses unsigned upload presets so no API secret is exposed to the browser.
//
// One-time setup (Cloudinary dashboard):
//   1. Sign up at https://cloudinary.com (no card required, 25 GB free)
//   2. Note your cloud_name from the dashboard
//   3. Settings → Upload → Upload presets → Add upload preset
//      - Signing Mode: Unsigned
//      - Folder: aiventra
//      - Save and note the preset name
//   4. Set these in frontend/.env:
//        VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
//        VITE_CLOUDINARY_UPLOAD_PRESET=your-preset-name

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

const isConfigured = () => Boolean(CLOUD_NAME && UPLOAD_PRESET);

// Cloudinary chooses the right resource_type automatically when set to "auto":
//   image/*   → image
//   video/*   → video
//   anything  → raw (pdfs, docs)
const endpointFor = () =>
  `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

const slug = (s = 'file') =>
  s.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'file';

export const cloudinaryService = {
  isConfigured,

  /**
   * Upload a file via XHR so we can stream progress events to the UI.
   * Resolves to:
   *   {
   *     url,           // https secure_url
   *     publicId,      // cloudinary public_id, used for deletes / transforms
   *     bytes,         // file size as reported by cloudinary
   *     format,        // resolved format (pdf, jpg, png, mp4, …)
   *     resourceType,  // image | video | raw
   *     width, height, // present for images/videos
   *     original,      // raw cloudinary response, for advanced consumers
   *   }
   */
  async uploadEvidence({ caseId, file, onProgress }) {
    if (!isConfigured()) {
      throw new Error(
        'Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and ' +
          'VITE_CLOUDINARY_UPLOAD_PRESET in frontend/.env, then restart the dev server.',
      );
    }
    if (!file) throw new Error('No file provided');

    const folder = `aiventra/evidence/${slug(caseId || 'unassigned')}`;
    const publicId = `${Date.now()}_${slug(file.name).replace(/\.[^.]+$/, '')}`;

    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    fd.append('folder', folder);
    fd.append('public_id', publicId);
    // tag uploads so they're filterable in the Cloudinary console
    fd.append('tags', `aiventra,case_${slug(caseId || 'unassigned')}`);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpointFor(), true);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && onProgress) {
          onProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const r = JSON.parse(xhr.responseText);
            resolve({
              url: r.secure_url,
              publicId: r.public_id,
              bytes: r.bytes,
              format: r.format,
              resourceType: r.resource_type,
              width: r.width,
              height: r.height,
              original: r,
            });
          } catch (e) {
            reject(new Error('Cloudinary returned a malformed response'));
          }
        } else {
          let detail = '';
          try {
            detail = JSON.parse(xhr.responseText)?.error?.message || '';
          } catch (_) {
            /* noop */
          }
          reject(new Error(`Cloudinary upload failed (${xhr.status}): ${detail || xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'));
      xhr.send(fd);
    });
  },

  /**
   * Build a transformation URL for thumbnails / previews.
   * Example: thumbnail(publicId, { w: 320, h: 240 })
   */
  thumbnail(publicId, { w = 320, h = 240 } = {}) {
    if (!publicId || !CLOUD_NAME) return null;
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${w},h_${h},q_auto/${publicId}`;
  },
};

// Backwards-compatible alias so existing imports keep working
export const storageService = cloudinaryService;
