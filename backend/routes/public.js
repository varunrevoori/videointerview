const express = require('express');
const router = express.Router();
const Toy = require('../models/Toy');
const Plan = require('../models/Plan');
const PromoCode = require('../models/Promocode');

// ===============================
// PUBLIC TOY ROUTES
// ===============================

// Get all active toys for users
router.get('/toys', async (req, res) => {
  try {
    const { category, ageRange, minPoints, maxPoints, search } = req.query;
    
    let query = { isActive: true };
    
    // Add filters
    if (category) {
      query.category = category;
    }
    
    if (ageRange) {
      query.ageRange = { $regex: ageRange, $options: 'i' };
    }
    
    if (minPoints || maxPoints) {
      query.points = {};
      if (minPoints) query.points.$gte = parseInt(minPoints);
      if (maxPoints) query.points.$lte = parseInt(maxPoints);
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    const toys = await Toy.find(query)
      .select('-createdBy -updatedBy')
      .sort({ createdAt: -1 });

    // Add inventory status using toy's own quantity fields
    const toysWithInventory = toys.map(toy => {
      const toyObj = toy.toObject();
      return {
        ...toyObj,
        inventory: {
          available: toyObj.availableQuantity || 0,
          isInStock: (toyObj.availableQuantity || 0) > 0
        }
      };
    });

    res.json(toysWithInventory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching toys', error: error.message });
  }
});

// Get single toy details
router.get('/toys/:id', async (req, res) => {
  try {
    const toy = await Toy.findOne({ _id: req.params.id, isActive: true })
      .select('-createdBy -updatedBy');
    
    if (!toy) {
      return res.status(404).json({ message: 'Toy not found' });
    }

    // Use toy's own quantity fields for inventory status
    const toyObj = toy.toObject();
    const toyWithInventory = {
      ...toyObj,
      inventory: {
        available: toyObj.availableQuantity || 0,
        isInStock: (toyObj.availableQuantity || 0) > 0,
        condition: 'good'
      }
    };

    res.json(toyWithInventory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching toy', error: error.message });
  }
});

// Get toy categories
router.get('/toys/categories/all', async (req, res) => {
  try {
    const categories = await Toy.distinct('category', { isActive: true });
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Toy.countDocuments({ category, isActive: true });
        return { category, count };
      })
    );
    
    res.json(categoriesWithCount);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// ===============================
// PUBLIC PLAN ROUTES
// ===============================

// Get all active plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true })
      .sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching plans', error: error.message });
  }
});

// Get single plan details
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = await Plan.findOne({ _id: req.params.id, isActive: true });
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching plan', error: error.message });
  }
});

// ===============================
// PROMO CODE ROUTES
// ===============================

// Validate promo code
router.post('/promocodes/validate', async (req, res) => {
  try {
    const { code, planId, userId } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Promo code is required' 
      });
    }

    // Find the promo code
    const promoCode = await PromoCode.findOne({ 
      code: code.toUpperCase() 
    }).populate('applicablePlans');
    
    if (!promoCode) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid promo code' 
      });
    }

    // Check if promo code is still valid (date range)
    const now = new Date();
    if (promoCode.validFrom && now < promoCode.validFrom) {
      return res.status(400).json({ 
        success: false, 
        message: 'Promo code is not yet active' 
      });
    }
    
    if (promoCode.validTo && now > promoCode.validTo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Promo code has expired' 
      });
    }

    // Check usage limits
    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      return res.status(400).json({ 
        success: false, 
        message: 'Promo code usage limit reached' 
      });
    }

    // Check if applicable to the selected plan
    if (planId && promoCode.applicablePlans.length > 0) {
      const isApplicable = promoCode.applicablePlans.some(
        plan => plan._id.toString() === planId
      );
      
      if (!isApplicable) {
        return res.status(400).json({ 
          success: false, 
          message: 'Promo code is not applicable to this plan' 
        });
      }
    }

    // Get plan details to check minimum order value
    if (planId && promoCode.minOrderValue) {
      const plan = await Plan.findById(planId);
      if (plan && plan.price < promoCode.minOrderValue) {
        return res.status(400).json({ 
          success: false, 
          message: `Minimum order value ₹${promoCode.minOrderValue} required for this promo code` 
        });
      }
    }

    // Return valid promo code details
    const discount = promoCode.discountPercent || 0;
    const fixedDiscount = promoCode.discountAmount || 0;
    
    res.json({
      success: true,
      message: 'Promo code applied successfully',
      data: {
        code: promoCode.code,
        description: `${discount > 0 ? discount + '% off' : '₹' + fixedDiscount + ' off'}`,
        discount: discount,
        fixedAmount: fixedDiscount,
        _id: promoCode._id
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error validating promo code', 
      error: error.message 
    });
  }
});

// ===============================
// SEARCH AND FILTERS
// ===============================

// Search toys and plans
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchRegex = { $regex: q, $options: 'i' };

    const [toys, plans] = await Promise.all([
      Toy.find({
        isActive: true,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { brand: searchRegex },
          { category: searchRegex }
        ]
      }).select('-createdBy -updatedBy').limit(10),
      
      Plan.find({
        isActive: true,
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      }).limit(5)
    ]);

    res.json({
      toys,
      plans,
      total: toys.length + plans.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error performing search', error: error.message });
  }
});

module.exports = router;