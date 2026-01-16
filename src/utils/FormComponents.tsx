import { formValidation, type Validators } from './FormValidation';

interface FieldErrorsProps {
  field: string;
  validators: Validators | null;
  className?: string;
}

export function FieldErrors({ field, validators, className = '' }: FieldErrorsProps) {
  const errors = formValidation.getFieldErrors(field, validators);

  if (errors.length === 0) return null;

  return (
    <ul className={`mt-1 text-sm text-red-600 dark:text-red-400 ${className}`}>
      {errors.map((error, index) => (
        <li key={index}>{error}</li>
      ))}
    </ul>
  );
}
