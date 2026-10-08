import { Router } from 'express';
import { ownerTenancyRoutes, tenantTenancyRoutes } from './modules/tenancy/tenancy.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import {
  ownerApplicationRoutes,
  tenantApplicationRoutes,
} from './modules/applications/applications.routes';
import {
  ownerAssignmentRoutes,
  tenantAssignmentRoutes,
} from './modules/assignments/assignments.routes';
import { assistantRoutes } from './modules/assistant/assistant.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { filesRoutes } from './modules/files/files.routes';
import { ownerCleaningRoutes, staffCleaningRoutes } from './modules/cleaning/cleaning.routes';
import { ownerLeaseRoutes, tenantLeaseRoutes } from './modules/leases/leases.routes';
import {
  maintenanceSharedRoutes,
  ownerMaintenanceRoutes,
  staffMaintenanceRoutes,
  tenantMaintenanceRoutes,
} from './modules/maintenance/maintenance.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { ownerPaymentRoutes, tenantPaymentRoutes } from './modules/payments/payments.routes';
import { propertiesRoutes } from './modules/properties/properties.routes';
import { browseRoutes, roomsRoutes } from './modules/rooms/rooms.routes';
import { ownerStaffRoutes, staffSelfRoutes } from './modules/staff/staff.routes';
import { usersRoutes } from './modules/users/users.routes';
import { ownerWarningRoutes, tenantWarningRoutes } from './modules/warnings/warnings.routes';

export const apiRouter = Router();

// Auth & profile
apiRouter.use('/auth', authRoutes);
apiRouter.use('/files', filesRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/analytics', analyticsRoutes);

// Owner-scoped
apiRouter.use('/owner/properties', propertiesRoutes);
apiRouter.use('/owner/rooms', roomsRoutes);
apiRouter.use('/owner', ownerAssignmentRoutes); // /owner/rooms/:roomId/assignments, /owner/assignments/:id/end
apiRouter.use('/owner/applications', ownerApplicationRoutes);
apiRouter.use('/owner/leases', ownerLeaseRoutes);
apiRouter.use('/owner/tenancy-requests', ownerTenancyRoutes);
apiRouter.use('/owner/payments', ownerPaymentRoutes);
apiRouter.use('/owner/maintenance', ownerMaintenanceRoutes);
apiRouter.use('/owner/cleaning', ownerCleaningRoutes);
apiRouter.use('/owner/staff', ownerStaffRoutes);
apiRouter.use('/owner/warnings', ownerWarningRoutes);
apiRouter.use('/owner/assistant', assistantRoutes);

// Tenant-scoped
apiRouter.use('/tenant/rooms', browseRoutes); // browse open rooms
apiRouter.use('/tenant/applications', tenantApplicationRoutes);
apiRouter.use('/tenant', tenantAssignmentRoutes); // /tenant/roommates
apiRouter.use('/tenant/leases', tenantLeaseRoutes);
apiRouter.use('/tenant/tenancy-requests', tenantTenancyRoutes);
apiRouter.use('/tenant/payments', tenantPaymentRoutes);
apiRouter.use('/tenant/maintenance', tenantMaintenanceRoutes);
apiRouter.use('/tenant/warnings', tenantWarningRoutes);

// Staff-scoped
apiRouter.use('/staff', staffSelfRoutes); // /staff/me
apiRouter.use('/staff/maintenance', staffMaintenanceRoutes);
apiRouter.use('/staff/cleaning', staffCleaningRoutes);

// Shared (role checked in service via relationship)
apiRouter.use('/maintenance', maintenanceSharedRoutes); // /maintenance/:id/photos, /notes
