import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const serieId = Number(id);

  if (!Number.isInteger(serieId) || serieId <= 0) {
    return NextResponse.json(
      { error: 'Identifiant de série invalide.' },
      { status: 400 },
    );
  }

  try {
    await prisma.series.delete({
      where: { id: serieId },
    });

    return NextResponse.json(
      { success: true, message: 'Série supprimée avec succès.' },
      { status: 200 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Série introuvable.' },
        { status: 404 },
      );
    }

    console.error('Erreur lors de la suppression de la série:', error);
    return NextResponse.json(
      {
        error: 'Erreur interne lors de la suppression de la série.',
      },
      { status: 500 },
    );
  }
}
