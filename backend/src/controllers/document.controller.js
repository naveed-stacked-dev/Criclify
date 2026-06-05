const Document = require('../models/Document');
const { uploadToS3, generateKey, extractKeyFromUrl, deleteFromS3 } = require('../services/s3Service');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

exports.getDocuments = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const { category, tournamentId } = req.query;

    const filter = { clubId };
    if (category) filter.category = category;
    if (tournamentId) filter.tournamentId = tournamentId;

    const documents = await Document.find(filter)
      .sort('-createdAt')
      .populate('tournamentId', 'name');

    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

exports.createDocument = async (req, res, next) => {
  try {
    const { title, description, category, tournamentId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: 'File type not allowed. Upload PDF, Word, Excel, image, or text files.' });
    }

    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, message: 'File size exceeds 10 MB limit' });
    }

    const clubId = req.user.clubId || req.body.clubId;
    const key = generateKey(`clubs/${clubId}/documents`, file.originalname);
    const fileUrl = await uploadToS3(file.buffer, key, file.mimetype);

    const document = await Document.create({
      title,
      description: description || null,
      category: category || 'other',
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      clubId,
      tournamentId: tournamentId || null,
      uploadedBy: req.user._id || req.user.id,
      uploaderModel: req.user.role === 'superAdmin' ? 'SuperAdmin' : 'ClubManager',
    });

    await document.populate('tournamentId', 'name');
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const userClubId = req.user.clubId?.toString();
    if (userClubId && document.clubId.toString() !== userClubId && req.user.role !== 'superAdmin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (document.fileUrl) {
      const key = extractKeyFromUrl(document.fileUrl);
      if (key) await deleteFromS3(key).catch(() => {});
    }

    await Document.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Document deleted' });
  } catch (error) {
    next(error);
  }
};
