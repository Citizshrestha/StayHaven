import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await mongoose.connection.db.collection('users').updateOne(
    { email: 'citizshrestha17@gmail.com' },
    { $set: { companyRole: 'kitchen' } }
  );
  console.log('Updated:', result.modifiedCount);
  mongoose.disconnect();
}).catch(e => console.error(e));
