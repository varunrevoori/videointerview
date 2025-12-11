const express = require('express');
const router = express.Router();
const Toy = require('../models/Toy');
const Plan = require('../models/Plan');
const { InventoryLog, InventoryAlert, InventoryReservation } = require('../models/Inventory');
const User = require('../models/userschema');
const PromoCode = require('../models/Promocode');
const Order = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ===============================
// TOY MANAGEMENT ROUTES
// ===============================

// Get all toys
router.get('/toys', async (req, res) => {
  try {
    const toys = await Toy.find().sort({ createdAt: -1 });
    res.json(toys);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching toys', error: error.message });
  }
});

// Get single toy
router.get('/toys/:id', async (req, res) => {
  try {
    const toy = await Toy.findById(req.params.id);
    if (!toy) {
      return res.status(404).json({ message: 'Toy not found' });
    }
    res.json(toy);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching toy', error: error.message });
  }
});

// Create new toy
router.post('/toys', async (req, res) => {
  try {
    console.log('Received toy data:', req.body);
    console.log('User ID:', req.user?._id);
    
    const {
      name,
      description,
      category,
      subcategory,
      ageRange,
      points,
      images,
      totalQuantity,
      availableQuantity,
      isActive
    } = req.body;

    // Validate required fields
    if (!name || !category || !points) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, category, and points are required',
        received: { name, category, points }
      });
    }

    // Handle quantity fields properly
    const totalQty = totalQuantity ? parseInt(totalQuantity) : 0;
    const availableQty = availableQuantity !== undefined ? parseInt(availableQuantity) : totalQty;
    
    console.log('Quantity processing:', { 
      received: { totalQuantity, availableQuantity }, 
      processed: { totalQty, availableQty } 
    });
    
    const toy = new Toy({
      name,
      title: name, // Set title same as name for backward compatibility
      description,
      category,
      subcategory,
      ageRange,
      points: parseInt(points),
      images: images || [],
      totalQuantity: totalQty,
      availableQuantity: availableQty,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user?._id
    });

    console.log('Creating toy with quantities:', {
      totalQuantity: toy.totalQuantity,
      availableQuantity: toy.availableQuantity
    });
    
    const savedToy = await toy.save();
    console.log('Toy saved successfully:', savedToy._id);
    console.log('Final saved quantities:', {
      totalQuantity: savedToy.totalQuantity,
      availableQuantity: savedToy.availableQuantity
    });
    
    res.status(201).json(savedToy);
  } catch (error) {
    console.error('Error creating toy:', error);
    res.status(400).json({ 
      message: 'Error creating toy', 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : undefined
    });
  }
});

// Update toy
router.put('/toys/:id', async (req, res) => {
  try {
    const toy = await Toy.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    
    if (!toy) {
      return res.status(404).json({ message: 'Toy not found' });
    }
    
    res.json(toy);
  } catch (error) {
    res.status(400).json({ message: 'Error updating toy', error: error.message });
  }
});

// Delete toy
router.delete('/toys/:id', async (req, res) => {
  try {
    const toy = await Toy.findByIdAndDelete(req.params.id);
    if (!toy) {
      return res.status(404).json({ message: 'Toy not found' });
    }
    res.json({ message: 'Toy deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting toy', error: error.message });
  }
});

// ===============================
// PLAN MANAGEMENT ROUTES
// ===============================

// Get all plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching plans', error: error.message });
  }
});

// Create new plan
router.post('/plans', async (req, res) => {
  try {
    console.log('Creating plan with data:', req.body);
    
    const {
      name,
      description,
      price,
      duration,
      points,
      features,
      isPopular,
      isActive
    } = req.body;

    // Validate required fields
    if (!name || !price || !points) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, price, and points are required' 
      });
    }

    const plan = new Plan({
      name,
      description,
      price,
      duration: duration || 'month',
      points,
      features: features || [],
      isPopular: isPopular || false,
      isActive: isActive !== undefined ? isActive : true
    });

    console.log('Plan object before save:', plan);
    
    const savedPlan = await plan.save();
    console.log('Plan saved successfully:', savedPlan._id);
    
    res.status(201).json(savedPlan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(400).json({ 
      message: 'Error creating plan', 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : null
    });
  }
});

// Update plan
router.put('/plans/:id', async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    res.json(plan);
  } catch (error) {
    res.status(400).json({ message: 'Error updating plan', error: error.message });
  }
});

// Delete plan
router.delete('/plans/:id', async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting plan', error: error.message });
  }
});

// ===============================
// ORDER MANAGEMENT ROUTES
// ===============================

// Get all orders with filtering
router.get('/orders', async (req, res) => {
  try {
    const { status, dateRange, search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    
    // Filter by status
    if (status && status !== 'all') {
      query.orderStatus = status;
    }
    
    // Filter by date range
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'yesterday':
          startDate = new Date(now.setDate(now.getDate() - 1));
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }
      
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerDetails.firstName': { $regex: search, $options: 'i' } },
        { 'customerDetails.lastName': { $regex: search, $options: 'i' } },
        { 'customerDetails.email': { $regex: search, $options: 'i' } },
        { 'customerDetails.phone': { $regex: search, $options: 'i' } }
      ];
    }
    
    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .populate('planId', 'name duration price')
      .populate('items.toyId', 'name images category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalOrders = await Order.countDocuments(query);
    
    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get single order details
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('planId', 'name duration price points')
      .populate('items.toyId', 'name images category points')
      .populate('statusHistory.updatedBy', 'name');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Get payment details
    const paymentTransaction = await PaymentTransaction.findOne({ orderId: order._id });
    
    res.json({
      ...order.toObject(),
      paymentTransaction
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const orderId = req.params.id;
    const adminId = req.user._id;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Update order status using the model's method
    await order.updateStatus(status, adminId, notes);
    
    // Populate the updated order
    const updatedOrder = await Order.findById(orderId)
      .populate('userId', 'name email')
      .populate('planId', 'name duration price')
      .populate('items.toyId', 'name images category');
    
    res.json({
      message: `Order status updated to ${status}`,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(400).json({ 
      message: error.message.includes('Invalid status transition') 
        ? error.message 
        : 'Error updating order status',
      error: error.message 
    });
  }
});

// ===============================
// INVENTORY MANAGEMENT ROUTES
// ===============================

// Get all inventory items
router.get('/inventory', async (req, res) => {
  try {
    const inventory = await Inventory.find().populate('toyId', 'name category brand');
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory', error: error.message });
  }
});

// Get inventory for specific toy
router.get('/inventory/toy/:toyId', async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ toyId: req.params.toyId });
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found for this toy' });
    }
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory', error: error.message });
  }
});

// Add/Update inventory
router.post('/inventory', async (req, res) => {
  try {
    const { toyId, totalQuantity, availableQuantity, reservedQuantity, condition } = req.body;

    // Check if inventory already exists for this toy
    let inventory = await Inventory.findOne({ toyId });
    
    if (inventory) {
      // Update existing inventory
      inventory.totalQuantity = totalQuantity;
      inventory.availableQuantity = availableQuantity;
      inventory.reservedQuantity = reservedQuantity || 0;
      inventory.condition = condition;
      await inventory.save();
    } else {
      // Create new inventory
      inventory = new Inventory({
        toyId,
        totalQuantity,
        availableQuantity,
        reservedQuantity: reservedQuantity || 0,
        condition
      });
      await inventory.save();
    }

    await inventory.populate('toyId', 'name category brand');
    res.json(inventory);
  } catch (error) {
    res.status(400).json({ message: 'Error updating inventory', error: error.message });
  }
});

// Update inventory quantity
router.patch('/inventory/:id/quantity', async (req, res) => {
  try {
    const { totalQuantity, availableQuantity, reservedQuantity } = req.body;
    
    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      {
        totalQuantity,
        availableQuantity,
        reservedQuantity,
        lastUpdated: new Date()
      },
      { new: true, runValidators: true }
    ).populate('toyId', 'name category brand');
    
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }
    
    res.json(inventory);
  } catch (error) {
    res.status(400).json({ message: 'Error updating inventory quantity', error: error.message });
  }
});

// ===============================
// USER MANAGEMENT ROUTES
// ===============================

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Update user status
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: 'Error updating user status', error: error.message });
  }
});

// ===============================
// PROMOCODE MANAGEMENT ROUTES
// ===============================

// Get all promocodes
router.get('/promocodes', async (req, res) => {
  try {
    const promocodes = await PromoCode.find().sort({ createdAt: -1 });
    res.json(promocodes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching promocodes', error: error.message });
  }
});

// Get single promocode
router.get('/promocodes/:id', async (req, res) => {
  try {
    const promocode = await PromoCode.findById(req.params.id);
    if (!promocode) {
      return res.status(404).json({ message: 'Promocode not found' });
    }
    res.json(promocode);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching promocode', error: error.message });
  }
});

// Create new promocode
router.post('/promocodes', async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxUses,
      validFrom,
      validTo,
      isActive
    } = req.body;

    // Validate required fields
    if (!code || !discountValue || !discountType) {
      return res.status(400).json({ 
        message: 'Missing required fields: code, discountValue, and discountType are required' 
      });
    }

    // Check if promocode already exists
    const existingPromocode = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existingPromocode) {
      return res.status(400).json({ message: 'Promocode already exists' });
    }

    const promocode = new PromoCode({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxUses,
      validFrom,
      validTo,
      isActive: isActive !== undefined ? isActive : true,
      usedCount: 0
    });

    const savedPromocode = await promocode.save();
    res.status(201).json(savedPromocode);
  } catch (error) {
    console.error('Error creating promocode:', error);
    res.status(400).json({ 
      message: 'Error creating promocode', 
      error: error.message 
    });
  }
});

// Update promocode
router.put('/promocodes/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    const promocode = await PromoCode.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!promocode) {
      return res.status(404).json({ message: 'Promocode not found' });
    }
    
    res.json(promocode);
  } catch (error) {
    res.status(400).json({ message: 'Error updating promocode', error: error.message });
  }
});

// Delete promocode
router.delete('/promocodes/:id', async (req, res) => {
  try {
    const promocode = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promocode) {
      return res.status(404).json({ message: 'Promocode not found' });
    }
    res.json({ message: 'Promocode deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting promocode', error: error.message });
  }
});

// ===============================
// ANALYTICS ROUTES
// ===============================

// Get dashboard analytics
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalToys,
      activeToys,
      totalPlans,
      totalPromocodes,
      activePromocodes,
      totalInventoryItems
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true }),
      Toy.countDocuments(),
      Toy.countDocuments({ isActive: true }),
      Plan.countDocuments({ isActive: true }),
      PromoCode.countDocuments(),
      PromoCode.countDocuments({ isActive: true }),
      Inventory.countDocuments()
    ]);

    // Get category distribution
    const categoryStats = await Toy.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Get inventory status
    const inventoryStats = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: '$totalQuantity' },
          availableItems: { $sum: '$availableQuantity' },
          reservedItems: { $sum: '$reservedQuantity' }
        }
      }
    ]);

    // Get promocode usage stats
    const promocodeStats = await PromoCode.aggregate([
      {
        $group: {
          _id: null,
          totalUsed: { $sum: '$usedCount' },
          averageDiscount: { $avg: '$discountValue' }
        }
      }
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers
      },
      toys: {
        total: totalToys,
        active: activeToys,
        byCategory: categoryStats
      },
      plans: {
        total: totalPlans
      },
      promocodes: {
        total: totalPromocodes,
        active: activePromocodes,
        totalUsed: promocodeStats[0]?.totalUsed || 0,
        averageDiscount: promocodeStats[0]?.averageDiscount || 0
      },
      inventory: {
        totalItems: inventoryStats[0]?.totalItems || 0,
        availableItems: inventoryStats[0]?.availableItems || 0,
        reservedItems: inventoryStats[0]?.reservedItems || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

module.exports = router;