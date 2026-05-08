const s3Service = require('../services/s3Service');

/**
 * Mapping of FormData field names to S3 folder paths and the req.body key to assign the URL to.
 * Format: { fieldname: { folder: string, bodyKey: string } }
 */
const IMAGE_FIELD_MAP = {
  // Club
  logo:      { folder: (id) => `clubs/${id}/logo`,    bodyKey: 'logo' },
  bannerUrl: { folder: (id) => `clubs/${id}/banner`,  bodyKey: 'bannerUrl' },
  // Team
  teamLogo:  { folder: (id) => `teams/${id}/logo`,   bodyKey: 'logoUrl' },
  // Player
  avatar:    { folder: (id) => `players/${id}/avatar`, bodyKey: 'avatar' },
};

/**
 * Process uploaded files from req.files for a given entity.
 * Uploads each file to S3 and assigns the resulting URL to req.body.
 * Strips any non-string values to prevent Mongoose cast errors.
 *
 * @param {Object} req  - Express request object (req.files, req.body, req.params.id)
 * @param {Array}  fieldConfigs - Array of { fieldname, folder, bodyKey }
 */
const processUploadedFiles = async (req, fieldConfigs) => {
  const entityId = req.params?.id || 'new';

  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files) {
      const config = fieldConfigs.find((c) => c.fieldname === file.fieldname);
      if (!config) continue;

      const folder = typeof config.folder === 'function' ? config.folder(entityId) : config.folder;
      const key = s3Service.generateKey(folder, file.originalname);

      try {
        const url = await s3Service.uploadToS3(file.buffer, key, file.mimetype);
        req.body[config.bodyKey] = url;
        console.log(`[ImageHandler] Uploaded ${file.fieldname} → ${url}`);
      } catch (err) {
        console.error(`[ImageHandler] Failed to upload ${file.fieldname}:`, err.message);
        throw err; // Propagate to prevent partial DB update
      }
    }
  }

  // Strip any non-string, non-null values (e.g. File objects that leaked through)
  for (const config of fieldConfigs) {
    const val = req.body[config.bodyKey];
    if (val !== undefined && val !== null && typeof val !== 'string') {
      console.warn(`[ImageHandler] Stripping invalid ${config.bodyKey} value (type: ${typeof val})`);
      delete req.body[config.bodyKey];
    }
    // Treat empty string as explicit null (removal signal)
    if (val === '') {
      req.body[config.bodyKey] = null;
    }
  }
};

/**
 * Safely delete an image from S3 by URL (fire-and-forget, never throws).
 * @param {string|null} url - S3 URL
 */
const safeDeleteImage = async (url) => {
  if (!url || typeof url !== 'string') return;
  try {
    const key = s3Service.extractKeyFromUrl(url);
    if (key) {
      await s3Service.deleteFromS3(key);
      console.log(`[ImageHandler] Deleted S3 object: ${key}`);
    }
  } catch (err) {
    console.warn(`[ImageHandler] Failed to delete image ${url}:`, err.message);
  }
};

/**
 * Delete multiple images from S3 in parallel (fire-and-forget).
 * @param {Array<string|null>} urls
 */
const safeDeleteImages = async (urls = []) => {
  await Promise.allSettled(urls.filter(Boolean).map(safeDeleteImage));
};

module.exports = { processUploadedFiles, safeDeleteImage, safeDeleteImages, IMAGE_FIELD_MAP };
