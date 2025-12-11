const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/userschema');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function createAdmin() {
  try {
    // Connect to MongoDB (modern mongoose doesn't need deprecated options)
    await mongoose.connect(process.env.DB_URL || 'mongodb://localhost:27017/gayatrifashions');
    
    console.log('Connected to MongoDB...');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: 'varunrevoori18@gmail.com' },
        { phone: '9876543210' } // You can set a phone number for admin
      ]
    });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', {
        name: `${existingAdmin.firstName} ${existingAdmin.lastName}`,
        email: existingAdmin.email,
        role: existingAdmin.role
      });
      return;
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('Tharunsai@18', saltRounds);
    
    // Create admin user
    const adminUser = new User({
      firstName: 'Tharun',
      lastName: 'Sai',
      email: 'varunrevoori18@gmail.com',
      phone: '9876543210', // Adding a phone number for the admin
      password: hashedPassword,
      pincode: '505001',
      role: 'admin',
      isEmailVerified: true,
      isActive: true
    });
    
    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('Admin Details:');
    console.log('- Name: Tharun Sai');
    console.log('- Email: varunrevoori18@gmail.com');
    console.log('- Phone: 9876543210');
    console.log('- Password: Tharunsai@18');
    console.log('- Pincode: 505001');
    console.log('- Role: admin');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

// Run the function
createAdmin();