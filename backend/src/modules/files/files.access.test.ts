import { describe, expect, it } from 'vitest';
import { canViewApplicationDocument, canViewCleaningPhoto, canViewMaintenancePhoto } from './files.access';

describe('private upload access', () => {
  it('lets only the applicant and property owner view an application document', () => {
    expect(canViewApplicationDocument({ id: 'tenant-1', role: 'TENANT' }, 'tenant-1', 'owner-1')).toBe(true);
    expect(canViewApplicationDocument({ id: 'owner-1', role: 'OWNER' }, 'tenant-1', 'owner-1')).toBe(true);
    expect(canViewApplicationDocument({ id: 'tenant-2', role: 'TENANT' }, 'tenant-1', 'owner-1')).toBe(false);
    expect(canViewApplicationDocument({ id: 'staff-1', role: 'STAFF' }, 'tenant-1', 'owner-1')).toBe(false);
  });

  it('limits work photos to their tenant, owner or assigned staff member', () => {
    expect(canViewMaintenancePhoto({ id: 'tenant-1', role: 'TENANT' }, 'tenant-1', 'owner-1', 'staff-1')).toBe(true);
    expect(canViewMaintenancePhoto({ id: 'staff-1', role: 'STAFF' }, 'tenant-1', 'owner-1', 'staff-1')).toBe(true);
    expect(canViewMaintenancePhoto({ id: 'staff-2', role: 'STAFF' }, 'tenant-1', 'owner-1', 'staff-1')).toBe(false);
    expect(canViewCleaningPhoto({ id: 'owner-1', role: 'OWNER' }, 'owner-1', 'staff-1')).toBe(true);
    expect(canViewCleaningPhoto({ id: 'tenant-1', role: 'TENANT' }, 'owner-1', 'staff-1')).toBe(false);
  });
});
