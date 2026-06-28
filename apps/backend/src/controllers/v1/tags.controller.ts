import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const listTagsController = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    const tags = await prisma.tag.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { files: true }
        }
      }
    });

    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    console.error('listTagsController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createTagController = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    const { name, color } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Tag name is required' });
      return;
    }

    const cleanTagName = name.trim();

    // Check unique constraint name_workspaceId
    const existing = await prisma.tag.findUnique({
      where: {
        name_workspaceId: {
          name: cleanTagName,
          workspaceId
        }
      }
    });

    if (existing) {
      res.status(400).json({ error: 'A tag with this name already exists in the workspace' });
      return;
    }

    const tag = await prisma.tag.create({
      data: {
        name: cleanTagName,
        color: color || null,
        workspaceId
      }
    });

    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    console.error('createTagController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateTagController = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    const { id } = req.params;
    const { name, color } = req.body;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    if (!name && color === undefined) {
      res.status(400).json({ error: 'Tag name or color is required' });
      return;
    }

    // Check if tag exists
    const tag = await prisma.tag.findFirst({
      where: { id: id as string, workspaceId }
    });

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    const cleanTagName = name ? name.trim() : undefined;

    // Check unique name if name is changing
    if (cleanTagName && cleanTagName !== tag.name) {
      const existing = await prisma.tag.findUnique({
        where: {
          name_workspaceId: {
            name: cleanTagName,
            workspaceId
          }
        }
      });

      if (existing) {
        res.status(400).json({ error: 'A tag with this name already exists in the workspace' });
        return;
      }
    }

    const updated = await prisma.tag.update({
      where: { id: id as string },
      data: {
        name: cleanTagName !== undefined ? cleanTagName : undefined,
        color: color !== undefined ? color : undefined
      }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateTagController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteTagController = async (req: Request & { workspaceId?: string; user?: { workspaceId: string } }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspaceId;
    const { id } = req.params;

    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized: No workspace context' });
      return;
    }

    // Check if tag exists
    const tag = await prisma.tag.findFirst({
      where: { id: id as string, workspaceId }
    });

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    // Delete tag (unlinks from files automatically in Prisma M-N relations)
    await prisma.tag.delete({
      where: { id: id as string }
    });

    res.status(200).json({ success: true, message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('deleteTagController Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
