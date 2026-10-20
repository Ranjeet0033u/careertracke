export type ApplicationType = 'Job' | 'Internship';

export type ApplicationStatus =
  | 'Applied'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Offered'
  | 'Rejected';

export type InterviewRound = 'Aptitude' | 'Technical' | 'HR' | 'Coding Assessment' | 'Managerial';

export type InterviewResult = 'Pending' | 'Cleared' | 'Rejected';

export type OfferStatus = 'Pending' | 'Accepted' | 'Rejected';

export interface Company {
  id: number;
  name: string;
  location: string;
  roleOffered: string;
  contactEmail: string;
  website?: string;
  notes?: string;
}

export interface Application {
  id: number;
  companyId: number;
  companyName: string;
  role: string;
  type: ApplicationType;
  appliedDate: string; // YYYY-MM-DD
  status: ApplicationStatus;
  followUpDate: string | null; // YYYY-MM-DD or null
  notes?: string;
  salaryOrStipend?: string;
  jobLink?: string;
}

export interface Interview {
  id: number;
  applicationId: number;
  companyName: string;
  role: string;
  interviewDate: string; // YYYY-MM-DD
  round: InterviewRound;
  result: InterviewResult;
  notes?: string;
  locationOrMeetingLink?: string;
}

export interface Offer {
  id: number;
  applicationId: number;
  companyName: string;
  role: string;
  packageLpa: number; // in LPA, e.g. 12.00 or 8.50
  deadline: string; // YYYY-MM-DD
  offerStatus: OfferStatus;
  joiningDate?: string;
  notes?: string;
}

export type NavTab =
  | 'dashboard'
  | 'applications'
  | 'companies'
  | 'interviews'
  | 'followups'
  | 'offers'
  | 'reports'
  | 'syllabus_lab';
