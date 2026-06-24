-- CreateEnum
CREATE TYPE "MediaFileStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ProcessingJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MomentVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');

-- CreateTable
CREATE TABLE "ThemePreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemePreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "MediaFileStatus" NOT NULL DEFAULT 'PENDING',
    "rawPath" TEXT NOT NULL,
    "rawUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaVariant" (
    "id" TEXT NOT NULL,
    "mediaFileId" TEXT NOT NULL,
    "variantType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "bitrate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaProcessingJob" (
    "id" TEXT NOT NULL,
    "mediaFileId" TEXT NOT NULL,
    "status" "ProcessingJobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "error" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Moment" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "mediaFileId" TEXT NOT NULL,
    "caption" VARCHAR(2200),
    "visibility" "MomentVisibility" NOT NULL DEFAULT 'PUBLIC',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "scheduledAt" TIMESTAMP(3),
    "duration" DOUBLE PRECISION NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Moment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentView" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "userId" TEXT,
    "watchTime" DOUBLE PRECISION NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentLike" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentComment" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" VARCHAR(1000) NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MomentComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentShare" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentSave" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentBookmark" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentReport" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "MomentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentHashtag" (
    "momentId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "MomentHashtag_pkey" PRIMARY KEY ("momentId","tag")
);

-- CreateTable
CREATE TABLE "MomentMention" (
    "momentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MomentMention_pkey" PRIMARY KEY ("momentId","userId")
);

-- CreateTable
CREATE TABLE "MomentAnalytics" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "watchTime" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "MomentAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentDraft" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "mediaFileId" TEXT,
    "caption" VARCHAR(2200),
    "visibility" "MomentVisibility" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MomentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentRecommendation" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThemePreferences_userId_key" ON "ThemePreferences"("userId");

-- CreateIndex
CREATE INDEX "MediaFile_userId_idx" ON "MediaFile"("userId");

-- CreateIndex
CREATE INDEX "MediaVariant_mediaFileId_idx" ON "MediaVariant"("mediaFileId");

-- CreateIndex
CREATE INDEX "MediaVariant_variantType_idx" ON "MediaVariant"("variantType");

-- CreateIndex
CREATE INDEX "MediaProcessingJob_mediaFileId_idx" ON "MediaProcessingJob"("mediaFileId");

-- CreateIndex
CREATE INDEX "MediaProcessingJob_status_idx" ON "MediaProcessingJob"("status");

-- CreateIndex
CREATE INDEX "Moment_creatorId_createdAt_idx" ON "Moment"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "Moment_visibility_createdAt_idx" ON "Moment"("visibility", "createdAt");

-- CreateIndex
CREATE INDEX "MomentView_momentId_idx" ON "MomentView"("momentId");

-- CreateIndex
CREATE INDEX "MomentView_userId_idx" ON "MomentView"("userId");

-- CreateIndex
CREATE INDEX "MomentLike_momentId_idx" ON "MomentLike"("momentId");

-- CreateIndex
CREATE UNIQUE INDEX "MomentLike_userId_momentId_key" ON "MomentLike"("userId", "momentId");

-- CreateIndex
CREATE INDEX "MomentComment_momentId_idx" ON "MomentComment"("momentId");

-- CreateIndex
CREATE INDEX "MomentComment_parentId_idx" ON "MomentComment"("parentId");

-- CreateIndex
CREATE INDEX "MomentShare_momentId_idx" ON "MomentShare"("momentId");

-- CreateIndex
CREATE INDEX "MomentShare_userId_idx" ON "MomentShare"("userId");

-- CreateIndex
CREATE INDEX "MomentSave_momentId_idx" ON "MomentSave"("momentId");

-- CreateIndex
CREATE UNIQUE INDEX "MomentSave_userId_momentId_key" ON "MomentSave"("userId", "momentId");

-- CreateIndex
CREATE INDEX "MomentBookmark_momentId_idx" ON "MomentBookmark"("momentId");

-- CreateIndex
CREATE UNIQUE INDEX "MomentBookmark_userId_momentId_key" ON "MomentBookmark"("userId", "momentId");

-- CreateIndex
CREATE INDEX "MomentReport_momentId_idx" ON "MomentReport"("momentId");

-- CreateIndex
CREATE INDEX "MomentHashtag_tag_idx" ON "MomentHashtag"("tag");

-- CreateIndex
CREATE INDEX "MomentMention_userId_idx" ON "MomentMention"("userId");

-- CreateIndex
CREATE INDEX "MomentAnalytics_momentId_idx" ON "MomentAnalytics"("momentId");

-- CreateIndex
CREATE UNIQUE INDEX "MomentAnalytics_momentId_date_key" ON "MomentAnalytics"("momentId", "date");

-- CreateIndex
CREATE INDEX "MomentDraft_creatorId_idx" ON "MomentDraft"("creatorId");

-- CreateIndex
CREATE INDEX "MomentRecommendation_momentId_idx" ON "MomentRecommendation"("momentId");

-- AddForeignKey
ALTER TABLE "ThemePreferences" ADD CONSTRAINT "ThemePreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaVariant" ADD CONSTRAINT "MediaVariant_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentView" ADD CONSTRAINT "MomentView_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentView" ADD CONSTRAINT "MomentView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentLike" ADD CONSTRAINT "MomentLike_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentLike" ADD CONSTRAINT "MomentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentComment" ADD CONSTRAINT "MomentComment_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentComment" ADD CONSTRAINT "MomentComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentComment" ADD CONSTRAINT "MomentComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MomentComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentShare" ADD CONSTRAINT "MomentShare_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentShare" ADD CONSTRAINT "MomentShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentSave" ADD CONSTRAINT "MomentSave_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentSave" ADD CONSTRAINT "MomentSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentBookmark" ADD CONSTRAINT "MomentBookmark_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentBookmark" ADD CONSTRAINT "MomentBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentReport" ADD CONSTRAINT "MomentReport_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentReport" ADD CONSTRAINT "MomentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentHashtag" ADD CONSTRAINT "MomentHashtag_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentMention" ADD CONSTRAINT "MomentMention_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentMention" ADD CONSTRAINT "MomentMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentAnalytics" ADD CONSTRAINT "MomentAnalytics_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentDraft" ADD CONSTRAINT "MomentDraft_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentDraft" ADD CONSTRAINT "MomentDraft_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentRecommendation" ADD CONSTRAINT "MomentRecommendation_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
