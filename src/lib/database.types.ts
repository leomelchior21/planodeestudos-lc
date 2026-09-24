import type { SchoolData, SavedPlan } from "@/domain/types";
type ConfigTable<T> = {
  Row: { id: string; data: T };
  Insert: { id: string; data: T };
  Update: { id?: string; data?: T };
  Relationships: [];
};
export interface Database {
  public: {
    Tables: {
      school_years: ConfigTable<SchoolData["schoolYears"][number]>;
      classes: ConfigTable<SchoolData["classes"][number]>;
      subjects: ConfigTable<SchoolData["subjects"][number]>;
      class_subjects: ConfigTable<SchoolData["classSubjects"][number]>;
      class_schedule: ConfigTable<SchoolData["schedules"][number]>;
      event_types: ConfigTable<SchoolData["eventTypes"][number]>;
      academic_events: ConfigTable<SchoolData["events"][number]>;
      study_resources: ConfigTable<SchoolData["resources"][number]>;
      subject_resources: ConfigTable<SchoolData["subjectResources"][number]>;
      study_activity_templates: ConfigTable<SchoolData["activities"][number]>;
      study_recipes: ConfigTable<SchoolData["recipes"][number]>;
      study_rules: ConfigTable<SchoolData["rules"][number]>;
      event_study_phases: ConfigTable<SchoolData["phases"][number]>;
      reason_templates: ConfigTable<SchoolData["reasonTemplates"][number]>;
      study_plans: ConfigTable<SavedPlan>;
      school_settings: {
        Row: { id: boolean; data: SchoolData["settings"] };
        Insert: { id?: boolean; data: SchoolData["settings"] };
        Update: { data?: SchoolData["settings"] };
        Relationships: [];
      };
      study_recipe_steps: {
        Row: {
          id: string;
          recipe_id: string;
          activity_id: string;
          duration_minutes: number;
          step_order: number;
        };
        Insert: {
          id: string;
          recipe_id: string;
          activity_id: string;
          duration_minutes: number;
          step_order: number;
        };
        Update: Partial<{
          recipe_id: string;
          activity_id: string;
          duration_minutes: number;
          step_order: number;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      export_school_data: { Args: Record<string, never>; Returns: SchoolData };
      import_school_data: { Args: { payload: SchoolData }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
