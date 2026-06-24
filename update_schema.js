const fs = require('fs');

let schema = fs.readFileSync('apps/api/prisma/schema.prisma', 'utf8');

// 1. Add new Enums
const newEnums = `
enum ProfileType {
  PERSONAL
  CREATOR
  PROFESSIONAL
  BUSINESS
  COMMUNITY
}

enum VerificationStatus {
  NONE
  PENDING
  VERIFIED
  REJECTED
}

enum ChatVisibility {
  NORMAL
  ARCHIVED
  HIDDEN
}

enum CallType {
  AUDIO
  VIDEO
}

enum CallStatus {
  ONGOING
  ENDED
  MISSED
}
`;
schema = schema.replace('// -----------------------------------------------------------------', '// -----------------------------------------------------------------\n' + newEnums);


// 2. Add fields to Profile
schema = schema.replace(/isVerified\s+Boolean\s+@default\(false\)/, `isVerified  Boolean @default(false)
  type        ProfileType @default(PERSONAL)
  contactEmail String?
  contactPhone String?
  verification VerificationStatus @default(NONE)`);

// 3. Add fields to ConversationParticipant
schema = schema.replace(/mutedUntil\s+DateTime\?/, `mutedUntil     DateTime?
  chatVisibility ChatVisibility @default(NORMAL)
  isPinned       Boolean        @default(false)`);

// 4. Update Message to support E2EE & modern features
schema = schema.replace(/content\s+String\?\s+@db\.VarChar\(4000\)/, `content        String?     @db.VarChar(4000)
  encryptedContent String?     @db.Text
  isForwarded    Boolean     @default(false)
  forwardedFromId String?
  replyToId      String?
  isDeletedForEveryone Boolean @default(false)
  replyTo        Message?    @relation("MessageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies        Message[]   @relation("MessageReplies")`);

// 5. Update Conversation
schema = schema.replace(/messages\s+Message\[\]/, `messages     Message[]
  calls        Call[]`);

// 6. Update User relations
schema = schema.replace(/restrictedByUsers\s+RestrictedUser\[\]\s+@relation\("RestrictedByUsers"\)/, `restrictedByUsers        RestrictedUser[]     @relation("RestrictedByUsers")
  devices                  UserDevice[]
  callsInitiated           Call[]               @relation("CallInitiator")
  callParticipations       CallParticipant[]
  storyReactions           StoryReaction[]
  storyHighlights          StoryHighlight[]`);

// 7. Update Story relations
schema = schema.replace(/views\s+StoryView\[\]/, `views StoryView[]
  reactions StoryReaction[]
  highlights StoryHighlight[] @relation("HighlightStories")`);


// 8. Add new models at the bottom
const newModels = `
// -----------------------------------------------------------------
// E2EE MESSENGER & CALLS (Phases 11)
// -----------------------------------------------------------------

model UserDevice {
  id               String   @id @default(uuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceIdentifier String
  identityKeyPub   String   @db.Text
  registrationId   Int
  signedPreKeyId   Int
  signedPreKeyPub  String   @db.Text
  signedPreKeySig  String   @db.Text
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  preKeys          E2EPreKey[]
  
  @@unique([userId, deviceIdentifier])
}

model E2EPreKey {
  id           String     @id @default(uuid())
  userDeviceId String
  userDevice   UserDevice @relation(fields: [userDeviceId], references: [id], onDelete: Cascade)
  keyId        Int
  publicKey    String     @db.Text
  createdAt    DateTime   @default(now())

  @@unique([userDeviceId, keyId])
}

model Call {
  id             String           @id @default(uuid())
  conversationId String
  conversation   Conversation     @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  callerId       String
  caller         User             @relation("CallInitiator", fields: [callerId], references: [id], onDelete: Cascade)
  type           CallType         @default(AUDIO)
  status         CallStatus       @default(ONGOING)
  startedAt      DateTime         @default(now())
  endedAt        DateTime?
  participants   CallParticipant[]
  
  @@index([conversationId])
}

model CallParticipant {
  id       String    @id @default(uuid())
  callId   String
  call     Call      @relation(fields: [callId], references: [id], onDelete: Cascade)
  userId   String
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  joinedAt DateTime  @default(now())
  leftAt   DateTime?

  @@unique([callId, userId])
}

// -----------------------------------------------------------------
// STORIES EXTENSION (Phase 12)
// -----------------------------------------------------------------

model StoryReaction {
  id        String       @id @default(uuid())
  storyId   String
  story     Story        @relation(fields: [storyId], references: [id], onDelete: Cascade)
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      ReactionType
  createdAt DateTime     @default(now())

  @@unique([userId, storyId])
}

model StoryHighlight {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  coverUrl  String?
  createdAt DateTime @default(now())

  stories   Story[]  @relation("HighlightStories")
  
  @@index([userId])
}

// -----------------------------------------------------------------
// IDENTITY EXTENSION (Phase 16)
// -----------------------------------------------------------------

model CloseFriend {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  friendId  String
  createdAt DateTime @default(now())

  @@unique([userId, friendId])
}

`;
schema += newModels;

fs.writeFileSync('apps/api/prisma/schema.prisma', schema);
console.log('Schema updated successfully.');
