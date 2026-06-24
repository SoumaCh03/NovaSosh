import { registerUser } from './modules/auth/auth.service';
import { prisma } from './shared/lib/prisma';

async function seed() {
  const testEmail = 'saumyatest@testmail.com';
  const testUsername = 'saumyatest';
  const testPassword = 'B@cd#1234$';

  const janeEmail = 'jane@example.com';
  const janeUsername = 'janedoe';
  const janePassword = 'JanePassword123!';

  try {
    console.log('Seeding database...');

    // 1. Ensure saumyatest exists
    let testUser = await prisma.user.findFirst({
      where: { email: testEmail },
      include: { profile: true },
    });

    if (!testUser) {
      const reg = await registerUser({
        email: testEmail,
        username: testUsername,
        password: testPassword,
      });
      testUser = await prisma.user.update({
        where: { id: reg.userId },
        data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
        include: { profile: true },
      });
      console.log('SUCCESS: Demo user saumyatest created!');
    } else {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
      });
    }

    // 2. Ensure janedoe exists
    let janeUser = await prisma.user.findFirst({
      where: { email: janeEmail },
      include: { profile: true },
    });

    if (!janeUser) {
      const reg = await registerUser({
        email: janeEmail,
        username: janeUsername,
        password: janePassword,
      });
      janeUser = await prisma.user.update({
        where: { id: reg.userId },
        data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
        include: { profile: true },
      });
      console.log('SUCCESS: Seed user janedoe created!');
    }

    // 3. Seed sample posts
    const postCount = await prisma.post.count();
    if (postCount < 3) {
      console.log('Inserting seed feed posts...');

      // Post 1: Jane Doe welcome post
      await prisma.post.create({
        data: {
          authorId: janeUser!.id,
          type: 'TEXT',
          caption: 'Just initialized the NOVA social media MVP project! Setting up clean modular monolith architectures feels very rewarding. Moving fast, building safely. 🚀',
          likeCount: 15,
          commentCount: 2,
        },
      });

      // Post 2: Beach sunset image post by Jane Doe (to demo image views!)
      const beachPost = await prisma.post.create({
        data: {
          authorId: janeUser!.id,
          type: 'IMAGE',
          caption: 'Chasing sunsets by the shore. The ocean breeze cures everything. 🌊🌅 #beach #goldenhour',
          likeCount: 42,
          commentCount: 3,
          media: {
            create: [
              {
                type: 'IMAGE',
                rawUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60',
                order: 0,
              },
            ],
          },
        },
      });

      // Seed mock comments for the beach post
      await prisma.comment.createMany({
        data: [
          {
            postId: beachPost.id,
            authorId: testUser!.id,
            content: 'Wow! This picture looks absolutely breathtaking. Golden hour is perfect here!',
          },
          {
            postId: beachPost.id,
            authorId: janeUser!.id,
            content: 'Thank you! It was taken last weekend, highly recommend visiting.',
          },
        ],
      });

      // Seed a mock post by the demo user itself
      await prisma.post.create({
        data: {
          authorId: testUser!.id,
          type: 'TEXT',
          caption: 'Welcome to the NOVA dashboard! I am currently pair-programming with Antigravity to build and design this application. Everything is functioning in real-time!',
          likeCount: 3,
        },
      });

      console.log('SUCCESS: Seed feed posts and comments generated successfully!');
    } else {
      console.log('INFO: Database already has posts, skipping post seed.');
    }
  } catch (err: any) {
    console.error('ERROR during seed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
