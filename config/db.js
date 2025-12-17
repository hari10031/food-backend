import mongoose from "mongoose";

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined in the environment variables");
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully");

        // Ensure geospatial index exists for delivery boy location queries
        try {
            const usersCollection = mongoose.connection.collection('users');
            await usersCollection.createIndex({ location: '2dsphere' }, { background: true });
            console.log("2dsphere index ensured on users.location");
        } catch (indexError) {
            // Index already exists (error code 85) or other minor issues - ignore
            if (indexError.code !== 85) {
                console.log("Index note:", indexError.message);
            }
        }

    } catch (error) {
        console.error("MongoDB connection error:", error.message);

        if (error.name === 'MongooseServerSelectionError') {
            console.error("\n❌ ERROR: Could not connect to MongoDB. This is widely caused by your IP address not being whitelisted on MongoDB Atlas.");
            console.error("👉 ACTION REQUIRED: Go to https://cloud.mongodb.com -> Security -> Network Access and add your current IP address (or allow 0.0.0.0/0 for testing).\n");
        }

        process.exit(1);
    }
}

export default connectDB;