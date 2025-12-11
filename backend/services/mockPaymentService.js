// Development Payment Service - Mock Implementation
// This service provides payment functionality for development when Razorpay keys are not available

const crypto = require('crypto');

class MockPaymentService {
  constructor() {
    this.isTestMode = true;
    console.log('🧪 Mock Payment Service initialized for development');
  }

  // Create a mock Razorpay order
  async createOrder(options) {
    const mockOrder = {
      id: `order_${crypto.randomBytes(10).toString('hex')}`,
      entity: 'order',
      amount: options.amount,
      amount_paid: 0,
      amount_due: options.amount,
      currency: options.currency || 'INR',
      receipt: options.receipt || null,
      offer_id: null,
      status: 'created',
      attempts: 0,
      notes: options.notes || {},
      created_at: Math.floor(Date.now() / 1000)
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('📝 Mock order created:', mockOrder.id);
    return mockOrder;
  }

  // Verify mock payment signature
  verifyPaymentSignature(body) {
    // In development, always return true for testing
    console.log('✅ Mock payment verification (always passes in development)');
    return true;
  }

  // Create mock refund
  async createRefund(paymentId, options) {
    const mockRefund = {
      id: `rfnd_${crypto.randomBytes(10).toString('hex')}`,
      entity: 'refund',
      amount: options.amount,
      currency: 'INR',
      payment_id: paymentId,
      receipt: options.receipt || null,
      status: 'processed',
      created_at: Math.floor(Date.now() / 1000),
      batch_id: null,
      speed_processed: 'normal',
      speed_requested: 'normal'
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('💰 Mock refund created:', mockRefund.id);
    return mockRefund;
  }

  // Get mock payment details
  async getPayment(paymentId) {
    const mockPayment = {
      id: paymentId,
      entity: 'payment',
      amount: 50000, // ₹500
      currency: 'INR',
      status: 'captured',
      order_id: `order_${crypto.randomBytes(8).toString('hex')}`,
      invoice_id: null,
      international: false,
      method: 'card',
      amount_refunded: 0,
      refund_status: null,
      captured: true,
      description: 'Test payment',
      card_id: `card_${crypto.randomBytes(8).toString('hex')}`,
      bank: null,
      wallet: null,
      vpa: null,
      email: 'customer@example.com',
      contact: '+919999999999',
      created_at: Math.floor(Date.now() / 1000)
    };

    console.log('🔍 Mock payment retrieved:', paymentId);
    return mockPayment;
  }

  // Mock webhook signature verification
  validateWebhookSignature(body, signature, secret) {
    console.log('🔐 Mock webhook signature validation (always passes in development)');
    return true;
  }
}

module.exports = MockPaymentService;