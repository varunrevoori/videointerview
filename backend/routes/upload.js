const express = require('express');
const router = express.Router();
const { upload } = require('../middlewares/upload');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const path = require('path');
const fs = require('fs');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Upload single image
router.post('/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Generate URL for the uploaded file
    const imageUrl = `http://localhost:5000/uploads/toys/${req.file.filename}`;
    
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
});

// Upload multiple images
router.post('/upload-images', upload.array('images', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    const imageUrls = req.files.map(file => ({
      url: `http://localhost:5000/uploads/toys/${file.filename}`,
      filename: file.filename
    }));
    
    res.json({
      message: 'Images uploaded successfully',
      images: imageUrls
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ message: 'Error uploading images', error: error.message });
  }
});

// Delete image
router.delete('/delete-image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/toys', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'Image deleted successfully' });
    } else {
      res.status(404).json({ message: 'Image not found' });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ message: 'Error deleting image', error: error.message });
  }
});

module.exports = router;