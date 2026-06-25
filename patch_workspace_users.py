import re

with open('/home/mik/Documents/GitHub/OptiDrive/apps/backend/src/controllers/internal/workspace-users.controller.ts', 'r') as f:
    content = f.read()

# Update sendInvitationEmail call
content = content.replace("await sendInvitationEmail(email, token, workspace!.name);", "await sendInvitationEmail(email, workspace!.name);")

new_functions = """
// 5. Отримати активні запрошення для поточного користувача
export const getPendingInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const invitations = await prisma.invitation.findMany({
      where: { 
        email: user.email,
        expiresAt: { gt: new Date() }
      },
      include: {
        workspace: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({ success: true, data: invitations });
  } catch (error) {
    console.error('getPendingInvitations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending invitations' });
  }
};

// 6. Відхилити запрошення
export const rejectInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user!;
    const { invitationId } = req.body;

    if (!invitationId) {
      res.status(400).json({ success: false, error: 'Invitation ID is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
    
    if (!invitation || invitation.email !== user.email) {
      res.status(404).json({ success: false, error: 'Invitation not found or unauthorized' });
      return;
    }

    await prisma.invitation.delete({ where: { id: invitationId } });
    
    res.json({ success: true, message: 'Invitation rejected' });
  } catch (error) {
    console.error('rejectInvitation error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject invitation' });
  }
};

// 7. Прийняти запрошення
export const acceptInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, workspaceId: currentWorkspaceId } = req.user!;
    const { invitationId, confirmLeave } = req.body;

    if (!invitationId) {
      res.status(400).json({ success: false, error: 'Invitation ID is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation || invitation.expiresAt < new Date()) {
      res.status(400).json({ success: false, error: 'Invalid or expired invitation' });
      return;
    }

    if (user.email !== invitation.email) {
      res.status(403).json({ success: false, error: 'This invitation is for a different email address' });
      return;
    }

    // Якщо це не новий користувач (створений більше години тому) або його поточний простір не порожній
    if (!confirmLeave) {
      const currentWorkspaceFiles = await prisma.mediaFile.count({ where: { workspaceId: currentWorkspaceId } });
      const currentWorkspaceKeys = await prisma.apiKey.count({ where: { workspaceId: currentWorkspaceId } });
      const userAge = Date.now() - new Date(user.createdAt).getTime();
      const isOldUser = userAge > 1000 * 60 * 60; // 1 година

      if (isOldUser || currentWorkspaceFiles > 0 || currentWorkspaceKeys > 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Ви маєте існуючий робочий простір з даними. Підтвердіть, що хочете покинути його.', 
          requiresConfirmation: true 
        });
        return;
      }
    }

    const oldWorkspaceId = user.workspaceId;

    // Оновлюємо workspaceId та role користувача
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        workspaceId: invitation.workspaceId,
        role: invitation.role
      }
    });

    // Видаляємо старий робочий простір, якщо він став порожнім
    if (oldWorkspaceId !== invitation.workspaceId) {
      const remainingUsers = await prisma.user.count({ where: { workspaceId: oldWorkspaceId } });
      if (remainingUsers === 0) {
        await prisma.workspace.delete({ where: { id: oldWorkspaceId } });
      }
    }

    // Видаляємо використане запрошення
    await prisma.invitation.delete({ where: { id: invitation.id } });

    // Генеруємо НОВИЙ токен, бо в старому зашитий старий workspaceId!
    const newToken = generateToken(userId, invitation.workspaceId);

    res.json({ 
      success: true, 
      message: 'Joined workspace successfully', 
      workspaceId: invitation.workspaceId,
      token: newToken,
      user: updatedUser
    });
  } catch (error) {
    console.error('acceptInvitation error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept invitation' });
  }
};
"""

# Replace the old acceptInvitation
pattern = re.compile(r"// 5\. Прийняти запрошення.*?export const acceptInvitation.*?}\n};\n", re.DOTALL)
content = pattern.sub(new_functions, content)

with open('/home/mik/Documents/GitHub/OptiDrive/apps/backend/src/controllers/internal/workspace-users.controller.ts', 'w') as f:
    f.write(content)

print("Patched workspace-users.controller.ts")
