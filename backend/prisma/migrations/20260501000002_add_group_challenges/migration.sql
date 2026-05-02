CREATE TABLE IF NOT EXISTS "GroupChallenge" (
  "id"             TEXT NOT NULL,
  "creatorId"      TEXT NOT NULL,
  "activityType"   TEXT NOT NULL,
  "targetSessions" INTEGER NOT NULL,
  "deadline"       TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'active',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GroupChallengeParticipant" (
  "id"               TEXT NOT NULL,
  "groupChallengeId" TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  CONSTRAINT "GroupChallengeParticipant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GroupChallenge"
  ADD CONSTRAINT "GroupChallenge_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupChallengeParticipant"
  ADD CONSTRAINT "GroupChallengeParticipant_groupChallengeId_fkey"
  FOREIGN KEY ("groupChallengeId") REFERENCES "GroupChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupChallengeParticipant"
  ADD CONSTRAINT "GroupChallengeParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "GroupChallengeParticipant_groupChallengeId_userId_key"
  ON "GroupChallengeParticipant"("groupChallengeId", "userId");
