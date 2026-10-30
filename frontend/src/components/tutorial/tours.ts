export type TutorialRole = 'OWNER' | 'TENANT';
export interface TourStep {
  path: string;
  target?: string;
  reveal?: 'owner-property' | 'explore-property';
  title: string;
  body: string;
  tip?: string;
}
export interface Tour {
  id: string;
  title: string;
  description: string;
  steps: TourStep[];
}

const ownerSetup: TourStep[] = [
  { path: '/owner/properties', target: 'new-property', title: 'Start with a property', body: 'Use New property to add the name, address, city and photos. Once created, select the property to manage its rooms.', tip: 'The tour only points out controls. Create your property after you finish.' },
  { path: '/owner/properties', target: 'add-room', reveal: 'owner-property', title: 'Add rooms and open applications', body: 'Select a property, then use Add room. Set the rent, deposit, capacity and food options. Open applications for rooms you want tenants to apply for.', tip: 'Room controls appear after you create and select a property.' },
  { path: '/owner/applications', target: 'owner-application', title: 'Review applicants', body: 'Open an application to review the applicant’s details, uploaded documents and screening results. Record your decision after reviewing the information.', tip: 'Applications appear after a tenant applies and submits for screening.' },
  { path: '/owner/leases', title: 'Follow the tenancy into a lease', body: 'Approving an application creates a lease. Review the tenant, room, dates and monthly rent here. Use AI summary on a lease for a plain-language explanation.', tip: 'Lease actions appear once an application is approved.' },
];
const ownerPayments: TourStep[] = [
  { path: '/owner/payments', target: 'generate-invoices', title: 'Generate monthly invoices', body: 'Generate this month creates rent invoices for eligible leases. Review the invoice period, total and due date in the list below.' },
  { path: '/owner/payments', target: 'record-payment', title: 'Track collections', body: 'Review billed, collected and outstanding amounts. Use Record on an outstanding invoice to record money received and the payment method.', tip: 'Payment controls appear when there are outstanding invoices. Confirming a payment updates the live record.' },
  { path: '/owner/warnings', target: 'scan-warnings', title: 'Stay ahead of issues', body: 'Warnings flag overdue rent, expiring leases, missing documents and delayed tasks. Run scan now refreshes the checks. Review each warning and resolve it when handled.' },
];
const ownerOperations: TourStep[] = [
  { path: '/owner/staff', target: 'add-staff', title: 'Build your team', body: 'Use Add staff to create a maintenance or cleaning staff account. Enter their details, skills and a temporary password. Share their Worker ID so they can sign in.' },
  { path: '/owner/maintenance', title: 'Assign and track repairs', body: 'Review requests raised by tenants. Set the priority, assign maintenance staff and track the status. Open a request’s photos to review the work.' },
  { path: '/owner/cleaning', target: 'new-cleaning', title: 'Schedule cleaning', body: 'Use New task to choose a property, title, frequency, date and priority. Assign cleaning staff and review their before and after photos as tasks progress.' },
];
const tenantHome: TourStep[] = [
  { path: '/tenant/browse', target: 'explore-property', title: 'Find a place to call home', body: 'Choose View property and rooms on a property to see its rooms, photos, rent and availability. Open a photo to take a closer look.', tip: 'If there are no listings yet, check back after an owner adds properties and rooms.' },
  { path: '/tenant/browse', target: 'apply-room', reveal: 'explore-property', title: 'Apply for an available room', body: 'Inside a property, choose Apply for an open room. Fill in your personal details, occupancy needs and preferences, then submit the application.', tip: 'The Apply button appears inside a property. Rooms must have available spots and open applications.' },
  { path: '/tenant/applications', target: 'tenant-application', title: 'Documents, screening and a decision', body: 'Open your application to upload the requested documents and submit for screening. Return here to track its status and the owner’s decision.', tip: 'Your applications will appear here after you apply for a room.' },
];
const tenantDaily: TourStep[] = [
  { path: '/tenant', title: 'Your tenancy at a glance', body: 'After approval, My home shows your assigned room, tenancy, roommates and rent. Check your next payment and use the quick actions to reach common tasks.', tip: 'Before you have a room, your dashboard helps you start browsing.' },
  { path: '/tenant/payments', target: 'pay-invoice', title: 'Review rent and payments', body: 'Check your invoices, due dates, payment status and history. On an outstanding invoice, choose Pay, review the amount and method, then confirm when ready.', tip: 'Invoices appear once your property owner generates them. This tutorial does not make a payment.' },
  { path: '/tenant/maintenance', target: 'raise-request', title: 'Get something fixed', body: 'Use Raise request to describe a problem in your room and submit it. Track its status here, expand a request to view photos, and add a photo to help explain the issue.', tip: 'You need an assigned room to submit a maintenance request.' },
];
const account: TourStep = { path: '/account', target: 'account-profile', title: 'Keep your account up to date', body: 'Update your name, manage your password and review Google sign-in here. The See tutorial button in the header is always available when you need another walkthrough.' };

export const TOURS: Record<TutorialRole, Tour[]> = {
  OWNER: [
    { id: 'full', title: 'The complete owner tour', description: 'From your first property to everyday management.', steps: [{ path: '/owner', title: 'Welcome to your owner workspace', body: 'Your dashboard brings together portfolio performance and items that need attention. We’ll walk through setting up rooms, reviewing tenants, collecting rent and managing your team.' }, ...ownerSetup, ...ownerPayments, ...ownerOperations, account] },
    { id: 'setup', title: 'Properties & tenant onboarding', description: 'Add rooms, review applications and find leases.', steps: ownerSetup },
    { id: 'payments', title: 'Rent & follow-ups', description: 'Generate invoices, record payments and review warnings.', steps: ownerPayments },
    { id: 'operations', title: 'Staff, repairs & cleaning', description: 'Set up your team and manage daily work.', steps: ownerOperations },
  ],
  TENANT: [
    { id: 'full', title: 'The complete tenant tour', description: 'Find a room and get comfortable with your workspace.', steps: [...tenantHome, ...tenantDaily, account] },
    { id: 'find-home', title: 'Find & apply for a room', description: 'Explore properties, apply and track your application.', steps: tenantHome },
    { id: 'daily', title: 'Rent & life at home', description: 'Understand your tenancy, payments and repairs.', steps: tenantDaily },
  ],
};
