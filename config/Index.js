import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB');

    try {
        // Create 2dsphere index on users collection
        const result = await mongoose.connection.db.collection('users').createIndex(
            { location: '2dsphere' },
            { background: true }
        );
        console.log('Index created:', result);
    } catch (err) {
        if (err.code === 85) {
            console.log('Index already exists');
        } else {
            console.error('Error creating index:', err);
        }
    }

    // List all indexes
    const indexes = await mongoose.connection.db.collection('users').indexes();
    console.log('All indexes on users collection:');
    indexes.forEach(idx => console.log(' -', idx.name, idx.key));

    process.exit(0);
}).catch(err => {
    console.error('Connection Error:', err);
    process.exit(1);
});
