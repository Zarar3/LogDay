# Step 2 — Database Setup (PostgreSQL + Prisma)

## Goal
Create the PostgreSQL database and define the full schema using Prisma ORM.

---

## 2.1 Create the Database

Open a terminal and run:

```bash
psql -U postgres
```

Enter your PostgreSQL password when prompted, then run:

```sql
CREATE DATABASE logday;
\q
```

---

## 2.2 Initialize Prisma in the Backend

```bash
cd backend
npx prisma init
```

This creates:
- `backend/prisma/schema.prisma` — your database schema file
- Updates `backend/.env` with a `DATABASE_URL` line (make sure your password is correct)

---

## 2.3 Define the Schema

Open `backend/prisma/schema.prisma` and replace its entire contents with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())

  activities   Activity[]
  sentRequests     FriendRequest[] @relation("Sender")
  receivedRequests FriendRequest[] @relation("Receiver")
  friendsA         Friendship[]    @relation("UserA")
  friendsB         Friendship[]    @relation("UserB")
}

model Activity {
  id        String   @id @default(uuid())
  userId    String
  type      String          // custom label e.g. "Running"
  duration  Int?            // minutes (optional)
  notes     String?
  loggedAt  DateTime @default(now())
  date      String          // "YYYY-MM-DD" — the day this belongs to

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model FriendRequest {
  id         String   @id @default(uuid())
  senderId   String
  receiverId String
  status     String   @default("pending")  // "pending" | "accepted" | "rejected"
  createdAt  DateTime @default(now())

  sender     User     @relation("Sender",   fields: [senderId],   references: [id], onDelete: Cascade)
  receiver   User     @relation("Receiver", fields: [receiverId], references: [id], onDelete: Cascade)

  @@unique([senderId, receiverId])
}

model Friendship {
  id        String   @id @default(uuid())
  userAId   String
  userBId   String
  createdAt DateTime @default(now())

  userA     User     @relation("UserA", fields: [userAId], references: [id], onDelete: Cascade)
  userB     User     @relation("UserB", fields: [userBId], references: [id], onDelete: Cascade)

  @@unique([userAId, userBId])
}
```

### Schema Explanation

| Table | Purpose |
|-------|---------|
| `User` | Stores accounts — email, username, hashed password |
| `Activity` | Each log entry a user creates for a specific day |
| `FriendRequest` | Pending/accepted/rejected friend requests |
| `Friendship` | A confirmed two-way friendship between two users |

---

## 2.4 Run the Migration

This creates the actual tables in PostgreSQL:

```bash
cd backend
npx prisma migrate dev --name init
```

You should see output like:
```
✔  Generated Prisma Client
✔  Applied migration `20240101_init`
```

---

## 2.5 Verify the Schema (Optional)

Open Prisma Studio to visually inspect your database:

```bash
npx prisma studio
```

This opens a browser UI at http://localhost:5555 where you can see all your tables.

---

## 2.6 Generate the Prisma Client

Whenever you change the schema, run this to update the TypeScript/JS client:

```bash
npx prisma generate
```

(The migrate command does this automatically, but good to know.)

---

## Common Commands Reference

```bash
npx prisma migrate dev --name <description>   # create + apply a new migration
npx prisma migrate reset                       # wipe DB and re-apply all migrations (dev only!)
npx prisma studio                              # open visual DB browser
npx prisma generate                            # regenerate client after schema changes
```

---

## Checklist

- [ ] `logday` database created in PostgreSQL
- [ ] Prisma initialized in `backend/`
- [ ] Schema defined with User, Activity, FriendRequest, Friendship models
- [ ] Migration ran successfully (`npx prisma migrate dev --name init`)
- [ ] Tables visible in Prisma Studio

---

## Next Step → [STEP_3_BACKEND.md](STEP_3_BACKEND.md)
