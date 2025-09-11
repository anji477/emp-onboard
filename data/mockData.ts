import { User, UserRole, Task, TaskStatus, UserDocument, DocumentStatus, CompanyDocument, TrainingModule, TeamMember, Policy, FeedbackSurvey, OnboardingEmployee, ITAsset, AssetStatus, Notification } from '../types';

export const mockUser: User = {
  id: 'u1',
  name: 'Alex Doe',
  email: 'alex.doe@example.com',
  role: UserRole.Employee,
  avatarUrl: 'https://picsum.photos/seed/alex/200',
  manager: 'Jane Smith',
  team: 'Engineering',
  onboardingProgress: 60,
  buddy: {
    name: 'Charlie Brown',
    avatarUrl: 'https://picsum.photos/seed/charlie/200',
    role: 'Senior Software Engineer'
  }
};

export const mockAdmin: User = {
  id: 'a1',
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  role: UserRole.Admin,
  avatarUrl: 'https://picsum.photos/seed/jane/200',
  team: 'Management',
  onboardingProgress: 100
};

export const mockTasks: Task[] = [
  { id: 't1', title: 'Complete your profile information', category: 'General', dueDate: '2024-08-01', status: TaskStatus.Completed },
  { id: 't2', title: 'Upload required documents', category: 'Paperwork', dueDate: '2024-08-02', status: TaskStatus.InProgress },
  { id: 't3', title: 'Set up your development environment', category: 'IT Setup', dueDate: '2024-08-05', status: TaskStatus.ToDo },
  { id: 't4', title: 'Complete "Welcome to the Team" training', category: 'Training', dueDate: '2024-08-07', status: TaskStatus.ToDo },
  { id: 't5', title: 'Schedule a 1:1 with your manager', category: 'Meetings', dueDate: '2024-08-03', status: TaskStatus.Completed },
  { id: 't6', title: 'Read the Code of Conduct policy', category: 'Policies', dueDate: '2024-08-01', status: TaskStatus.InProgress },
];

export const mockUserDocuments: UserDocument[] = [
  { id: 'ud1', name: 'Identification (ID/Passport)', status: DocumentStatus.Verified, actionDate: '2024-07-28' },
  { id: 'ud2', name: 'Signed Offer Letter', status: DocumentStatus.Uploaded, actionDate: '2024-07-29' },
  { id: 'ud3', name: 'Educational Certificates', status: DocumentStatus.Pending },
  { id: 'ud4', name: 'Bank Account Details', status: DocumentStatus.Rejected, actionDate: '2024-07-30', rejectionReason: 'The provided bank statement is blurry. Please upload a clearer copy.' },
];

export const mockCompanyDocuments: CompanyDocument[] = [
  { id: 'cd1', name: 'Employee Handbook', category: 'HR', url: '#' },
  { id: 'cd2', name: 'IT Security Policy', category: 'IT', url: '#' },
  { id: 'cd3', name: 'Health Insurance Plan', category: 'Benefits', url: '#' },
];

export const mockTrainingModules: TrainingModule[] = [
  { id: 'tm1', title: 'Welcome to the Team: Company Culture', type: 'Video', duration: '45 mins', completed: true, thumbnailUrl: 'https://picsum.photos/seed/training1/400/225' },
  { id: 'tm2', title: 'Understanding Our Product Suite', type: 'Video', duration: '1.5 hours', completed: false, thumbnailUrl: 'https://picsum.photos/seed/training2/400/225' },
  { id: 'tm3', title: 'IT Security & Best Practices', type: 'PDF', duration: '30 mins', completed: false, thumbnailUrl: 'https://picsum.photos/seed/training3/400/225' },
  { id: 'tm4', title: 'Knowledge Check: Security', type: 'Quiz', duration: '15 mins', completed: false, thumbnailUrl: 'https://picsum.photos/seed/training4/400/225' },
];

export const mockTeamMembers: TeamMember[] = [
  { id: 'tmbr1', name: 'Jane Smith', role: 'Engineering Manager', avatarUrl: 'https://picsum.photos/seed/jane/200', email: 'jane.smith@example.com' },
  { id: 'tmbr2', name: 'Charlie Brown', role: 'Senior Software Engineer', avatarUrl: 'https://picsum.photos/seed/charlie/200', email: 'charlie.brown@example.com' },
  { id: 'tmbr3', name: 'David Lee', role: 'Frontend Developer', avatarUrl: 'https://picsum.photos/seed/david/200', email: 'david.lee@example.com' },
  { id: 'tmbr4', name: 'Emily White', role: 'Backend Developer', avatarUrl: 'https://picsum.photos/seed/emily/200', email: 'emily.white@example.com' },
];

export const mockPolicies: Policy[] = [
  { id: 'p1', title: 'Code of Conduct', category: 'HR', summary: 'Our principles on professional conduct and respect in the workplace.', content: 'Full text of the code of conduct...' },
  { id: 'p2', title: 'Work From Home Policy', category: 'Operations', summary: 'Guidelines and expectations for remote work.', content: 'Full text of the WFH policy...' },
  { id: 'p3', title: 'Data Security Policy', category: 'IT', summary: 'Rules for handling sensitive company and customer data.', content: 'Full text of the data security policy...' },
  { id: 'p4', title: 'Expense Reimbursement', category: 'Finance', summary: 'How to claim reimbursement for business-related expenses.', content: 'Full text of the expense policy...' },
];

export const mockFeedbackSurveys: FeedbackSurvey[] = [
  { id: 'fs1', title: 'First Day Check-in', timeline: 'Day 1', completed: true },
  { id: 'fs2', title: 'End of First Week Feedback', timeline: 'Week 1', completed: false },
  { id: 'fs3', title: 'One Month Review', timeline: 'Month 1', completed: false },
  { id: 'fs4', title: '90-Day Onboarding Survey', timeline: '90 Days', completed: false },
];

export const mockAdminOnboardingData: OnboardingEmployee[] = [
    { id: 'e1', name: 'Alex Doe', avatarUrl: 'https://picsum.photos/seed/alex/200', role: 'Software Engineer', startDate: '2024-07-30', progress: 60, status: 'On Track' },
    { id: 'e2', name: 'Brenda Chen', avatarUrl: 'https://picsum.photos/seed/brenda/200', role: 'UX Designer', startDate: '2024-07-29', progress: 95, status: 'Completed' },
    { id: 'e3', name: 'Carl Johnson', avatarUrl: 'https://picsum.photos/seed/carl/200', role: 'Data Analyst', startDate: '2024-08-01', progress: 25, status: 'Delayed' },
    { id: 'e4', name: 'Diana Prince', avatarUrl: 'https://picsum.photos/seed/diana/200', role: 'Product Manager', startDate: '2024-07-30', progress: 75, status: 'On Track' },
];

export const mockUserAssets: ITAsset[] = [
  { 
    id: 'asset1', 
    name: 'MacBook Pro 14"', 
    type: 'Hardware', 
    serialNumber: 'C02F1234ABCD', 
    assignedDate: '2024-07-30', 
    status: AssetStatus.Assigned,
    purchaseDate: '2024-07-25',
    warrantyInfo: 'Expires 2027-07-24',
    location: 'Remote - San Francisco, CA',
    assignedTo: 'Alex Doe'
  },
  { 
    id: 'asset2', 
    name: 'Dell 27" Monitor', 
    type: 'Hardware', 
    serialNumber: 'SN-5678-9012', 
    assignedDate: '2024-07-30', 
    status: AssetStatus.Assigned,
    purchaseDate: '2024-07-20',
    warrantyInfo: 'Expires 2026-07-19',
    location: 'Remote - San Francisco, CA',
    assignedTo: 'Alex Doe'
  },
  { 
    id: 'asset3', 
    name: 'Figma License', 
    type: 'Software', 
    serialNumber: 'FIG-PRO-ALEXD', 
    assignedDate: '2024-08-01', 
    status: AssetStatus.Assigned,
    licenseExpiry: '2025-08-01',
    assignedTo: 'Alex Doe'
  },
  { 
    id: 'asset4', 
    name: 'Jira Access', 
    type: 'Software', 
    serialNumber: 'JIRA-ALEXD', 
    assignedDate: '2024-08-01', 
    status: AssetStatus.Assigned,
    licenseExpiry: 'Perpetual',
    assignedTo: 'Alex Doe'
  },
];


export const mockAllAssets: ITAsset[] = [
  ...mockUserAssets,
  { 
    id: 'asset5', 
    name: 'MacBook Pro 16"', 
    type: 'Hardware', 
    serialNumber: 'C02G5678EFGH', 
    assignedDate: '2024-07-29', 
    status: AssetStatus.Assigned,
    purchaseDate: '2024-07-20',
    warrantyInfo: 'Expires 2027-07-19',
    location: 'Office - New York',
    assignedTo: 'Brenda Chen'
  },
  { 
    id: 'asset6', 
    name: 'Adobe Creative Cloud', 
    type: 'Software', 
    serialNumber: 'ADB-CC-BRENDAC', 
    assignedDate: '2024-07-29', 
    status: AssetStatus.Assigned,
    licenseExpiry: '2025-07-29',
    assignedTo: 'Brenda Chen'
  },
  { 
    id: 'asset7', 
    name: 'Lenovo ThinkPad X1', 
    type: 'Hardware', 
    serialNumber: 'LEN-X1-98765', 
    assignedDate: '2024-08-01', 
    status: AssetStatus.Assigned,
    purchaseDate: '2024-07-28',
    warrantyInfo: 'Expires 2027-07-27',
    location: 'Remote - Chicago, IL',
    assignedTo: 'Carl Johnson'
  },
  {
    id: 'asset8',
    name: 'iPhone 15',
    type: 'Hardware',
    serialNumber: 'IP15-STOCK-01',
    assignedDate: '',
    status: AssetStatus.Unassigned,
    purchaseDate: '2024-07-15',
    warrantyInfo: 'Expires 2026-07-14',
    location: 'IT Storage',
    assignedTo: undefined
  },
  {
    id: 'asset9',
    name: 'Microsoft 365 License',
    type: 'Software',
    serialNumber: 'M365-UNASSIGNED-12',
    assignedDate: '',
    status: AssetStatus.Unassigned,
    licenseExpiry: '2025-09-01',
    assignedTo: undefined
  },
   {
    id: 'asset10',
    name: 'Logitech MX Master 3',
    type: 'Hardware',
    serialNumber: 'LOGI-MX-456',
    assignedDate: '2023-01-15',
    status: AssetStatus.Returned,
    purchaseDate: '2022-12-20',
    location: 'IT Storage',
    assignedTo: 'Diana Prince'
  }
];

export const mockEmployeesForAssignment = [
    { id: 'u1', name: 'Alex Doe' },
    { id: 'e2', name: 'Brenda Chen' },
    { id: 'e3', name: 'Carl Johnson' },
    { id: 'e4', name: 'Diana Prince' },
];

export const mockNotifications: Notification[] = [
  { id: 'n1', message: 'Your IT assets have been assigned.', timestamp: '2 hours ago', read: false },
  { id: 'n2', message: 'Document "Identification" was verified by HR.', timestamp: '1 day ago', read: false },
  { id: 'n3', message: 'Welcome to the team! Complete your profile to get started.', timestamp: '3 days ago', read: true },
  { id: 'n4', message: 'A new training module "Data Security" has been assigned to you.', timestamp: '4 days ago', read: true },
  { id: 'n5', message: 'Reminder: Your task "Set up your development environment" is due tomorrow.', timestamp: '8 hours ago', read: false },
];