import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../generated/prisma';

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest) {
  try {
    const { carteRareteId, possedee, condition, prixAchat, notes } = await request.json();
    
    if (!carteRareteId || typeof possedee !== 'boolean') {
      return NextResponse.json(
        { error: 'ID de carte-rareté et statut de possession requis' },
        { status: 400 }
      );
    }

    // Mettre à jour le statut de possession
    const updatedCarteRarete = await prisma.carteRarete.update({
      where: { id: carteRareteId },
      data: {
        possedee,
        dateAcquisition: possedee ? new Date() : null,
        condition: condition || (possedee ? 'NM' : 'NM'),
        prixAchat: prixAchat ? parseFloat(prixAchat) : null,
        notes: notes || null
      },
      include: {
        carte: true,
        rarete: true
      }
    });

    console.log(`✅ Carte ${possedee ? 'ajoutée à' : 'retirée de'} la collection:`, {
      carte: updatedCarteRarete.carte.nomCarte,
      rareté: updatedCarteRarete.rarete.nomRarete,
      possedee
    });

    return NextResponse.json({
      success: true,
      message: `Carte ${possedee ? 'ajoutée à' : 'retirée de'} votre collection`,
      data: updatedCarteRarete
    });

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la mise à jour du statut de possession',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}