-- DropIndex
DROP INDEX `EventRegistration_email_eventId_key` ON `EventRegistration`;

-- CreateIndex
CREATE INDEX `EventRegistration_email_eventId_idx` ON `EventRegistration`(`email`, `eventId`);
