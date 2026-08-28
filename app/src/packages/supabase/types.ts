export type AccountType = 'admin' | 'specialist' | 'student' | 'member';

export type AccountStatus = 'active' | 'inactive' | 'invited';

export type ServiceType = 'personal_training' | 'nutrition_consulting';

// ---------------------------------------------------------------------------
// Stubs temporários — remover ao migrar cada módulo
// ---------------------------------------------------------------------------

/** @deprecated migrar para ServiceType */
export type ServiceCategory = ServiceType;

/** @deprecated chat module pendente */
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'file';
  media_url?: string;
  read_at?: string;
  created_at: string;
}

/** @deprecated chat module pendente */
export interface ConversationWithDetails {
  id: string;
  specialist_id: string;
  student_id: string;
  last_message_at: string;
  created_at: string;
  other_user?: { id: string; full_name: string; email: string };
  last_message?: ChatMessage;
  unread_count?: number;
}

/** @deprecated workout module pendente */
export interface WorkoutFeedback {
  id: string;
  workout_log_id: string;
  session_id: string;
  student_id: string;
  difficulty_rating?: number;
  energy_level?: number;
  satisfaction_rating?: number;
  mood?: 'great' | 'good' | 'ok' | 'tired' | 'exhausted';
  perceived_exertion?: number;
  notes?: string;
  created_at: string;
}
