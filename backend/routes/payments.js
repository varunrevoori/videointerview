


const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const PaymentTransaction = require('../models/PaymentTransaction');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const { authenticateToken } = require('../middlewares/auth');
const MockPaymentService = require('../services/mockPaymentService');

// Initialize Razorpay instance with error handling
let razorpay = null;
let mockPaymentService = null;

try {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  
  const isValidKey = key_id && key_secret && !key_id.startsWith('rzp_test_');
  if (isValidKey) {
    razorpay = new Razorpay({
      key_id: key_id,
      key_secret: key_secret
    });
    console.log('✅ Razorpay initialized successfully with real keys');
  } else {
    console.log('⚠️ Razorpay keys not configured or using test keys. Using mock payment service for development.');
    console.log('📚 See RAZORPAY_SETUP.md for setup instructions');
    mockPaymentService = new MockPaymentService();
  }
} catch (error) {
  console.error('❌ Error initializing Razorpay:', error.message);
  console.log('🧪 Falling back to mock payment service');
  mockPaymentService = new MockPaymentService();
}

// ===============================
// CREATE PAYMENT ORDER
// ===============================
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { orderId, amount, currency = 'INR', receipt } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and amount are required'
      });
    }

    // Check if order exists and belongs to user
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if payment already exists for this order
    const existingPayment = await PaymentTransaction.findOne({
      orderId,
      status: { $in: ['created', 'pending', 'authorized', 'captured'] }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this order',
        razorpayOrderId: existingPayment.razorpayOrderId
      });
    }

    let orderResponse;
    if (razorpay) {
      // Create Razorpay order
      const razorpayOrderOptions = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: receipt || `order_${orderId}_${Date.now()}`,
        payment_capture: 1,
        notes: {
          orderId: orderId.toString(),
          userId: userId.toString(),
          customerName: req.user.name,
          customerEmail: req.user.email
        }
      };
      orderResponse = await razorpay.orders.create(razorpayOrderOptions);
    } else {
      // Use mock payment service
      orderResponse = await mockPaymentService.createOrder({
        orderId,
        amount,
        currency,
        receipt,
        user: req.user
      });
    }

    // Create payment transaction record
    const paymentTransaction = new PaymentTransaction({
      orderId,
      subscriptionId: order.subscriptionId,
      userId,
      razorpayOrderId: orderResponse.id,
      amount,
      currency,
      status: 'created',
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    await paymentTransaction.save();

    // Update order status to pending payment
    order.orderStatus = 'pending_payment';
    order.paymentStatus = 'pending';
    await order.save();

    res.json({
      success: true,
      data: {
        razorpayOrderId: orderResponse.id,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        key: process.env.RAZORPAY_KEY_ID,
        orderId: orderId,
        transactionId: paymentTransaction._id
      }
    });

  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ===============================
// VERIFY PAYMENT
// ===============================
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification data'
      });
    }

    // Find payment transaction
    const paymentTransaction = await PaymentTransaction.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.user._id
    });

    if (!paymentTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment transaction not found'
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      // Update payment as failed
      paymentTransaction.status = 'failed';
      paymentTransaction.failureReason = 'Invalid signature';
      await paymentTransaction.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Get payment details from Razorpay or mock
    let paymentDetails;
    if (razorpay) {
      paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
    } else {
      paymentDetails = await mockPaymentService.fetchPayment(razorpay_payment_id);
    }

    // Update payment transaction
    paymentTransaction.razorpayPaymentId = razorpay_payment_id;
    paymentTransaction.razorpaySignature = razorpay_signature;
    paymentTransaction.status = paymentDetails.status === 'captured' ? 'captured' : 'authorized';
    paymentTransaction.paymentMethod = paymentDetails.method;
    paymentTransaction.paymentMethodDetails = {
      type: paymentDetails.method,
      cardType: paymentDetails.card?.type || null,
      bank: paymentDetails.bank || null,
      wallet: paymentDetails.wallet || null,
      vpa: paymentDetails.vpa || null
    };

    if (paymentDetails.status === 'captured') {
      paymentTransaction.paidAt = new Date(paymentDetails.created_at * 1000);
      paymentTransaction.capturedAt = new Date();
    }

    await paymentTransaction.save();

    // Update order status
    const order = await Order.findById(paymentTransaction.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      order.orderStatus = 'confirmed';
      order.paidAt = new Date();
      
      // Add to status history
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: 'confirmed',
        timestamp: new Date(),
        notes: 'Payment verified and captured'
      });

      await order.save();

      // Reserve inventory for confirmed order
      await reserveInventoryForOrder(order);
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: razorpay_payment_id,
        orderId: order._id,
        status: paymentTransaction.status,
        amount: paymentTransaction.amount
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ===============================
// RAZORPAY WEBHOOK
// ===============================
router.post('/webhook', async (req, res) => {
  try {
    const webhookSignature = req.get('X-Razorpay-Signature');
    const webhookBody = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;
      
      case 'order.paid':
        await handleOrderPaid(payload.order.entity, payload.payment.entity);
        break;
      
      case 'refund.processed':
        await handleRefundProcessed(payload.refund.entity);
        break;
      
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ===============================
// GET PAYMENT HISTORY
// ===============================
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user._id;

    const payments = await PaymentTransaction.getUserPaymentHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    const total = await PaymentTransaction.countDocuments({
      userId,
      ...(status && { status })
    });

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history'
    });
  }
});

// ===============================
// PROCESS REFUND
// ===============================
router.post('/refund', authenticateToken, async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;
    const userId = req.user._id;

    // Find payment transaction
    const paymentTransaction = await PaymentTransaction.findOne({
      _id: paymentId,
      userId,
      status: 'captured'
    });

    if (!paymentTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or cannot be refunded'
      });
    }

    const refundableAmount = paymentTransaction.getRefundableAmount();
    const refundAmount = amount || refundableAmount;

    if (refundAmount > refundableAmount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount exceeds refundable amount'
      });
    }

    // Create refund with Razorpay or mock
    let refund;
    if (razorpay) {
      refund = await razorpay.payments.refund(paymentTransaction.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100), // Convert to paise
        notes: {
          reason,
          orderId: paymentTransaction.orderId.toString()
        }
      });
    } else {
      refund = await mockPaymentService.refundPayment(paymentTransaction.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100),
        reason,
        orderId: paymentTransaction.orderId.toString()
      });
    }

    // Update payment transaction
    paymentTransaction.refundDetails = {
      refundAmount: (paymentTransaction.refundDetails.refundAmount || 0) + refundAmount,
      refundId: refund.id,
      refundReason: reason,
      refundedAt: new Date(),
      refundedBy: userId
    };

    if (paymentTransaction.refundDetails.refundAmount >= paymentTransaction.amount) {
      paymentTransaction.status = 'refunded';
    }

    await paymentTransaction.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refund.id,
        refundAmount,
        status: refund.status
      }
    });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing refund'
    });
  }
});

// ===============================
// HELPER FUNCTIONS
// ===============================

// Reserve inventory when order is confirmed
async function reserveInventoryForOrder(order) {
  try {
    const Toy = require('../models/Toy');
    
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        await Toy.findByIdAndUpdate(item.toyId, {
          $inc: { 
            availableQuantity: -item.quantity,
            reservedQuantity: item.quantity 
          }
        });
      }
    }
  } catch (error) {
    console.error('Error reserving inventory:', error);
  }
}

// Webhook event handlers
async function handlePaymentCaptured(payment) {
  try {
    const paymentTransaction = await PaymentTransaction.findOne({
      razorpayPaymentId: payment.id
    });

    if (paymentTransaction && paymentTransaction.status !== 'captured') {
      paymentTransaction.status = 'captured';
      paymentTransaction.capturedAt = new Date();
      paymentTransaction.webhookData = payment;
      await paymentTransaction.save();

      // Update order status
      const order = await Order.findById(paymentTransaction.orderId);
      if (order && order.orderStatus === 'pending_payment') {
        order.orderStatus = 'confirmed';
        order.paymentStatus = 'paid';
        await order.save();
        await reserveInventoryForOrder(order);
      }
    }
  } catch (error) {
    console.error('Handle payment captured error:', error);
  }
}

async function handlePaymentFailed(payment) {
  try {
    const paymentTransaction = await PaymentTransaction.findOne({
      razorpayOrderId: payment.order_id
    });

    if (paymentTransaction) {
      paymentTransaction.status = 'failed';
      paymentTransaction.failureReason = payment.error_description || 'Payment failed';
      paymentTransaction.webhookData = payment;
      await paymentTransaction.save();

      // Update order status
      const order = await Order.findById(paymentTransaction.orderId);
      if (order) {
        order.orderStatus = 'payment_failed';
        order.paymentStatus = 'failed';
        await order.save();
      }
    }
  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
}

async function handleOrderPaid(order, payment) {
  // This is called when an order is completely paid
  await handlePaymentCaptured(payment);
}

async function handleRefundProcessed(refund) {
  try {
    const paymentTransaction = await PaymentTransaction.findOne({
      razorpayPaymentId: refund.payment_id
    });

    if (paymentTransaction) {
      paymentTransaction.refundDetails = {
        ...paymentTransaction.refundDetails,
        refundId: refund.id,
        refundedAt: new Date()
      };

      if (refund.amount >= paymentTransaction.amount * 100) { // Razorpay amount in paise
        paymentTransaction.status = 'refunded';
      }

      await paymentTransaction.save();
    }
  } catch (error) {
    console.error('Handle refund processed error:', error);
  }
}

module.exports = router;