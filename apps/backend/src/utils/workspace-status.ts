import { prisma } from '../config/prisma';

/**
 * Перевіряє, чи є робочий простір замороженим (Locked) через перевищення ліміту безкоштовних слотів.
 * Користувач може мати лише 1 активний безкоштовний (FREE) воркспейс.
 * Якщо безкоштовних воркспейсів кілька, активним залишається лише найперший (найстаріший за createdAt).
 * 
 * @param workspaceId ID робочого простору
 * @returns true, якщо воркспейс заморожено, false в іншому випадку
 */
export async function isWorkspaceLocked(workspaceId: string): Promise<boolean> {
  try {
    // 1. Перевіряємо план поточного воркспейсу
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true }
    });

    // Платні воркспейси ніколи не блокуються за цим лімітом
    if (!workspace || workspace.plan !== 'FREE') {
      return false;
    }

    // 2. Знаходимо власника (Owner) поточного воркспейсу
    const ownerMembership = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        role: { name: 'Owner', isSystem: true }
      },
      select: { userId: true }
    });

    if (!ownerMembership) {
      // Якщо раптом немає власника — не блокуємо
      return false;
    }

    // 3. Знаходимо всі FREE воркспейси, що належать цьому ж власнику
    const ownedFreeWorkspaces = await prisma.workspaceUser.findMany({
      where: {
        userId: ownerMembership.userId,
        role: { name: 'Owner', isSystem: true },
        workspace: { plan: 'FREE' }
      },
      select: { workspaceId: true },
      orderBy: {
        workspace: { createdAt: 'asc' } // Від найстарішого до найновішого
      }
    });

    // Якщо безкоштовний воркспейс лише один, він не є замороженим
    if (ownedFreeWorkspaces.length <= 1) {
      return false;
    }

    // Активним безкоштовним вважається найстаріший (перший у списку)
    const activeFreeWorkspaceId = ownedFreeWorkspaces[0]?.workspaceId;

    // Всі інші FREE воркспейси є замороженими (Locked)
    return workspaceId !== activeFreeWorkspaceId;
  } catch (error) {
    console.error(`[isWorkspaceLocked] Error checking status for workspace ${workspaceId}:`, error);
    // У разі помилки бази даних краще не блокувати користувача
    return false;
  }
}
