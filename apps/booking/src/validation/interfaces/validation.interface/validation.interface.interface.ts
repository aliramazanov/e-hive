export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface EventValidationResult extends ValidationResult {
  eventId: string;
}
