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
  top_skills: FreelancerCardSkill[];
  skills_count: number;
  profile_completion: number;
}

export interface FreelancerDetail extends Omit<FreelancerCard, 'top_skills' | 'skills_count' | 'profile_completion'> {
  bio: string | null;
  price_per_project: number | null;
  created_at: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  cover_urls?: CoverUrls | null;
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

export type BriefStatus = 'draft' | 'published' | 'in_review' | 'assigned' | 'completed' | 'cancelled';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

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
  oauth_provider?: OAuthProvider | null;
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
