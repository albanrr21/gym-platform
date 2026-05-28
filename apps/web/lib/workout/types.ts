export interface WorkoutSetData {
  clientId?: string;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  completed: boolean;
}

export interface WorkoutExerciseData {
  clientId?: string;
  name: string;
  exerciseId?: string;
  bodyPart?: string;
  equipment?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  sets: WorkoutSetData[];
}
