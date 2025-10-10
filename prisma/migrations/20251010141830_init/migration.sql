-- CreateTable
CREATE TABLE "series" (
    "id" SERIAL NOT NULL,
    "code_serie" VARCHAR(10) NOT NULL,
    "nom_serie" VARCHAR(100) NOT NULL,
    "url_source" TEXT,
    "date_ajout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nb_cartes_total" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartes" (
    "id" SERIAL NOT NULL,
    "numero_carte" VARCHAR(20) NOT NULL,
    "nom_carte" VARCHAR(200) NOT NULL,
    "serie_id" INTEGER NOT NULL,
    "date_ajout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cartes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raretes" (
    "id" SERIAL NOT NULL,
    "nom_rarete" VARCHAR(50) NOT NULL,
    "ordre_tri" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "raretes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carte_raretes" (
    "id" SERIAL NOT NULL,
    "carte_id" INTEGER NOT NULL,
    "rarete_id" INTEGER NOT NULL,
    "possedee" BOOLEAN NOT NULL DEFAULT false,
    "date_acquisition" DATE,
    "condition" VARCHAR(20) NOT NULL DEFAULT 'NM',
    "prix_achat" DECIMAL(10,2),
    "notes" TEXT,

    CONSTRAINT "carte_raretes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "series_code_serie_key" ON "series"("code_serie");

-- CreateIndex
CREATE UNIQUE INDEX "carte_raretes_carte_id_rarete_id_key" ON "carte_raretes"("carte_id", "rarete_id");

-- AddForeignKey
ALTER TABLE "cartes" ADD CONSTRAINT "cartes_serie_id_fkey" FOREIGN KEY ("serie_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carte_raretes" ADD CONSTRAINT "carte_raretes_carte_id_fkey" FOREIGN KEY ("carte_id") REFERENCES "cartes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carte_raretes" ADD CONSTRAINT "carte_raretes_rarete_id_fkey" FOREIGN KEY ("rarete_id") REFERENCES "raretes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
