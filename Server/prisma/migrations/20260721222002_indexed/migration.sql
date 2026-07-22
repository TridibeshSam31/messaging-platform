/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "edited_at" DROP NOT NULL,
ALTER COLUMN "deleted_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "avatar" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
