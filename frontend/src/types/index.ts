// User and Authentication Types
export interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: Role;
  department?: Department;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
}

export interface Role {
  role_id: string;
  role_name: string;
}

export interface Department {
  department_id: string;
  department_name: string;
  faculty: string;
  university: string;
}

export interface Student {
  student_id: string;
  user: User;
  registration_number: string;
  program: string;
  year_of_study: number;
  expected_graduation: string;
}

export interface Supervisor {
  supervisor_id: string;
  user: User;
  supervisor_type: 'workplace' | 'academic';
  organization?: Organization;
  department?: Department;
}

// Organization Types
export interface Organization {
  organization_id: string;
  name: string;
  industry: string;
  address: string;
  city: string;
  country: string;
  contact_email: string;
  contact_phone: string;
}

// Placement Types
export interface InternshipPlacement {
  placement_id: string;
  student: Student;
  organization: Organization;
  workplace_supervisor: Supervisor;
  academic_supervisor: Supervisor;
  start_date: string;
  end_date: string;
  position_title: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
}

export interface PlacementDocument {
  document_id: string;
  placement: string;
  document_type: 'introduction_letter' | 'acceptance_letter' | 'contract';
  file_url: string;
  uploaded_at: string;
}

// Logbook Types
export interface WeeklyLog {
  log_id: string;
  placement: InternshipPlacement;
  week_number: number;
  start_date: string;
  end_date: string;
  activities_performed: string;
  skills_learned: string;
  challenges: string;
  solutions: string;
  hours_worked: number;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected';
  submitted_at?: string;
}

export interface LogAttachment {
  attachment_id: string;
  log: string;
  file_url: string;
  description?: string;
  uploaded_at: string;
}

// Review Types
export interface LogReview {
  review_id: string;
  log: WeeklyLog;
  supervisor: Supervisor;
  comments: string;
  rating?: number;
  status: 'approved' | 'needs_revision' | 'rejected';
  reviewed_at: string;
}

export interface WorkflowHistory {
  history_id: string;
  entity_type: string;
  entity_id: string;
  previous_status?: string;
  new_status: string;
  changed_by: User;
  changed_at: string;
}

// Evaluation Types
export interface EvaluationCriteria {
  criteria_id: string;
  name: string;
  description: string;
  weight_percentage: number;
  max_score: number;
}

export interface Evaluation {
  evaluation_id: string;
  placement: InternshipPlacement;
  evaluator: Supervisor;
  evaluation_date: string;
  total_score?: number;
  grade?: string;
  comments?: string;
}

export interface EvaluationScore {
  score_id: string;
  evaluation: string;
  criteria: EvaluationCriteria;
  score: number;
}

export interface ScoreBreakdown {
  score_id: string;
  placement: InternshipPlacement;
  supervisor_score?: number;
  academic_score?: number;
  logbook_score?: number;
  final_score?: number;
  grade?: string;
  calculated_at: string;
}

// Notification Types
export interface Notification {
  notification_id: string;
  user: User;
  message: string;
  notification_type: 'log_review_pending' | 'submission_deadline' | 'evaluation_completed' | 'placement_approved' | 'placement_rejected';
  is_read: boolean;
  created_at: string;
}

export interface Deadline {
  deadline_id: string;
  week_number: number;
  submission_deadline: string;
}

// Dashboard Types
export interface DashboardMetric {
  metric_id: string;
  metric_type: 'internships_completed' | 'average_score' | 'pending_reviews' | 'total_students' | 'active_placements';
  value: number;
  calculated_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface WeeklyLogForm {
  activities_performed: string;
  skills_learned: string;
  challenges: string;
  solutions: string;
  hours_worked: number;
}

export interface WeeklyLogCreateUpdate {
  placement: string; // placement_id as string
  week_number: number;
  start_date: string;
  end_date: string;
  activities_performed: string;
  skills_learned: string;
  challenges: string;
  solutions: string;
  hours_worked: number;
}

// Auth Context Types
export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}