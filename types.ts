export enum UserRole {
  Employee = 'Employee',
  Manager = 'Manager',
  HR = 'HR',
  Admin = 'Admin',
  IT = 'IT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  Verified = 'Verified',
  Rejected = 'Rejected'
}

export interface UserDocument {
  id: string;
  name: string;
  status: DocumentStatus;
  actionDate?: string;
  rejectionReason?: string;
}

export interface CompanyDocument {
  id: string;
  name: string;
  category: string;
  url: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  type: 'Video' | 'PDF' | 'Quiz';
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
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
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
  id: string;
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