-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Competency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isConditional" BOOLEAN NOT NULL DEFAULT false,
    "conditionalQuestionText" TEXT,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Competency_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Competency_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Competency" ("categoryId", "conditionalQuestionText", "id", "isConditional", "levelId", "name", "sortOrder") SELECT "categoryId", "conditionalQuestionText", "id", "isConditional", "levelId", "name", "sortOrder" FROM "Competency";
DROP TABLE "Competency";
ALTER TABLE "new_Competency" RENAME TO "Competency";
CREATE UNIQUE INDEX "Competency_categoryId_levelId_name_key" ON "Competency"("categoryId", "levelId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
