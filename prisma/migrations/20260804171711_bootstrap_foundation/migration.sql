-- CreateTable
CREATE TABLE "bootstrap_health_checks" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bootstrap_health_checks_pkey" PRIMARY KEY ("id")
);
