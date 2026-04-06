export type UserRole = 'admin' | 'doctor'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  quiz_completed: boolean
  quiz_score: number | null
  created_at: string
}

export interface Class {
  id: string
  title: string
  description: string
  video_url: string
  video_type: 'youtube' | 'vimeo'
  category: string
  duration_minutes: number | null
  created_at: string
  created_by: string
}

export interface Notification {
  id: string
  title: string
  message: string
  created_at: string
  created_by: string
  created_by_name?: string
}

export interface NotificationRead {
  notification_id: string
  user_id: string
  read_at: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct_answer: number
  order_index: number
}

export interface QuizAttempt {
  id: string
  user_id: string
  score: number
  answers: number[]
  passed: boolean
  completed_at: string
}
