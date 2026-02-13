const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, '../../uploads');
['avatars', 'badges', 'photos'].forEach((sub) => {
  const dir = path.join(uploadsDir, sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Create a multer upload middleware for a specific sub-folder.
 * @param {'avatars'|'badges'} subfolder
 */
const createUploader = (subfolder) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(uploadsDir, subfolder));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${subfolder.slice(0, -1)}_${req.user.id}_${Date.now()}${ext}`;
      cb(null, uniqueName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed.'));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  });
};

const avatarUpload = createUploader('avatars');
const badgeUpload = createUploader('badges');
const photoUpload = createUploader('photos');

module.exports = { avatarUpload, badgeUpload, photoUpload, uploadsDir };

