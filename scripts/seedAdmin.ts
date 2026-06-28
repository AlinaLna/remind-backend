import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import User from '../src/models/user.model';

async function seed(): Promise<void> {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/remind');
  console.log('Connected to MongoDB.');

  const email = 'admin@remind.test';
  const password = 'admin123';
  const fullName = 'Admin User';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Admin already exists:');
    console.log(`  Email: ${email}`);
    console.log(`  ID: ${existing._id}`);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await User.create({
    email,
    password: hashedPassword,
    fullName,
    role: 'admin',
    status: 'active',
  });

  console.log('Admin account created:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  ID:       ${admin._id}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
