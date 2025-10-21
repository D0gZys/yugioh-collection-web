import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateCarteRareteSchema = z.object({
  carteRareteId: z.number().int().positive(),
  possedee: z.boolean(),
  condition: z.string().trim().max(20).optional(),
  prixAchat: z
    .preprocess((value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      if (typeof value === 'number') {
        return value;
      }
      const parsed = Number.parseFloat(String(value));
      return Number.isFinite(parsed) ? parsed : undefined;
    }, z.number().nonnegative().nullable())
    .optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateCarteRareteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données de requête invalides', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { carteRareteId, possedee, condition, prixAchat, notes } = parsed.data;

    const updatedCarteRarete = await prisma.carteRarete.update({
      where: { id: carteRareteId },
      data: {
        possedee,
        dateAcquisition: possedee ? new Date() : null,
        condition: condition ?? 'NM',
        prixAchat: prixAchat ?? null,
        notes: notes ?? null,
      },
      include: {
        carte: true,
        rarete: true,
      },
    });

    console.log(`✅ Carte ${possedee ? 'ajoutée à' : 'retirée de'} la collection:`, {
      carte: updatedCarteRarete.carte.nomCarte,
      rareté: updatedCarteRarete.rarete.nomRarete,
      possedee,
    });

    return NextResponse.json({
      success: true,
      message: `Carte ${possedee ? 'ajoutée à' : 'retirée de'} votre collection`,
      data: updatedCarteRarete,
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);

    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour du statut de possession',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}
