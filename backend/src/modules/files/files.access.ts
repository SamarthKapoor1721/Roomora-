type FileViewer = { id: string; role: 'OWNER' | 'TENANT' | 'STAFF' };

export function canViewApplicationDocument(viewer: FileViewer, tenantId: string, ownerId: string): boolean {
  return (viewer.role === 'TENANT' && viewer.id === tenantId) || (viewer.role === 'OWNER' && viewer.id === ownerId);
}

export function canViewMaintenancePhoto(viewer: FileViewer, tenantId: string, ownerId: string, staffId: string | null): boolean {
  return (viewer.role === 'TENANT' && viewer.id === tenantId)
    || (viewer.role === 'OWNER' && viewer.id === ownerId)
    || (viewer.role === 'STAFF' && viewer.id === staffId);
}

export function canViewCleaningPhoto(viewer: FileViewer, ownerId: string, staffId: string | null): boolean {
  return (viewer.role === 'OWNER' && viewer.id === ownerId)
    || (viewer.role === 'STAFF' && viewer.id === staffId);
}
