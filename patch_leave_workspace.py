import re

with open('/home/mik/Documents/GitHub/OptiDrive/apps/backend/src/controllers/internal/workspace-users.controller.ts', 'r') as f:
    content = f.read()

new_func = """
// 8. Покинути робочий простір
export const leaveWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, workspaceId } = req.user!;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (user.role === WorkspaceRole.OWNER) {
      const ownerCount = await prisma.user.count({
        where: { workspaceId, role: WorkspaceRole.OWNER }
      });
      if (ownerCount <= 1) {
        res.status(400).json({ success: false, error: 'Cannot leave workspace as you are the only owner' });
        return;
      }
    }

    const newWorkspace = await prisma.workspace.create({
      data: {
        name: `${user.name || 'Personal'} Workspace`,
        slug: `personal-${user.id}-${Date.now()}`
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        workspaceId: newWorkspace.id,
        role: WorkspaceRole.OWNER
      }
    });

    const newToken = generateToken(userId, newWorkspace.id);

    res.json({ success: true, message: 'Left workspace', token: newToken });
  } catch (error) {
    console.error('leaveWorkspace error:', error);
    res.status(500).json({ success: false, error: 'Failed to leave workspace' });
  }
};
"""

content = content + "\n" + new_func

with open('/home/mik/Documents/GitHub/OptiDrive/apps/backend/src/controllers/internal/workspace-users.controller.ts', 'w') as f:
    f.write(content)

print("Added leaveWorkspace")
