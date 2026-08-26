// User types
export interface User {
  id: number
  email: string
  full_name: string
  created_at: string
}

export interface AuthTokens {
  access_token: string
  token_type: string
}

// Resume types
export interface Resume {
  id: number
  filename: string
  file_type: string
  uploaded_at: string
}

// Review types
export interface Improvement {
  section: string
  issue: string
  suggestion: string
}

export interface Review {
  review_id: number
  resume_id: number
  ats_score: number
  overall_feedback: string
  skill_gaps: string[]
  improvements: Improvement[]
  keywords_missing: string[]
  strengths: string[]
  created_at: string
}

// API response types
export interface ApiError {
  detail: string
}
