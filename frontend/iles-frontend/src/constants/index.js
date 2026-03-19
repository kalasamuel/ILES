// User Roles
export const ROLES = {
  STUDENT: 'student',
  WORKPLACE_SUPERVISOR: 'workplace_supervisor',
  ACADEMIC_SUPERVISOR: 'academic_supervisor',
  ADMIN: 'admin',
};

// Placement Statuses
export const PLACEMENT_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
};

// Log Statuses
export const LOG_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEWED: 'reviewed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Review Statuses
export const REVIEW_STATUSES = {
  APPROVED: 'approved',
  NEEDS_REVISION: 'needs_revision',
  REJECTED: 'rejected',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  LOG_REVIEW_PENDING: 'log_review_pending',
  SUBMISSION_DEADLINE: 'submission_deadline',
  EVALUATION_COMPLETED: 'evaluation_completed',
  PLACEMENT_APPROVED: 'placement_approved',
  PLACEMENT_REJECTED: 'placement_rejected',
};