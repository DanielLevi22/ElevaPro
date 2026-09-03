export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      achievements: {
        Row: {
          description: string | null;
          earned_at: string;
          icon: string | null;
          id: string;
          points: number;
          student_id: string;
          title: string;
          type: string;
        };
        Insert: {
          description?: string | null;
          earned_at?: string;
          icon?: string | null;
          id?: string;
          points?: number;
          student_id: string;
          title: string;
          type: string;
        };
        Update: {
          description?: string | null;
          earned_at?: string;
          icon?: string | null;
          id?: string;
          points?: number;
          student_id?: string;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "achievements_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_chat_messages: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          metadata: Json | null;
          role: string;
          session_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          role: string;
          session_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          role?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "ai_chat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_chat_sessions: {
        Row: {
          archived_at: string | null;
          created_at: string | null;
          id: string;
          module: string;
          specialist_id: string | null;
          state: Json | null;
          student_id: string;
          title: string | null;
          updated_at: string | null;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string | null;
          id?: string;
          module?: string;
          specialist_id?: string | null;
          state?: Json | null;
          student_id: string;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string | null;
          id?: string;
          module?: string;
          specialist_id?: string | null;
          state?: Json | null;
          student_id?: string;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_chat_sessions_specialist_id_fkey";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_chat_sessions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      body_scans: {
        Row: {
          axis_deviation_cm: number | null;
          bmi: number | null;
          body_fat_pct: number | null;
          circ_arms: number | null;
          circ_calves: number | null;
          circ_chest: number | null;
          circ_hips: number | null;
          circ_neck: number | null;
          circ_shoulders: number | null;
          circ_thighs: number | null;
          circ_waist: number | null;
          created_at: string;
          framing_camera: string | null;
          framing_confirmed: boolean | null;
          framing_level_sensor: boolean | null;
          framing_mark_bottom: number | null;
          framing_mark_top: number | null;
          framing_pitch: number | null;
          framing_roll: number | null;
          height_cm: number | null;
          hip_drop_cm: number | null;
          hip_tilt_deg: number | null;
          id: string;
          lean_mass_kg: number | null;
          plumb_hip_cm: number | null;
          plumb_knee_cm: number | null;
          plumb_shoulder_cm: number | null;
          posture_feedback: Json | null;
          posture_muscle_score: number | null;
          posture_overall_score: number | null;
          posture_symmetry_score: number | null;
          px_per_cm_back: number | null;
          px_per_cm_front: number | null;
          px_per_cm_side: number | null;
          quality_backlit: boolean | null;
          quality_blown_out: boolean | null;
          quality_low_light: boolean | null;
          recommendations: string | null;
          scale_source: Database["public"]["Enums"]["scale_source"] | null;
          scanned_at: string;
          shoulder_drop_cm: number | null;
          shoulder_tilt_deg: number | null;
          student_id: string;
          trunk_rotated: boolean | null;
          weight_kg: number | null;
        };
        Insert: {
          axis_deviation_cm?: number | null;
          bmi?: number | null;
          body_fat_pct?: number | null;
          circ_arms?: number | null;
          circ_calves?: number | null;
          circ_chest?: number | null;
          circ_hips?: number | null;
          circ_neck?: number | null;
          circ_shoulders?: number | null;
          circ_thighs?: number | null;
          circ_waist?: number | null;
          created_at?: string;
          framing_camera?: string | null;
          framing_confirmed?: boolean | null;
          framing_level_sensor?: boolean | null;
          framing_mark_bottom?: number | null;
          framing_mark_top?: number | null;
          framing_pitch?: number | null;
          framing_roll?: number | null;
          height_cm?: number | null;
          hip_drop_cm?: number | null;
          hip_tilt_deg?: number | null;
          id?: string;
          lean_mass_kg?: number | null;
          plumb_hip_cm?: number | null;
          plumb_knee_cm?: number | null;
          plumb_shoulder_cm?: number | null;
          posture_feedback?: Json | null;
          posture_muscle_score?: number | null;
          posture_overall_score?: number | null;
          posture_symmetry_score?: number | null;
          px_per_cm_back?: number | null;
          px_per_cm_front?: number | null;
          px_per_cm_side?: number | null;
          quality_backlit?: boolean | null;
          quality_blown_out?: boolean | null;
          quality_low_light?: boolean | null;
          recommendations?: string | null;
          scale_source?: Database["public"]["Enums"]["scale_source"] | null;
          scanned_at?: string;
          shoulder_drop_cm?: number | null;
          shoulder_tilt_deg?: number | null;
          student_id: string;
          trunk_rotated?: boolean | null;
          weight_kg?: number | null;
        };
        Update: {
          axis_deviation_cm?: number | null;
          bmi?: number | null;
          body_fat_pct?: number | null;
          circ_arms?: number | null;
          circ_calves?: number | null;
          circ_chest?: number | null;
          circ_hips?: number | null;
          circ_neck?: number | null;
          circ_shoulders?: number | null;
          circ_thighs?: number | null;
          circ_waist?: number | null;
          created_at?: string;
          framing_camera?: string | null;
          framing_confirmed?: boolean | null;
          framing_level_sensor?: boolean | null;
          framing_mark_bottom?: number | null;
          framing_mark_top?: number | null;
          framing_pitch?: number | null;
          framing_roll?: number | null;
          height_cm?: number | null;
          hip_drop_cm?: number | null;
          hip_tilt_deg?: number | null;
          id?: string;
          lean_mass_kg?: number | null;
          plumb_hip_cm?: number | null;
          plumb_knee_cm?: number | null;
          plumb_shoulder_cm?: number | null;
          posture_feedback?: Json | null;
          posture_muscle_score?: number | null;
          posture_overall_score?: number | null;
          posture_symmetry_score?: number | null;
          px_per_cm_back?: number | null;
          px_per_cm_front?: number | null;
          px_per_cm_side?: number | null;
          quality_backlit?: boolean | null;
          quality_blown_out?: boolean | null;
          quality_low_light?: boolean | null;
          recommendations?: string | null;
          scale_source?: Database["public"]["Enums"]["scale_source"] | null;
          scanned_at?: string;
          shoulder_drop_cm?: number | null;
          shoulder_tilt_deg?: number | null;
          student_id?: string;
          trunk_rotated?: boolean | null;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "body_scans_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_goals: {
        Row: {
          completed: boolean;
          completion_percentage: number;
          created_at: string;
          date: string;
          id: string;
          meals_completed: number;
          meals_target: number;
          student_id: string;
          workout_completed: number;
          workout_target: number;
        };
        Insert: {
          completed?: boolean;
          completion_percentage?: number;
          created_at?: string;
          date: string;
          id?: string;
          meals_completed?: number;
          meals_target?: number;
          student_id: string;
          workout_completed?: number;
          workout_target?: number;
        };
        Update: {
          completed?: boolean;
          completion_percentage?: number;
          created_at?: string;
          date?: string;
          id?: string;
          meals_completed?: number;
          meals_target?: number;
          student_id?: string;
          workout_completed?: number;
          workout_target?: number;
        };
        Relationships: [
          {
            foreignKeyName: "daily_goals_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      diet_meal_items: {
        Row: {
          created_at: string;
          diet_meal_id: string;
          food_id: string;
          id: string;
          order_index: number;
          quantity: number;
          unit: string;
        };
        Insert: {
          created_at?: string;
          diet_meal_id: string;
          food_id: string;
          id?: string;
          order_index?: number;
          quantity: number;
          unit: string;
        };
        Update: {
          created_at?: string;
          diet_meal_id?: string;
          food_id?: string;
          id?: string;
          order_index?: number;
          quantity?: number;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diet_meal_items_diet_meal_id_diet_meals_id_fk";
            columns: ["diet_meal_id"];
            isOneToOne: false;
            referencedRelation: "diet_meals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diet_meal_items_food_id_foods_id_fk";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      diet_meals: {
        Row: {
          created_at: string;
          day_of_week: number | null;
          diet_plan_id: string;
          id: string;
          meal_order: number;
          meal_time: string | null;
          meal_type: string | null;
          name: string;
          target_calories: number | null;
        };
        Insert: {
          created_at?: string;
          day_of_week?: number | null;
          diet_plan_id: string;
          id?: string;
          meal_order?: number;
          meal_time?: string | null;
          meal_type?: string | null;
          name: string;
          target_calories?: number | null;
        };
        Update: {
          created_at?: string;
          day_of_week?: number | null;
          diet_plan_id?: string;
          id?: string;
          meal_order?: number;
          meal_time?: string | null;
          meal_type?: string | null;
          name?: string;
          target_calories?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "diet_meals_diet_plan_id_diet_plans_id_fk";
            columns: ["diet_plan_id"];
            isOneToOne: false;
            referencedRelation: "diet_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      diet_plans: {
        Row: {
          created_at: string;
          end_date: string;
          id: string;
          name: string | null;
          notes: string | null;
          plan_type: Database["public"]["Enums"]["diet_plan_type"];
          specialist_id: string | null;
          start_date: string;
          status: Database["public"]["Enums"]["diet_plan_status"];
          student_id: string;
          target_calories: number | null;
          target_carbs: number | null;
          target_fat: number | null;
          target_protein: number | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          id?: string;
          name?: string | null;
          notes?: string | null;
          plan_type?: Database["public"]["Enums"]["diet_plan_type"];
          specialist_id?: string | null;
          start_date: string;
          status?: Database["public"]["Enums"]["diet_plan_status"];
          student_id: string;
          target_calories?: number | null;
          target_carbs?: number | null;
          target_fat?: number | null;
          target_protein?: number | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          id?: string;
          name?: string | null;
          notes?: string | null;
          plan_type?: Database["public"]["Enums"]["diet_plan_type"];
          specialist_id?: string | null;
          start_date?: string;
          status?: Database["public"]["Enums"]["diet_plan_status"];
          student_id?: string;
          target_calories?: number | null;
          target_carbs?: number | null;
          target_fat?: number | null;
          target_protein?: number | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "diet_plans_specialist_id_profiles_id_fk";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diet_plans_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_verified: boolean;
          muscle_group: string | null;
          name: string;
          video_url: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_verified?: boolean;
          muscle_group?: string | null;
          name: string;
          video_url?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_verified?: boolean;
          muscle_group?: string | null;
          name?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_profiles_id_fk";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      foods: {
        Row: {
          calories: number | null;
          carbs: number | null;
          category: string | null;
          created_at: string;
          created_by: string | null;
          fat: number | null;
          fiber: number | null;
          id: string;
          is_custom: boolean;
          name: string;
          protein: number | null;
          search_vector: unknown;
          serving_size: number;
          serving_unit: string;
          source: string | null;
        };
        Insert: {
          calories?: number | null;
          carbs?: number | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          fat?: number | null;
          fiber?: number | null;
          id?: string;
          is_custom?: boolean;
          name: string;
          protein?: number | null;
          search_vector?: unknown;
          serving_size?: number;
          serving_unit?: string;
          source?: string | null;
        };
        Update: {
          calories?: number | null;
          carbs?: number | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          fat?: number | null;
          fiber?: number | null;
          id?: string;
          is_custom?: boolean;
          name?: string;
          protein?: number | null;
          search_vector?: unknown;
          serving_size?: number;
          serving_unit?: string;
          source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "foods_created_by_profiles_id_fk";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      health_daily_metrics: {
        Row: {
          active_calories: number;
          created_at: string;
          date: string;
          id: string;
          steps: number;
          student_id: string;
          synced_at: string;
        };
        Insert: {
          active_calories?: number;
          created_at?: string;
          date: string;
          id?: string;
          steps?: number;
          student_id: string;
          synced_at?: string;
        };
        Update: {
          active_calories?: number;
          created_at?: string;
          date?: string;
          id?: string;
          steps?: number;
          student_id?: string;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "health_daily_metrics_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_logs: {
        Row: {
          actual_items: Json | null;
          completed: boolean;
          created_at: string;
          diet_meal_id: string | null;
          diet_plan_id: string | null;
          id: string;
          logged_date: string;
          student_id: string;
        };
        Insert: {
          actual_items?: Json | null;
          completed?: boolean;
          created_at?: string;
          diet_meal_id?: string | null;
          diet_plan_id?: string | null;
          id?: string;
          logged_date: string;
          student_id: string;
        };
        Update: {
          actual_items?: Json | null;
          completed?: boolean;
          created_at?: string;
          diet_meal_id?: string | null;
          diet_plan_id?: string | null;
          id?: string;
          logged_date?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_logs_diet_meal_id_diet_meals_id_fk";
            columns: ["diet_meal_id"];
            isOneToOne: false;
            referencedRelation: "diet_meals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_logs_diet_plan_id_diet_plans_id_fk";
            columns: ["diet_plan_id"];
            isOneToOne: false;
            referencedRelation: "diet_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_logs_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      physical_assessments: {
        Row: {
          assessed_at: string;
          body_fat_pct: number | null;
          circ_abdomen: number | null;
          circ_chest: number | null;
          circ_hip: number | null;
          circ_left_arm: number | null;
          circ_left_calf: number | null;
          circ_left_forearm: number | null;
          circ_left_thigh: number | null;
          circ_neck: number | null;
          circ_right_arm: number | null;
          circ_right_calf: number | null;
          circ_right_forearm: number | null;
          circ_right_thigh: number | null;
          circ_shoulder: number | null;
          circ_waist: number | null;
          created_at: string;
          height_cm: number;
          id: string;
          muscle_mass_kg: number | null;
          notes: string | null;
          skinfold_abdomen: number | null;
          skinfold_chest: number | null;
          skinfold_midaxillary: number | null;
          skinfold_subscapular: number | null;
          skinfold_suprailiac: number | null;
          skinfold_thigh: number | null;
          skinfold_tricep: number | null;
          specialist_id: string | null;
          student_id: string;
          weight_kg: number;
        };
        Insert: {
          assessed_at?: string;
          body_fat_pct?: number | null;
          circ_abdomen?: number | null;
          circ_chest?: number | null;
          circ_hip?: number | null;
          circ_left_arm?: number | null;
          circ_left_calf?: number | null;
          circ_left_forearm?: number | null;
          circ_left_thigh?: number | null;
          circ_neck?: number | null;
          circ_right_arm?: number | null;
          circ_right_calf?: number | null;
          circ_right_forearm?: number | null;
          circ_right_thigh?: number | null;
          circ_shoulder?: number | null;
          circ_waist?: number | null;
          created_at?: string;
          height_cm: number;
          id?: string;
          muscle_mass_kg?: number | null;
          notes?: string | null;
          skinfold_abdomen?: number | null;
          skinfold_chest?: number | null;
          skinfold_midaxillary?: number | null;
          skinfold_subscapular?: number | null;
          skinfold_suprailiac?: number | null;
          skinfold_thigh?: number | null;
          skinfold_tricep?: number | null;
          specialist_id?: string | null;
          student_id: string;
          weight_kg: number;
        };
        Update: {
          assessed_at?: string;
          body_fat_pct?: number | null;
          circ_abdomen?: number | null;
          circ_chest?: number | null;
          circ_hip?: number | null;
          circ_left_arm?: number | null;
          circ_left_calf?: number | null;
          circ_left_forearm?: number | null;
          circ_left_thigh?: number | null;
          circ_neck?: number | null;
          circ_right_arm?: number | null;
          circ_right_calf?: number | null;
          circ_right_forearm?: number | null;
          circ_right_thigh?: number | null;
          circ_shoulder?: number | null;
          circ_waist?: number | null;
          created_at?: string;
          height_cm?: number;
          id?: string;
          muscle_mass_kg?: number | null;
          notes?: string | null;
          skinfold_abdomen?: number | null;
          skinfold_chest?: number | null;
          skinfold_midaxillary?: number | null;
          skinfold_subscapular?: number | null;
          skinfold_suprailiac?: number | null;
          skinfold_thigh?: number | null;
          skinfold_tricep?: number | null;
          specialist_id?: string | null;
          student_id?: string;
          weight_kg?: number;
        };
        Relationships: [
          {
            foreignKeyName: "physical_assessments_specialist_id_profiles_id_fk";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "physical_assessments_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"];
          account_type: Database["public"]["Enums"]["account_type"];
          admin_notes: string | null;
          avatar_url: string | null;
          coach_mode: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          persona_track: string | null;
        };
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"];
          account_type: Database["public"]["Enums"]["account_type"];
          admin_notes?: string | null;
          avatar_url?: string | null;
          coach_mode?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          persona_track?: string | null;
        };
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"];
          account_type?: Database["public"]["Enums"]["account_type"];
          admin_notes?: string | null;
          avatar_url?: string | null;
          coach_mode?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          persona_track?: string | null;
        };
        Relationships: [];
      };
      specialist_services: {
        Row: {
          created_at: string;
          id: string;
          service_type: Database["public"]["Enums"]["service_type"];
          specialist_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          service_type: Database["public"]["Enums"]["service_type"];
          specialist_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          service_type?: Database["public"]["Enums"]["service_type"];
          specialist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "specialist_services_specialist_id_profiles_id_fk";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_anamnesis: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          responses: Json;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          responses?: Json;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          responses?: Json;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_anamnesis_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_consents: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"];
          given_at: string;
          id: string;
          policy_version: string;
          revoked_at: string | null;
          student_id: string;
        };
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"];
          given_at?: string;
          id?: string;
          policy_version: string;
          revoked_at?: string | null;
          student_id: string;
        };
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"];
          given_at?: string;
          id?: string;
          policy_version?: string;
          revoked_at?: string | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_consents_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_link_codes: {
        Row: {
          code: string;
          expires_at: string;
          id: string;
          student_id: string;
        };
        Insert: {
          code: string;
          expires_at: string;
          id?: string;
          student_id: string;
        };
        Update: {
          code?: string;
          expires_at?: string;
          id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_link_codes_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_specialists: {
        Row: {
          created_at: string;
          ended_at: string | null;
          ended_by: string | null;
          id: string;
          service_type: Database["public"]["Enums"]["service_type"];
          specialist_id: string;
          status: Database["public"]["Enums"]["link_status"];
          student_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          ended_by?: string | null;
          id?: string;
          service_type: Database["public"]["Enums"]["service_type"];
          specialist_id: string;
          status?: Database["public"]["Enums"]["link_status"];
          student_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          ended_by?: string | null;
          id?: string;
          service_type?: Database["public"]["Enums"]["service_type"];
          specialist_id?: string;
          status?: Database["public"]["Enums"]["link_status"];
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_specialists_ended_by_profiles_id_fk";
            columns: ["ended_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_specialists_specialist_id_profiles_id_fk";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_specialists_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_streaks: {
        Row: {
          current_streak: number;
          freeze_available: number;
          id: string;
          last_activity_date: string | null;
          last_freeze_date: string | null;
          longest_streak: number;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          current_streak?: number;
          freeze_available?: number;
          id?: string;
          last_activity_date?: string | null;
          last_freeze_date?: string | null;
          longest_streak?: number;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          current_streak?: number;
          freeze_available?: number;
          id?: string;
          last_activity_date?: string | null;
          last_freeze_date?: string | null;
          longest_streak?: number;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_streaks_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      training_periodizations: {
        Row: {
          created_at: string;
          duration_weeks: number | null;
          end_date: string;
          id: string;
          level: string | null;
          name: string;
          objective: string | null;
          specialist_id: string | null;
          start_date: string;
          status: Database["public"]["Enums"]["training_status"];
          student_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          duration_weeks?: number | null;
          end_date: string;
          id?: string;
          level?: string | null;
          name: string;
          objective?: string | null;
          specialist_id?: string | null;
          start_date: string;
          status?: Database["public"]["Enums"]["training_status"];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          duration_weeks?: number | null;
          end_date?: string;
          id?: string;
          level?: string | null;
          name?: string;
          objective?: string | null;
          specialist_id?: string | null;
          start_date?: string;
          status?: Database["public"]["Enums"]["training_status"];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_periodizations_specialist_id_profiles_id_fk";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_periodizations_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      training_plans: {
        Row: {
          created_at: string;
          duration_weeks: number | null;
          end_date: string;
          focus: string | null;
          id: string;
          name: string;
          order_index: number;
          periodization_id: string;
          start_date: string;
          status: Database["public"]["Enums"]["training_status"];
        };
        Insert: {
          created_at?: string;
          duration_weeks?: number | null;
          end_date: string;
          focus?: string | null;
          id?: string;
          name: string;
          order_index?: number;
          periodization_id: string;
          start_date: string;
          status?: Database["public"]["Enums"]["training_status"];
        };
        Update: {
          created_at?: string;
          duration_weeks?: number | null;
          end_date?: string;
          focus?: string | null;
          id?: string;
          name?: string;
          order_index?: number;
          periodization_id?: string;
          start_date?: string;
          status?: Database["public"]["Enums"]["training_status"];
        };
        Relationships: [
          {
            foreignKeyName: "training_plans_periodization_id_training_periodizations_id_fk";
            columns: ["periodization_id"];
            isOneToOne: false;
            referencedRelation: "training_periodizations";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_exercises: {
        Row: {
          created_at: string;
          exercise_id: string;
          id: string;
          notes: string | null;
          order_index: number;
          reps: string | null;
          rest_seconds: number | null;
          sets: number | null;
          weight: string | null;
          workout_id: string;
        };
        Insert: {
          created_at?: string;
          exercise_id: string;
          id?: string;
          notes?: string | null;
          order_index?: number;
          reps?: string | null;
          rest_seconds?: number | null;
          sets?: number | null;
          weight?: string | null;
          workout_id: string;
        };
        Update: {
          created_at?: string;
          exercise_id?: string;
          id?: string;
          notes?: string | null;
          order_index?: number;
          reps?: string | null;
          rest_seconds?: number | null;
          sets?: number | null;
          weight?: string | null;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_exercises_id_fk";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_exercises_workout_id_workouts_id_fk";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_session_exercises: {
        Row: {
          created_at: string;
          exercise_id: string | null;
          id: string;
          notes: string | null;
          session_id: string;
          workout_exercise_id: string | null;
        };
        Insert: {
          created_at?: string;
          exercise_id?: string | null;
          id?: string;
          notes?: string | null;
          session_id: string;
          workout_exercise_id?: string | null;
        };
        Update: {
          created_at?: string;
          exercise_id?: string | null;
          id?: string;
          notes?: string | null;
          session_id?: string;
          workout_exercise_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_session_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_session_exercises_session_id_workout_sessions_id_fk";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_session_exercises_workout_exercise_id_workout_exercises";
            columns: ["workout_exercise_id"];
            isOneToOne: false;
            referencedRelation: "workout_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_session_sets: {
        Row: {
          completed: boolean;
          created_at: string;
          id: string;
          reps_actual: number | null;
          reps_prescribed: string | null;
          rest_actual: number | null;
          rest_prescribed: number | null;
          session_exercise_id: string;
          set_index: number;
          skipped: boolean;
          weight_actual: number | null;
          weight_prescribed: number | null;
        };
        Insert: {
          completed?: boolean;
          created_at?: string;
          id?: string;
          reps_actual?: number | null;
          reps_prescribed?: string | null;
          rest_actual?: number | null;
          rest_prescribed?: number | null;
          session_exercise_id: string;
          set_index: number;
          skipped?: boolean;
          weight_actual?: number | null;
          weight_prescribed?: number | null;
        };
        Update: {
          completed?: boolean;
          created_at?: string;
          id?: string;
          reps_actual?: number | null;
          reps_prescribed?: string | null;
          rest_actual?: number | null;
          rest_prescribed?: number | null;
          session_exercise_id?: string;
          set_index?: number;
          skipped?: boolean;
          weight_actual?: number | null;
          weight_prescribed?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_session_sets_session_exercise_id_fkey";
            columns: ["session_exercise_id"];
            isOneToOne: false;
            referencedRelation: "workout_session_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          active_calories: number | null;
          activity_name: string | null;
          completed_at: string | null;
          created_at: string;
          duration_seconds: number | null;
          feedback_edited_at: string | null;
          id: string;
          intensity: number | null;
          notes: string | null;
          session_type: Database["public"]["Enums"]["workout_session_type"];
          started_at: string;
          student_id: string;
          workout_id: string | null;
        };
        Insert: {
          active_calories?: number | null;
          activity_name?: string | null;
          completed_at?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          feedback_edited_at?: string | null;
          id?: string;
          intensity?: number | null;
          notes?: string | null;
          session_type?: Database["public"]["Enums"]["workout_session_type"];
          started_at: string;
          student_id: string;
          workout_id?: string | null;
        };
        Update: {
          active_calories?: number | null;
          activity_name?: string | null;
          completed_at?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          feedback_edited_at?: string | null;
          id?: string;
          intensity?: number | null;
          notes?: string | null;
          session_type?: Database["public"]["Enums"]["workout_session_type"];
          started_at?: string;
          student_id?: string;
          workout_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_student_id_profiles_id_fk";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sessions_workout_id_workouts_id_fk";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      workouts: {
        Row: {
          created_at: string;
          day_of_week: Database["public"]["Enums"]["day_of_week"] | null;
          description: string | null;
          difficulty: Database["public"]["Enums"]["workout_difficulty"] | null;
          id: string;
          muscle_group: string | null;
          specialist_id: string | null;
          student_id: string | null;
          title: string;
          training_plan_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          day_of_week?: Database["public"]["Enums"]["day_of_week"] | null;
          description?: string | null;
          difficulty?: Database["public"]["Enums"]["workout_difficulty"] | null;
          id?: string;
          muscle_group?: string | null;
          specialist_id?: string | null;
          student_id?: string | null;
          title: string;
          training_plan_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          day_of_week?: Database["public"]["Enums"]["day_of_week"] | null;
          description?: string | null;
          difficulty?: Database["public"]["Enums"]["workout_difficulty"] | null;
          id?: string;
          muscle_group?: string | null;
          specialist_id?: string | null;
          student_id?: string | null;
          title?: string;
          training_plan_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workouts_specialist_id_profiles_id_fk";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workouts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workouts_training_plan_id_training_plans_id_fk";
            columns: ["training_plan_id"];
            isOneToOne: false;
            referencedRelation: "training_plans";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      link_student_by_code: { Args: { p_code: string }; Returns: Json };
      set_own_account_type: {
        Args: {
          p_account_type: Database["public"]["Enums"]["account_type"];
          p_full_name?: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      account_status: "active" | "inactive" | "invited";
      account_type: "admin" | "specialist" | "student" | "member";
      consent_type: "health_data_collection";
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday";
      diet_plan_status: "active" | "finished";
      diet_plan_type: "unique" | "cyclic";
      link_status: "active" | "inactive";
      scale_source: "assessment" | "anamnese";
      service_type: "personal_training" | "nutrition_consulting";
      training_status: "planned" | "active" | "completed";
      workout_difficulty: "beginner" | "intermediate" | "advanced";
      workout_session_type: "strength" | "cardio";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "inactive", "invited"],
      account_type: ["admin", "specialist", "student", "member"],
      consent_type: ["health_data_collection"],
      day_of_week: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      diet_plan_status: ["active", "finished"],
      diet_plan_type: ["unique", "cyclic"],
      link_status: ["active", "inactive"],
      scale_source: ["assessment", "anamnese"],
      service_type: ["personal_training", "nutrition_consulting"],
      training_status: ["planned", "active", "completed"],
      workout_difficulty: ["beginner", "intermediate", "advanced"],
      workout_session_type: ["strength", "cardio"],
    },
  },
} as const;
