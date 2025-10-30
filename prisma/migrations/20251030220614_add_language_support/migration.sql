/*
  Warnings:

  - A unique constraint covering the columns `[numero_carte,serie_id,artwork]` on the table `cartes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nom_rarete]` on the table `raretes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code_serie,langue_id]` on the table `series` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `langue_id` to the `series` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."series_code_serie_key";

-- AlterTable
ALTER TABLE "series" ADD COLUMN     "langue_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "langues" (
    "id" SERIAL NOT NULL,
    "code_langue" VARCHAR(5) NOT NULL,
    "nom_langue" VARCHAR(50) NOT NULL,

    CONSTRAINT "langues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "langues_code_langue_key" ON "langues"("code_langue");

-- CreateIndex
CREATE INDEX "cartes_serie_id_idx" ON "cartes"("serie_id");

-- CreateIndex
CREATE INDEX "cartes_serie_id_numero_carte_idx" ON "cartes"("serie_id", "numero_carte");

-- CreateIndex
CREATE INDEX "cartes_serie_id_artwork_idx" ON "cartes"("serie_id", "artwork");

-- CreateIndex
CREATE UNIQUE INDEX "cartes_numero_carte_serie_id_artwork_key" ON "cartes"("numero_carte", "serie_id", "artwork");

-- CreateIndex
CREATE UNIQUE INDEX "raretes_nom_rarete_key" ON "raretes"("nom_rarete");

-- CreateIndex
CREATE UNIQUE INDEX "series_code_serie_langue_id_key" ON "series"("code_serie", "langue_id");

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_langue_id_fkey" FOREIGN KEY ("langue_id") REFERENCES "langues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
