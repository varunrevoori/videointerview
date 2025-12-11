const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userschema');
const Order = require('../models/Order');
const { authenticateToken: auth } = require('../middlewares/auth');
const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  });
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone format (Indian phone numbers)
const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, pincode } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !password || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate phone format
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      pincode
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          pincode: user.pincode,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/signin
// @desc    Login user with email or phone
// @access  Public
router.post('/signin', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or phone

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone and password'
      });
    }

    // Determine if identifier is email or phone
    let query = {};
    if (isValidEmail(identifier)) {
      query = { email: identifier.toLowerCase() };
    } else if (isValidPhone(identifier)) {
      query = { phone: identifier };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email or phone number'
      });
    }

    // Find user
    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          pincode: user.pincode,
          role: user.role,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    // Extract token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password -emailVerificationToken -resetPasswordToken');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Extract token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
});

// @route   POST /api/auth/orders
// @desc    Create new order
// @access  Private
router.post('/orders', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const orderData = req.body;

    // Validate required fields
    if (!orderData.plan) {
      return res.status(400).json({
        success: false,
        message: 'Plan is required for order creation'
      });
    }

    // Create new order
    const order = new Order({
      user: userId,
      plan: orderData.plan._id || orderData.plan,
      ageGroup: orderData.ageGroup,
      orderItems: orderData.orderItems,
      customerDetails: orderData.customerDetails,
      deliveryAddress: orderData.deliveryAddress,
      deliveryInstructions: orderData.deliveryInstructions,
      preferredTimeSlot: orderData.preferredTimeSlot,
      pricing: orderData.pricing,
      promoCode: orderData.promoCode?._id || orderData.promoCode,
      paymentMethod: orderData.customerDetails?.paymentMethod || 'razorpay',
      paymentStatus: 'completed', // Mock payment success
      paymentDate: new Date(),
      subscriptionStartDate: new Date(),
      createdBy: userId
    });

    await order.save();

    // Populate order details for response
    const populatedOrder = await Order.findById(order._id)
      .populate('plan')
      .populate('orderItems.toyId')
      .populate('promoCode');

    res.json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderNumber: order.orderNumber,
        _id: order._id,
        plan: populatedOrder.plan,
        toys: orderData.toys, // Pass original toy data
        pricing: order.pricing,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus
      }
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: error.message
    });
  }
});

// @route   GET /api/auth/orders
// @desc    Get user orders
// @access  Private
router.get('/orders', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const orders = await Order.find({ user: userId })
      .populate('plan')
      .populate('orderItems.toyId')
      .populate('promoCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
});

// @route   GET /api/auth/orders/:id
// @desc    Get single order details
// @access  Private
router.get('/orders/:id', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const orderId = req.params.id;
    
    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate('plan')
      .populate('orderItems.toyId')
      .populate('promoCode');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order'
    });
  }
});

// @route   PUT /api/auth/subscription/:id/toys
// @desc    Update subscription toy selection
// @access  Private
router.put('/subscription/:id/toys', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const subscriptionId = req.params.id;
    const { toyIds } = req.body;

    // Find the subscription
    const subscription = await Order.findOne({ 
      _id: subscriptionId, 
      user: userId 
    }).populate('plan');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Validate toy selection (check if toys exist and calculate points)
    const Toy = require('../models/Toy');
    const selectedToys = await Toy.find({ _id: { $in: toyIds } });
    
    if (selectedToys.length !== toyIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some toys not found'
      });
    }

    const totalPoints = selectedToys.reduce((sum, toy) => sum + (toy.points || 1), 0);
    const maxPoints = subscription.plan?.points || 10;

    if (totalPoints > maxPoints) {
      return res.status(400).json({
        success: false,
        message: `Selected toys exceed plan limit (${totalPoints}/${maxPoints} points)`
      });
    }

    // Update the subscription with new toys
    const orderItems = selectedToys.map(toy => ({
      toyId: toy._id,
      name: toy.name,
      points: toy.points || 1
    }));

    subscription.orderItems = orderItems;
    subscription.updatedAt = new Date();
    
    await subscription.save();

    res.json({
      success: true,
      message: 'Toys updated successfully',
      data: subscription
    });

  } catch (error) {
    console.error('Update toys error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating toys'
    });
  }
});

// @route   PUT /api/auth/subscription/:id/upgrade
// @desc    Upgrade subscription plan
// @access  Private
router.put('/subscription/:id/upgrade', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const subscriptionId = req.params.id;
    const { newPlanId } = req.body;

    const subscription = await Order.findOne({ 
      _id: subscriptionId, 
      user: userId 
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    const Plan = require('../models/Plan');
    const newPlan = await Plan.findById(newPlanId);

    if (!newPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Update subscription with new plan
    subscription.plan = newPlanId;
    subscription.pricing.baseAmount = newPlan.price;
    subscription.pricing.totalAmount = newPlan.price;
    subscription.updatedAt = new Date();
    
    await subscription.save();

    res.json({
      success: true,
      message: 'Plan upgraded successfully',
      data: subscription
    });

  } catch (error) {
    console.error('Upgrade plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while upgrading plan'
    });
  }
});

// @route   PUT /api/auth/subscription/:id/pause
// @desc    Pause subscription
// @access  Private
router.put('/subscription/:id/pause', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const subscriptionId = req.params.id;

    const subscription = await Order.findOne({ 
      _id: subscriptionId, 
      user: userId 
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    subscription.orderStatus = 'paused';
    subscription.updatedAt = new Date();
    
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription paused successfully',
      data: subscription
    });

  } catch (error) {
    console.error('Pause subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while pausing subscription'
    });
  }
});

// @route   PUT /api/auth/subscription/:id/cancel
// @desc    Cancel subscription
// @access  Private
router.put('/subscription/:id/cancel', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const subscriptionId = req.params.id;

    const subscription = await Order.findOne({ 
      _id: subscriptionId, 
      user: userId 
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    subscription.orderStatus = 'cancelled';
    subscription.updatedAt = new Date();
    
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling subscription'
    });
  }
});

// @route   PUT /api/auth/subscription/:id/renew
// @desc    Renew subscription
// @access  Private
router.put('/subscription/:id/renew', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const subscriptionId = req.params.id;

    const subscription = await Order.findOne({ 
      _id: subscriptionId, 
      user: userId 
    }).populate('plan');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Extend subscription end date based on plan duration
    const currentEndDate = new Date(subscription.subscriptionEndDate);
    let newEndDate = new Date(currentEndDate);
    
    if (subscription.plan?.duration === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else if (subscription.plan?.duration === 'quarterly') {
      newEndDate.setMonth(newEndDate.getMonth() + 3);
    } else if (subscription.plan?.duration === 'yearly') {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    subscription.subscriptionEndDate = newEndDate;
    subscription.orderStatus = 'active';
    subscription.updatedAt = new Date();
    
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      data: subscription
    });

  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while renewing subscription'
    });
  }
});

module.exports = router;