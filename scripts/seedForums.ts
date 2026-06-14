import mongoose from 'mongoose';
import 'dotenv/config';
import Forum from '../src/models/forum.model';
import ForumPost from '../src/models/forumPost.model';
import ForumComment from '../src/models/forumComment.model';

async function seed(): Promise<void> {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/remind');
    console.log('Connected to MongoDB. Clearing old forum data...');

    await Forum.deleteMany({});
    await ForumPost.deleteMany({});
    await ForumComment.deleteMany({});

    const adminId = new mongoose.Types.ObjectId();
    const userId1 = new mongoose.Types.ObjectId();
    const userId2 = new mongoose.Types.ObjectId();

    console.log('Seeding forums...');
    const generalForum = await Forum.create({
      title: 'General Support',
      description: 'A safe space to discuss general mental health topics.',
      category: 'General',
      createdByAdminId: adminId,
      isActive: true
    });

    const anxietyForum = await Forum.create({
      title: 'Managing Anxiety',
      description: 'Tips, tools, and support for dealing with anxiety.',
      category: 'Anxiety',
      createdByAdminId: adminId,
      isActive: true
    });

    const inactiveForum = await Forum.create({
      title: 'Old Archived Forum',
      description: 'This should not appear in guest searches.',
      category: 'Archived',
      createdByAdminId: adminId,
      isActive: false
    });

    console.log('Seeding posts...');
    const post1 = await ForumPost.create({
      forumId: generalForum._id,
      authorId: userId1,
      authorDisplayMode: 1,
      publicAuthorName: 'Anonymous Student',
      title: 'How do you handle exam stress?',
      content: 'Exams are coming up and I am feeling overwhelmed. What are your tips?',
      tags: ['stress', 'exams', 'school'],
      status: 'active',
      likeCount: 5,
      commentCount: 2
    });

    const post2 = await ForumPost.create({
      forumId: anxietyForum._id,
      authorId: userId2,
      authorDisplayMode: 0,
      publicAuthorName: 'Dr. Sarah (Expert)',
      title: 'Grounding techniques for panic attacks',
      content: 'The 5-4-3-2-1 technique is a great way to ground yourself. Look for 5 things you can see, 4 you can touch...',
      tags: ['anxiety', 'grounding', 'tips'],
      status: 'active',
      likeCount: 12,
      commentCount: 1
    });

    const hiddenPost = await ForumPost.create({
      forumId: generalForum._id,
      authorId: userId1,
      authorDisplayMode: 1,
      publicAuthorName: 'Rule Breaker',
      title: 'Inappropriate content',
      content: 'This post violates rules and should be hidden.',
      tags: ['bad'],
      status: 'hidden',
      likeCount: 0,
      commentCount: 0
    });

    console.log('Seeding comments...');
    await ForumComment.create({
      postId: post1._id,
      authorId: userId2,
      authorDisplayMode: 1,
      publicAuthorName: 'Another Student',
      content: 'I usually take a 10 minute walk outside when I feel overwhelmed.',
      status: 'active',
      likeCount: 2
    });

    await ForumComment.create({
      postId: post1._id,
      authorId: userId1,
      authorDisplayMode: 0,
      publicAuthorName: 'John Doe',
      content: 'Pomodoro technique helps me a lot!',
      status: 'active',
      likeCount: 4
    });

    await ForumComment.create({
      postId: post1._id,
      authorId: userId2,
      authorDisplayMode: 1,
      publicAuthorName: 'Angry User',
      content: 'This comment is removed by admin.',
      status: 'deleted',
      likeCount: 0
    });

    console.log('Seeding complete!');
    console.log('\n--- Test Data IDs for Postman ---');
    console.log(`General Forum ID: ${generalForum._id}`);
    console.log(`Anxiety Forum ID: ${anxietyForum._id}`);
    console.log(`Post 1 ID (Exam stress): ${post1._id}`);
    console.log(`Post 2 ID (Grounding): ${post2._id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
