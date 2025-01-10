import mongoose from 'mongoose';
import mongooseSequence from 'mongoose-sequence'; // Import mongoose-sequence

const Connection = async (username, password) => {
  const URL = `mongodb://${username}:${password}@cluster0-shard-00-00.hxfjz.mongodb.net:27017,cluster0-shard-00-01.hxfjz.mongodb.net:27017,cluster0-shard-00-02.hxfjz.mongodb.net:27017/?ssl=true&replicaSet=atlas-5a0t1w-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;

  try {
    // Connect to MongoDB
    await mongoose.connect(URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true, // Ensure indexes are created
      useFindAndModify: false, // Avoid deprecated findAndModify
      authMechanism: 'SCRAM-SHA-1', // Explicitly define the auth mechanism
    });

    // Apply mongoose-sequence plugin to Mongoose instance
    mongoose.plugin(mongooseSequence);

    console.log('Database Connected Successfully');
  } catch (error) {
    console.error('Database Connection Failed:', error.message);
    process.exit(1); // Exit process with failure code
  }
};

export default Connection;
