export type ProfileRole = 'user' | 'admin' | 'super_admin';

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  organization_id: string;
  role: ProfileRole;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
}

// Type for registration response
export interface RegistrationResult {
  status: 'success';
  user_id: string;
  organization_id: string;
  email: string;
  organization_name: string;
  role: ProfileRole;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  organization_id: string | null;
  organization?: Organization;
  role: ProfileRole;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  force_password_change?: boolean;
  created_by?: string | null;
}

export interface QuizCategory {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  category_id: string;
  organization_id: string;
  passing_score: number;
  time_limit: number | null;
  created_at: string;
  updated_at: string;
  category?: QuizCategory;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  choices: string[];
  correct_answer: number;
  explanation: string | null;
  points: number;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  passed: boolean;
  completed_at: string | null;
  answers: Record<string, number>;
  created_at: string;
  updated_at: string;
  quiz?: Quiz;
}

export interface StudyMaterial {
  id: string;
  title: string;
  content: string;
  category_id: string;
  organization_id: string;
  order: number;
  created_at: string;
  updated_at: string;
  category?: QuizCategory;
}

// For Supabase Database Types
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organization, 'id'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      quiz_categories: {
        Row: QuizCategory;
        Insert: Omit<QuizCategory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<QuizCategory, 'id'>>;
      };
      quizzes: {
        Row: Quiz;
        Insert: Omit<Quiz, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Quiz, 'id'>>;
      };
      questions: {
        Row: Question;
        Insert: Omit<Question, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Question, 'id'>>;
      };
      quiz_attempts: {
        Row: QuizAttempt;
        Insert: Omit<QuizAttempt, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<QuizAttempt, 'id'>>;
      };
      study_materials: {
        Row: StudyMaterial;
        Insert: Omit<StudyMaterial, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<StudyMaterial, 'id'>>;
      };
      invitations: {
        Row: Invitation;
        Insert: Omit<
          Invitation,
          'id' | 'created_at' | 'updated_at' | 'token' | 'expires_at' | 'accepted_at'
        >;
        Update: Partial<Omit<Invitation, 'id' | 'token'>>;
      };
    };
    Views: {};
    Functions: {
      complete_user_registration: {
        Args: {
          p_user_id: string;
          p_email: string;
          p_organization_name: string;
        };
        Returns: {
          user_id: string;
          organization_id: string;
          email: string;
          organization_name: string;
          role: ProfileRole;
          created_at: string;
          status: string;
        };
      };
      is_admin: {
        Args: { user_id: string };
        Returns: boolean;
      };
      create_invitation: {
        Args: {
          p_email: string;
          p_organization_id: string;
          p_role: ProfileRole;
        };
        Returns: {
          success: boolean;
          invitation: {
            token: string;
            email: string;
            organization_id: string;
            role: string;
          };
        };
      };
      check_invitation_token: {
        Args: { p_token: string };
        Returns: {
          valid: boolean;
          invitation: Invitation | null;
        };
      };
      accept_invitation: {
        Args: { p_token: string };
        Returns: {
          success: boolean;
          organization_id: string;
          role: ProfileRole;
        };
      };
    };
    Enums: {
      user_role: ProfileRole;
    };
  };
}
