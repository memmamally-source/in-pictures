/**
 * Hands picked files from the Quick album screen to the album once it has
 * opened (opening a project resets the import state, so files can't be
 * added before navigation). In memory only.
 */
const pending = new Map<string, File[]>();

export function setPendingFiles(projectId: string, files: File[]) {
  pending.set(projectId, files);
}

export function takePendingFiles(projectId: string): File[] | undefined {
  const files = pending.get(projectId);
  pending.delete(projectId);
  return files;
}
