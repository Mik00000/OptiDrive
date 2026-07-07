/**
 * Input validation and sanitization utility functions for OptiDrive backend.
 */

// Helper to remove path traversal sequences and dangerous control characters
function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/\0/g, '') // Remove NULL bytes
    .replace(/\.\.+\//g, '') // Remove ../ path traversal
    .replace(/\.\.+\\/g, '') // Remove ..\ path traversal
    .trim();
}

/**
 * Validates and sanitizes a file name.
 * Filenames are restricted to 1 - 255 characters.
 */
export function validateFileName(name: string): string {
  const cleanName = sanitizeText(name);
  if (!cleanName || cleanName.length < 1) {
    throw new Error('File name cannot be empty');
  }
  if (cleanName.length > 255) {
    throw new Error('File name cannot exceed 255 characters');
  }
  return cleanName;
}

/**
 * Validates and sanitizes a folder name.
 * Folder names are restricted to 1 - 80 characters and cannot contain slashes.
 */
export function validateFolderName(name: string): string {
  const cleanName = sanitizeText(name).replace(/[\/\\]/g, '-'); // Replace slashes with dash
  if (!cleanName || cleanName.length < 1) {
    throw new Error('Folder name cannot be empty');
  }
  if (cleanName.length > 80) {
    throw new Error('Folder name cannot exceed 80 characters');
  }
  return cleanName;
}

/**
 * Validates and sanitizes tag names.
 * Tags are restricted to 1 - 30 characters and stripped of non-alphanumeric/spaces.
 */
export function validateTagName(name: string): string {
  const cleanName = sanitizeText(name)
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Keep alphanumeric, spaces, dashes, underscores
    .trim();
  
  if (!cleanName || cleanName.length < 1) {
    throw new Error('Tag name must be a valid alphanumeric string');
  }
  if (cleanName.length > 30) {
    throw new Error('Tag name cannot exceed 30 characters');
  }
  return cleanName;
}

/**
 * Validates and sanitizes workspace names.
 * Workspace names are restricted to 1 - 100 characters.
 */
export function validateWorkspaceName(name: string): string {
  const cleanName = sanitizeText(name);
  if (!cleanName || cleanName.length < 1) {
    throw new Error('Workspace name cannot be empty');
  }
  if (cleanName.length > 100) {
    throw new Error('Workspace name cannot exceed 100 characters');
  }
  return cleanName;
}

/**
 * Validates and sanitizes user profile names.
 * Names are restricted to 1 - 50 characters.
 */
export function validateUserName(name: string): string {
  const cleanName = sanitizeText(name);
  if (!cleanName || cleanName.length < 1) {
    throw new Error('User name cannot be empty');
  }
  if (cleanName.length > 50) {
    throw new Error('User name cannot exceed 50 characters');
  }
  return cleanName;
}
