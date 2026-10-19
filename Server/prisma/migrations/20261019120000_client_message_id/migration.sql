-- Phase 6: idempotent message creation

-- AlterTable: new nullable column, existing rows get NULL
ALTER TABLE "messages" ADD COLUMN "client_message_id" TEXT;

-- CreateIndex: one message per (sender, clientMessageId)
CREATE UNIQUE INDEX "messages_sender_id_client_message_id_key" ON "messages"("sender_id", "client_message_id");
