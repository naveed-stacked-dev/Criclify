const Sponsor = require('../models/Sponsor');
const Post = require('../models/Post');
const GalleryImage = require('../models/GalleryImage');
const { uploadToS3, generateKey, validateImageFile, extractKeyFromUrl, deleteFromS3 } = require('../services/s3Service');

/* =========================================================
 * SPONSORS
 * ========================================================= */

exports.getSponsors = async (req, res, next) => {
  try {
    const sponsors = await Sponsor.find({ clubId: req.params.clubId }).sort('-createdAt');
    res.status(200).json({ success: true, data: sponsors });
  } catch (error) {
    next(error);
  }
};

exports.createSponsor = async (req, res, next) => {
  try {
    const { name, link } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Sponsor image is required' });
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const clubId = req.user.clubId;
    const key = generateKey(`clubs/${clubId}/sponsors`, file.originalname);
    const imageUrl = await uploadToS3(file.buffer, key, file.mimetype);

    const sponsor = await Sponsor.create({
      clubId,
      name,
      link,
      imageUrl,
    });

    res.status(201).json({ success: true, data: sponsor });
  } catch (error) {
    next(error);
  }
};

exports.updateSponsor = async (req, res, next) => {
  try {
    const { name, link } = req.body;
    const sponsor = await Sponsor.findById(req.params.id);
    if (!sponsor) return res.status(404).json({ success: false, message: 'Sponsor not found' });

    if (sponsor.clubId.toString() !== req.user.clubId?.toString() && req.user.role !== 'superAdmin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let imageUrl = sponsor.imageUrl;
    if (req.file) {
      const validation = validateImageFile(req.file);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }

      if (sponsor.imageUrl) {
        const oldKey = extractKeyFromUrl(sponsor.imageUrl);
        if (oldKey) await deleteFromS3(oldKey);
      }

      const clubId = req.user.clubId;
      const key = generateKey(`clubs/${clubId}/sponsors`, req.file.originalname);
      imageUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);
    }

    sponsor.name = name !== undefined ? name : sponsor.name;
    sponsor.link = link !== undefined ? link : sponsor.link;
    sponsor.imageUrl = imageUrl;

    await sponsor.save();

    res.status(200).json({ success: true, data: sponsor });
  } catch (error) {
    next(error);
  }
};

exports.deleteSponsor = async (req, res, next) => {
  try {
    const sponsor = await Sponsor.findById(req.params.id);
    if (!sponsor) return res.status(404).json({ success: false, message: 'Sponsor not found' });

    if (sponsor.clubId.toString() !== req.user.clubId?.toString() && req.user.role !== 'superAdmin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (sponsor.imageUrl) {
      const key = extractKeyFromUrl(sponsor.imageUrl);
      if (key) await deleteFromS3(key).catch(() => {});
    }

    await sponsor.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
 * POSTS
 * ========================================================= */

exports.getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ clubId: req.params.clubId })
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ clubId: req.params.clubId });

    res.status(200).json({ 
      success: true, 
      data: posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createPost = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    let imageUrl = null;

    if (req.file) {
      const validation = validateImageFile(req.file);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
      const clubId = req.user.clubId;
      const key = generateKey(`clubs/${clubId}/posts`, req.file.originalname);
      imageUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);
    }

    const post = await Post.create({
      clubId: req.user.clubId,
      title,
      description,
      imageUrl,
    });

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (post.clubId.toString() !== req.user.clubId?.toString() && req.user.role !== 'superAdmin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, description } = req.body;
    let imageUrl = post.imageUrl;

    // Check if new file uploaded or empty string sent to remove image
    if (req.file) {
      const validation = validateImageFile(req.file);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
      const clubId = req.user.clubId;
      const key = generateKey(`clubs/${clubId}/posts`, req.file.originalname);
      imageUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);
      
      // Delete old image
      if (post.imageUrl) {
        const oldKey = extractKeyFromUrl(post.imageUrl);
        if (oldKey) await deleteFromS3(oldKey).catch(() => {});
      }
    } else if (req.body.image === '') {
      // Explicit removal
      if (post.imageUrl) {
        const oldKey = extractKeyFromUrl(post.imageUrl);
        if (oldKey) await deleteFromS3(oldKey).catch(() => {});
      }
      imageUrl = null;
    }

    if (title) post.title = title;
    if (description !== undefined) post.description = description;
    post.imageUrl = imageUrl;

    await post.save();

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (post.clubId.toString() !== req.user.clubId?.toString() && req.user.role !== 'superAdmin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (post.imageUrl) {
      const key = extractKeyFromUrl(post.imageUrl);
      if (key) await deleteFromS3(key).catch(() => {});
    }

    await post.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
 * GALLERY
 * ========================================================= */

exports.getGallery = async (req, res, next) => {
  try {
    const filter = { clubId: req.params.clubId };
    if (req.query.tournamentId) filter.tournamentId = req.query.tournamentId;
    if (req.query.matchId) filter.matchId = req.query.matchId;

    const gallery = await GalleryImage.find(filter)
      .populate('tournamentId', 'name')
      .populate('matchId', 'title')
      .sort('-createdAt');

    res.status(200).json({ success: true, data: gallery });
  } catch (error) {
    next(error);
  }
};

exports.createGalleryImage = async (req, res, next) => {
  try {
    const { tournamentId, matchId, caption } = req.body;
    const file = req.file;

    if (!tournamentId) return res.status(400).json({ success: false, message: 'Tournament is required' });
    if (!matchId) return res.status(400).json({ success: false, message: 'Match is required' });

    if (!file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const clubId = req.user.clubId;
    const key = generateKey(`clubs/${clubId}/gallery`, file.originalname);
    const imageUrl = await uploadToS3(file.buffer, key, file.mimetype);

    const image = await GalleryImage.create({
      clubId,
      tournamentId,
      matchId,
      caption,
      imageUrl,
    });

    res.status(201).json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
};

exports.deleteGalleryImage = async (req, res, next) => {
  try {
    const image = await GalleryImage.findById(req.params.id);
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    if (image.clubId.toString() !== req.user.clubId?.toString() && req.user.role !== 'superAdmin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (image.imageUrl) {
      const key = extractKeyFromUrl(image.imageUrl);
      if (key) await deleteFromS3(key).catch(() => {});
    }

    await image.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
