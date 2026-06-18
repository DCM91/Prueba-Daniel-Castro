export type Role = 'client' | 'freelancer' | 'agency' | 'company' | 'admin';
export type RegisterableRole = 'client' | 'freelancer';
export type OAuthProvider = 'google' | 'facebook';
export type SkillLevel = 'junior' | 'mid' | 'senior';

export type SkillCategory = 'photo' | 'video' | 'edit' | 'content';

export interface Skill {
  id: number;
  name: string;
  slug: string;
  category: SkillCategory;
}

export interface FreelancerProfileSkill extends Skill {
  level: SkillLevel | null;
  years_experience: number | null;
}

export interface CoverUrls {
  sm: string | null;
  md: string | null;
  lg: string | null;
  xxl: string | null;
}

export interface PortfolioUrls {
  thumb: string | null;
  card: string | null;
  full: string | null;
}

export interface PortfolioItem {
  id: number;
  public_id: string;
  url: string;
  urls: PortfolioUrls;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  title: string | null;
  description: string | null;
  position: number;
  created_at: string | null;
}

export interface FreelancerProfile {
  id: number;
  user_id: number;
  display_name: string | null;
  bio: string | null;
  city: string | null;
  hourly_rate: number | null;
  price_per_project: number | null;
  is_available: boolean;
  cover_url?: string | null;
  cover_urls?: CoverUrls | null;
  skills: FreelancerProfileSkill[];
  portfolios?: PortfolioItem[];
  onboarding_completed_at?: string | null;
}

export interface FreelancerSkillInput {
  skill_id: number;
  level: SkillLevel;
  years_experience: number;
}

export interface FreelancerCardSkill {
  id: number;
  name: string;
  slug: string;
  category: SkillCategory;
  level: SkillLevel | null;
}

export interface FreelancerCard {
  id: number;
  user_id: number;
  display_name: string | null;
  avatar_url?: string | null;
  city: string | null;
  hourly_rate: number | null;
  is_available: boolean;
  rating?: ReviewRating;
  top_skills: FreelancerCardSkill[];
  skills_count: number;
  profile_completion: number;
}

export interface FreelancerDetail extends Omit<
  FreelancerCard,
  'top_skills' | 'skills_count' | 'profile_completion'
> {
  bio: string | null;
  price_per_project: number | null;
  created_at: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  cover_urls?: CoverUrls | null;
  rating?: ReviewRating;
  skills: FreelancerProfileSkill[];
  portfolios?: PortfolioItem[];
}

export interface FreelancerSearchFilters {
  q?: string;
  category?: SkillCategory;
  city?: string;
  max_rate?: number;
  page?: number;
  sort?: FreelancerSearchSort;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export type BriefStatus =
  | 'draft'
  | 'published'
  | 'in_review'
  | 'assigned'
  | 'completed'
  | 'cancelled';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface BriefAttachment {
  id: number;
  brief_id: number;
  public_id: string;
  url: string;
  urls: { thumb: string | null; card: string | null; full: string | null };
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  title: string | null;
  position: number;
  created_at: string | null;
}

export interface Brief {
  id: number;
  client_id: number;
  title: string;
  description: string;
  category: SkillCategory;
  city: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: BriefStatus;
  published_at: string | null;
  created_at: string | null;
  proposals_count?: number;
  client?: { id: number; name: string } | null;
  attachments?: BriefAttachment[];
}

export interface BriefAttachmentInput {
  public_id: string;
  url: string;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  bytes?: number | null;
  title: string;
}

export interface BriefInput {
  title: string;
  description: string;
  category: SkillCategory;
  city?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  deadline?: string | null;
}

export interface ProposalFreelancer {
  id: number;
  user_id: number;
  display_name: string | null;
  city: string | null;
  hourly_rate: number | null;
}

export interface Proposal {
  id: number;
  brief_id: number;
  freelancer_id: number;
  message: string;
  price: number;
  status: ProposalStatus;
  created_at: string | null;
  freelancer?: ProposalFreelancer | null;
}

export interface ProposalInput {
  message: string;
  price: number;
}

export interface AvatarUrls {
  xs: string | null;
  sm: string | null;
  md: string | null;
  lg: string | null;
  xxl: string | null;
}

export interface OAuthIdentity {
  id: number;
  provider: OAuthProvider;
  provider_label: string;
  provider_email: string | null;
  linked_at: string | null;
  last_used_at: string | null;
  token_expires_at: string | null;
  has_refresh_token: boolean;
}

export interface ReviewRating {
  count: number;
  average: number | null;
}

export interface Review {
  id: number;
  brief_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  comment: string | null;
  created_at: string | null;
  updated_at: string | null;
  reviewer?: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
  reviewee?: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
  brief?: {
    id: number;
    title: string;
  };
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  read_at: string | null;
  created_at: string | null;
  sender?: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
}

export interface Conversation {
  id: number;
  brief_id: number;
  client_id: number;
  freelancer_id: number;
  last_message_at: string | null;
  created_at: string | null;
  unread_count?: number;
  brief?: {
    id: number;
    title: string;
    status: BriefStatus;
  };
  client?: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
  freelancer?: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
  latest_message?: ChatMessage | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  role: Role;
  created_at: string | null;
  avatar_url?: string | null;
  avatar_urls?: AvatarUrls | null;
  has_password?: boolean;
  oauth_only?: boolean;
  oauth_identities?: OAuthIdentity[];
  freelancer_profile?: FreelancerProfile | null;
}

export interface AuthPayload {
  user: User;
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: RegisterableRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type FreelancerSearchSort = 'featured' | 'price_asc' | 'price_desc' | 'recent';

export interface UpdateAccountPayload {
  name?: string;
  email?: string;
  phone?: string | null;
  city?: string | null;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
