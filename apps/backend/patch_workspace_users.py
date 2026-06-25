import re

with open('src/controllers/internal/workspace-users.controller.ts', 'r') as f:
    content = f.read()

# Replace import
content = content.replace("import { WorkspaceRole } from '@prisma/client';", "import { Permission } from '@prisma/client';")

# 1. getWorkspaceUsers
content = content.replace("role: true,", "role: { select: { id: true, name: true } },")

# 2. updateUserRole
content = re.sub(
    r'const { workspaceId, userId: currentUserId, role: currentUserRole } = req\.user!;',
    'const { workspaceId, userId: currentUserId, role: currentUserRole } = req.user!;',
    content
)
content = content.replace("const { role: newRole } = req.body;", "const { roleId: newRoleId } = req.body;")
content = content.replace(
    "if (!Object.values(WorkspaceRole).includes(newRole)) {\n      res.status(400).json({ success: false, error: 'Invalid role provided' });\n      return;\n    }",
    "if (!newRoleId) {\n      res.status(400).json({ success: false, error: 'Invalid role provided' });\n      return;\n    }"
)

# Replace target user find to include role
content = content.replace(
    "const targetUser = await prisma.user.findUnique({\n      where: { id: targetUserId, workspaceId }\n    });",
    "const targetUser = await prisma.user.findUnique({\n      where: { id: targetUserId, workspaceId },\n      include: { role: true }\n    });"
)

# Logic checks in updateUserRole
content = content.replace(
    "if (currentUserRole !== WorkspaceRole.OWNER && currentUserRole !== WorkspaceRole.ADMIN) {",
    "if (!currentUserRole?.permissions.includes(Permission.MANAGE_ROLES) && !currentUserRole?.isSystem) {"
)
content = content.replace(
    "if (targetUser.role === WorkspaceRole.OWNER && currentUserRole !== WorkspaceRole.OWNER) {",
    "if (targetUser.role?.name === 'Owner' && currentUserRole?.name !== 'Owner') {"
)
content = content.replace(
    "if (targetUser.id === currentUserId && targetUser.role === WorkspaceRole.OWNER && newRole !== WorkspaceRole.OWNER) {",
    "if (targetUser.id === currentUserId && targetUser.role?.name === 'Owner') {\n      const newRoleObj = await prisma.role.findUnique({ where: { id: newRoleId } });\n      if (newRoleObj?.name !== 'Owner') {"
)
content = content.replace(
    "const ownerCount = await prisma.user.count({\n        where: { workspaceId, role: WorkspaceRole.OWNER }\n      });",
    "const ownerCount = await prisma.user.count({\n        where: { workspaceId, role: { name: 'Owner' } }\n      });"
)
# Close the if for newRoleObj
content = content.replace(
    "return;\n      }\n    }",
    "return;\n      }\n    }\n    }"
)

content = content.replace("data: { role: newRole },", "data: { roleId: newRoleId },")
content = content.replace("select: { id: true, email: true, name: true, role: true }", "select: { id: true, email: true, name: true, role: { select: { id: true, name: true } } }")

# 3. removeWorkspaceUser
content = content.replace(
    "if (currentUserRole === WorkspaceRole.ADMIN && (targetUser.role === WorkspaceRole.OWNER || targetUser.role === WorkspaceRole.ADMIN)) {",
    "if (currentUserRole?.name === 'Admin' && (targetUser.role?.name === 'Owner' || targetUser.role?.name === 'Admin')) {"
)
content = content.replace(
    "if (targetUser.id === currentUserId && targetUser.role === WorkspaceRole.OWNER) {",
    "if (targetUser.id === currentUserId && targetUser.role?.name === 'Owner') {"
)
content = content.replace(
    "if (targetUser.id !== currentUserId && currentUserRole !== WorkspaceRole.OWNER && currentUserRole !== WorkspaceRole.ADMIN) {",
    "if (targetUser.id !== currentUserId && !currentUserRole?.permissions.includes(Permission.MANAGE_USERS) && !currentUserRole?.isSystem) {"
)

# 4. inviteUser
content = content.replace("const { email, role } = req.body;", "const { email, roleId } = req.body;")
content = content.replace(
    "if (!email || !role || !Object.values(WorkspaceRole).includes(role)) {",
    "if (!email || !roleId) {"
)
content = content.replace("update: { token, role, expiresAt },", "update: { token, roleId, expiresAt },")
content = content.replace("create: { email, workspaceId, token, role, expiresAt }", "create: { email, workspaceId, token, roleId, expiresAt }")

# 7. acceptInvitation
content = content.replace("role: invitation.role", "roleId: invitation.roleId")

# 8. leaveWorkspace
content = content.replace(
    "const user = await prisma.user.findUnique({ where: { id: userId } });",
    "const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });"
)
content = content.replace("if (user.role === WorkspaceRole.OWNER) {", "if (user.role?.name === 'Owner') {")
content = content.replace("data: {\n        workspaceId: newWorkspace.id,\n        role: WorkspaceRole.OWNER\n      }", "data: {\n        workspaceId: newWorkspace.id,\n      }")

with open('src/controllers/internal/workspace-users.controller.ts', 'w') as f:
    f.write(content)

print("Patched workspace-users.controller.ts")
