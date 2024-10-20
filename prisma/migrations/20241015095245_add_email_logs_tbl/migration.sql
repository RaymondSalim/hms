-- CreateTable
CREATE TABLE "emaillogs" (
    "id" SERIAL NOT NULL,
    "status" VARCHAR(255) NOT NULL,
    "payload" VARCHAR(4096) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emaillogs_pkey" PRIMARY KEY ("id")
);
