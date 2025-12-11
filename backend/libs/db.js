const mongoose = require('mongoose');

const connectDb = async () => {
    try {
        const connect = await mongoose.connect(process.env.DB_URL);
        console.log('✅ Connected to MongoDB:', connect.connection.host);
        console.log('📊 Database:', connect.connection.name);
    } catch (err) {
        console.error("❌ Error while connecting to database:", err.message);
        
        if (err.message.includes('ECONNREFUSED')) {
            console.log('\n💡 MongoDB is not running. Please start MongoDB:');
            console.log('1. Install MongoDB if not installed');
            console.log('2. Start MongoDB service: net start MongoDB (run as administrator)');
            console.log('3. Or start MongoDB manually: mongod');
        }
        
        process.exit(1);
    }
}

module.exports = { connectDb }