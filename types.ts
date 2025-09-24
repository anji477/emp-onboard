export enum UserRole {
  Employee = 'Employee',
  Manager = 'Manager',
  HR = 'HR',
  Admin = 'Admin',
  IT = 'IT'
}

export enum DocumentPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  availableRoles?: UserRole[];
  avatarUrl: string;
  manager?: string;
  team?: string;
  onboardingProgress: number;
  buddy?: {
    name: string;
    avatarUrl: string;
    role: string;
  };
}

export enum TaskStatus {
  ToDo = 'To Do',
  InProgress = 'In Progress',
  Completed = 'Completed'
}

export interface Task {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  status: TaskStatus;
}

export enum DocumentStatus {
  Pending = 'Pending',
  Uploaded = 'Uploaded',
  InReview = 'In Review',
  Verified = 'Verified',
  Rejected = 'Rejected',
  Overdue = 'Overdue',
  Expired = 'Expired'
}

export interface UserDocument {
  id: string;
  name: string;
  status: DocumentStatus;
  actionDate?: string;
  rejectionReason?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  category?: string;
  dueDate?: string;
  isOverdue?: boolean;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  isRequired: boolean;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueInDays?: number;
  fileUrl?: string;
  fileName?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface BulkAssignmentCriteria {
  assignBy: 'individual' | 'department' | 'role' | 'team';
  department?: string;
  role?: UserRole;
  team?: string;
  userIds?: string[];
}

export interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface DocumentStats {
  total: number;
  pending: number;
  uploaded: number;
  verified: number;
  rejected: number;
  overdue: number;
}

export interface CompanyDocument {
  id: string;
  name: string;
  category: string;
  url: string;
  description?: string;
  fileSize?: number;
  uploadedBy?: string;
  uploadedAt?: string;
  version?: string;
  isActive?: boolean;
}

export interface DocumentFilter {
  status: string;
  user: string;
  priority: string;
  dateRange: string;
  category: string;
}

export interface BulkAction {
  action: 'verify' | 'reject' | 'delete' | 'assign';
  documentIds: string[];
  reason?: string;
  userIds?: string[];
}

export interface TrainingModule {
  id: string;
  title: string;
  type: 'Video' | 'PDF' | 'DOC' | 'PPT' | 'Quiz';
  duration: string;
  completed: boolean;
  thumbnailUrl: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  email: string;
}

export interface Policy {
  id: number;
  title: string;
  category: string;
  summary: string;
  content: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  version?: string;
  effective_date?: string;
  created_by?: number;
  updated_at?: string;
  created_at?: string;
}

export interface FeedbackSurvey {
  id: string;
  title: string;
  timeline: 'Day 1' | 'Week 1' | 'Month 1' | '90 Days';
  completed: boolean;
}

export interface OnboardingEmployee {
  id: string;
  name: string;
  avatarUrl: string;
  role: string;
  startDate: string;
  progress: number;
  status: 'On Track' | 'Delayed' | 'Completed';
}

export enum AssetStatus {
  Assigned = 'Assigned',
  PendingReturn = 'Pending Return',
  Returned = 'Returned',
  Unassigned = 'Unassigned'
}

export interface ITAsset {
  id: number;
  name: string;
  type: 'Hardware' | 'Software';
  serialNumber: string;
  assignedDate: string;
  status: AssetStatus;
  purchaseDate?: string;
  warrantyInfo?: string;
  location?: string;
  licenseExpiry?: string;
  assignedTo?: string;
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface DocumentWorkflow {
  id: string;
  name: string;
  steps: DocumentWorkflowStep[];
  isActive: boolean;
}

export interface DocumentWorkflowStep {
  id: string;
  name: string;
  order: number;
  assignedRole: UserRole;
  autoApprove?: boolean;
  dueInDays?: number;
}