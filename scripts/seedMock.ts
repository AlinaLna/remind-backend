import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import User from '../src/models/user.model';
import Forum from '../src/models/forum.model';
import ForumPost from '../src/models/forumPost.model';
import ForumComment from '../src/models/forumComment.model';
import Report from '../src/models/report.model';

async function seed(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/remind';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB. Clearing old data...');

  await Promise.all([
    User.deleteMany({}),
    Forum.deleteMany({}),
    ForumPost.deleteMany({}),
    ForumComment.deleteMany({}),
    Report.deleteMany({}),
  ]);

  const hash = await bcrypt.hash('test123', 12);
  const hashAdmin = await bcrypt.hash('admin123', 12);

  console.log('Creating users...');
  const admin = await User.create({
    email: 'admin@remind.test', password: hashAdmin,
    fullName: 'Admin User', role: 'admin', status: 'active',
  });

  const expert1 = await User.create({
    email: 'expert1@test.com', password: hash,
    fullName: 'Dr. Sarah Chen', role: 'expert', status: 'active',
    expert: {
      profile: { professionalTitle: 'Clinical Psychologist', bio: 'Specializing in anxiety and depression for over 10 years.', specialties: ['anxiety', 'depression', 'cbt'], languages: ['English', 'Mandarin'] },
      license: { licenseNumber: 'LIC-2024-001', issuedBy: 'State Board of Psychology', verificationStatus: 'verified' },
    },
  });

  const expert2 = await User.create({
    email: 'expert2@test.com', password: hash,
    fullName: 'Dr. James Wilson', role: 'expert', status: 'active',
    expert: {
      profile: { professionalTitle: 'Counseling Psychologist', bio: 'Helping students navigate academic and personal challenges.', specialties: ['stress', 'relationships', 'academic'], languages: ['English'] },
      license: { licenseNumber: 'LIC-2024-002', issuedBy: 'State Board of Psychology', verificationStatus: 'verified' },
    },
  });

  const pendingExpert = await User.create({
    email: 'expert-pending@test.com', password: hash,
    fullName: 'Dr. Lisa Park', role: 'expert', status: 'pending',
    expert: {
      profile: { professionalTitle: 'Therapist', bio: 'New to the platform.', specialties: ['general'], languages: ['English', 'Korean'] },
    },
  });

  const rejectedExpert = await User.create({
    email: 'expert-rejected@test.com', password: hash,
    fullName: 'Dr. Mark Johnson', role: 'expert', status: 'rejected',
    expert: {
      profile: { professionalTitle: 'Life Coach', bio: 'Credentials pending review.', specialties: ['coaching'], languages: ['English'] },
      approval: { rejectionReason: 'Insufficient credentials for clinical practice.' },
    },
  });

  const student1 = await User.create({
    email: 'student1@test.com', password: hash,
    fullName: 'Alice Nguyen', role: 'student', status: 'active',
  });

  const student2 = await User.create({
    email: 'student2@test.com', password: hash,
    fullName: 'Bob Smith', role: 'student', status: 'active',
  });

  const bannedUser = await User.create({
    email: 'banned@test.com', password: hash,
    fullName: 'Bad Actor', role: 'student', status: 'banned',
  });

  console.log('Creating forums...');
  const generalForum = await Forum.create({
    title: 'General Support', description: 'A safe space to discuss general mental health topics.',
    category: 'General', createdByAdminId: admin._id, isActive: true,
  });
  const anxietyForum = await Forum.create({
    title: 'Managing Anxiety', description: 'Tips, tools, and support for dealing with anxiety.',
    category: 'Anxiety', createdByAdminId: admin._id, isActive: true,
  });
  const depressionForum = await Forum.create({
    title: 'Depression & Mood', description: 'Share experiences and coping strategies for depression.',
    category: 'Depression', createdByAdminId: admin._id, isActive: true,
  });
  const relationshipsForum = await Forum.create({
    title: 'Relationships', description: 'Discuss relationship challenges and healthy communication.',
    category: 'Relationships', createdByAdminId: admin._id, isActive: true,
  });
  const inactiveForum = await Forum.create({
    title: 'Old Archived Forum', description: 'Archived forum - should not appear.',
    category: 'Archived', createdByAdminId: admin._id, isActive: false,
  });

  console.log('Creating posts...');
  const post1 = await ForumPost.create({
    forumId: generalForum._id, authorId: student1._id,
    authorDisplayMode: 1, publicAuthorName: 'Anonymous',
    title: 'How do you handle exam stress?',
    content: 'Exams are coming up and I am feeling completely overwhelmed. I can barely sleep. What helps you?',
    tags: ['stress', 'exams', 'school'], status: 'active', likeCount: 5, commentCount: 3,
  });
  const post2 = await ForumPost.create({
    forumId: anxietyForum._id, authorId: expert1._id,
    authorDisplayMode: 0, publicAuthorName: 'Dr. Sarah Chen',
    title: 'Grounding techniques for panic attacks',
    content: 'The 5-4-3-2-1 technique: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
    tags: ['anxiety', 'grounding', 'panic'], status: 'active', likeCount: 12, commentCount: 2,
  });
  const post3 = await ForumPost.create({
    forumId: depressionForum._id, authorId: student2._id,
    authorDisplayMode: 1, publicAuthorName: 'Hopeful',
    title: 'Small wins this week',
    content: 'I managed to get out of bed before noon every day this week. Celebrating the small victories.',
    tags: ['depression', 'progress'], status: 'active', likeCount: 8, commentCount: 1,
  });
  const post4 = await ForumPost.create({
    forumId: relationshipsForum._id, authorId: expert2._id,
    authorDisplayMode: 0, publicAuthorName: 'Dr. James Wilson',
    title: 'Setting healthy boundaries',
    content: 'Boundaries are essential for mental health. Start small: say no to one thing this week.',
    tags: ['boundaries', 'relationships'], status: 'active', likeCount: 15, commentCount: 2,
  });
  const hiddenPost = await ForumPost.create({
    forumId: generalForum._id, authorId: student1._id,
    authorDisplayMode: 1, publicAuthorName: 'Anonymous',
    title: 'Inappropriate content', content: 'This violates guidelines.',
    tags: ['bad'], status: 'hidden', likeCount: 0, commentCount: 0,
  });
  const postUnderReview = await ForumPost.create({
    forumId: generalForum._id, authorId: student2._id,
    authorDisplayMode: 0, publicAuthorName: 'Bob Smith',
    title: 'Flagged post for review',
    content: 'This post triggered auto-moderation for review.',
    tags: ['testing'], status: 'under_review', likeCount: 0, commentCount: 0,
  });

  console.log('Creating comments...');
  await ForumComment.create({ postId: post1._id, authorId: expert1._id, authorDisplayMode: 0, publicAuthorName: 'Dr. Sarah Chen', content: 'Try the Pomodoro technique: 25 min focus, 5 min break. It reduces overwhelm.', status: 'active', likeCount: 3 });
  await ForumComment.create({ postId: post1._id, authorId: student2._id, authorDisplayMode: 1, publicAuthorName: 'Fellow Student', content: 'Going for a 10-min walk between study sessions helps clear my mind.', status: 'active', likeCount: 2 });
  await ForumComment.create({ postId: post1._id, authorId: student1._id, authorDisplayMode: 1, publicAuthorName: 'Anonymous', content: 'Thanks both, I will try these!', status: 'active', likeCount: 0 });
  await ForumComment.create({ postId: post2._id, authorId: student1._id, authorDisplayMode: 1, publicAuthorName: 'Anonymous', content: 'This really helped me during a panic attack yesterday. Thank you Dr. Chen!', status: 'active', likeCount: 5 });
  await ForumComment.create({ postId: post2._id, authorId: expert2._id, authorDisplayMode: 0, publicAuthorName: 'Dr. James Wilson', content: 'Great technique. I also recommend paired muscle relaxation as a follow-up.', status: 'active', likeCount: 4 });
  await ForumComment.create({ postId: post3._id, authorId: expert1._id, authorDisplayMode: 0, publicAuthorName: 'Dr. Sarah Chen', content: 'That is wonderful progress! Celebrate every step forward.', status: 'active', likeCount: 6 });
  await ForumComment.create({ postId: post4._id, authorId: student1._id, authorDisplayMode: 1, publicAuthorName: 'Anonymous', content: 'I said no to extra work today. It felt uncomfortable but liberating.', status: 'active', likeCount: 3 });
  await ForumComment.create({ postId: post4._id, authorId: student2._id, authorDisplayMode: 1, publicAuthorName: 'Hopeful', content: 'How do you set boundaries without feeling guilty?', status: 'active', likeCount: 1 });
  const deletedComment = await ForumComment.create({ postId: post1._id, authorId: student2._id, authorDisplayMode: 1, publicAuthorName: 'Angry User', content: 'This was removed.', status: 'deleted', likeCount: 0 });

  console.log('Creating reports...');
  await Report.create({ reporterId: student1._id, targetType: 'post', targetId: hiddenPost._id, reason: 'Inappropriate content', description: 'This post violates community guidelines.', status: 'open' });
  await Report.create({ reporterId: expert1._id, targetType: 'comment', targetId: deletedComment._id, reason: 'Harassment', description: 'User made offensive remarks.', status: 'resolved', resolvedBy: admin._id, resolvedAt: new Date(), resolutionAction: 'Comment deleted.' });
  await Report.create({ reporterId: admin._id, targetType: 'user', targetId: bannedUser._id, reason: 'Terms violation', description: 'Repeated violations after warnings.', status: 'reviewing' });

  console.log('\n=== SEED COMPLETE ===\n');
  console.log('--- Login Credentials ---');
  console.log('Admin:        admin@remind.test / admin123');
  console.log('Expert 1:     expert1@test.com / test123');
  console.log('Expert 2:     expert2@test.com / test123');
  console.log('Student 1:    student1@test.com / test123');
  console.log('Student 2:    student2@test.com / test123');
  console.log('Pending Exp:  expert-pending@test.com / test123');
  console.log('Rejected Exp: expert-rejected@test.com / test123');
  console.log('Banned:       banned@test.com / test123');

  console.log('\n--- ObjectIds for Postman ---');
  console.log(`Admin:        ${admin._id}`);
  console.log(`Expert 1:     ${expert1._id}`);
  console.log(`Expert 2:     ${expert2._id}`);
  console.log(`Student 1:    ${student1._id}`);
  console.log(`Student 2:    ${student2._id}`);
  console.log(`Gen Forum:    ${generalForum._id}`);
  console.log(`Anxiety Forum: ${anxietyForum._id}`);
  console.log(`Depression F: ${depressionForum._id}`);
  console.log(`Relations F:  ${relationshipsForum._id}`);
  console.log(`Post 1:       ${post1._id}`);
  console.log(`Post 2:       ${post2._id}`);
  console.log(`Post 3:       ${post3._id}`);
  console.log(`Post 4:       ${post4._id}`);
  console.log(`Hidden Post:  ${hiddenPost._id}`);
  console.log(`Review Post:  ${postUnderReview._id}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
