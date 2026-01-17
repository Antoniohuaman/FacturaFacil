export interface ValidationRule {
  test: RegExp | ((value: string) => boolean);
  message: string;
}

export interface FieldValidator {
  rules: ValidationRule[];
  errors: string[];
  valid: boolean;
  state: string;
}

export type Validators = Record<string, FieldValidator>;

export interface ValidationResult {
  status: boolean;
  validators?: Validators;
}

export const formValidation = {
  isFormValid(validators: Validators, state: Record<string, string>): ValidationResult {
    let status = true;

    if (!validators) {
      return { status };
    }

    Object.keys(validators).forEach((fieldName) => {
      this.updateValidators(fieldName, state[fieldName], validators);
    });

    Object.keys(validators).forEach((field) => {
      if (!validators[field].valid) {
        status = false;
      }
    });

    return { status, validators };
  },

  updateValidators(
    fieldName: string,
    value: string | undefined,
    stateValidators: Validators
  ): Validators {
    if (!stateValidators) {
      return {} as Validators;
    }

    const currentValue = value || '';
    const validators = { ...stateValidators };

    validators[fieldName].errors = [];
    validators[fieldName].state = currentValue;
    validators[fieldName].valid = true;

    validators[fieldName].rules.forEach((rule) => {
      if (rule.test instanceof RegExp) {
        if (!rule.test.test(currentValue)) {
          validators[fieldName].errors.push(rule.message);
          validators[fieldName].valid = false;
        }
      } else if (typeof rule.test === 'function') {
        if (!rule.test(currentValue)) {
          validators[fieldName].errors.push(rule.message);
          validators[fieldName].valid = false;
        }
      }
    });

    return validators;
  },

  updateErrorsFromServer(
    errors: Record<string, string[]> | null,
    validators: Validators
  ): Validators {
    if (!errors) {
      return validators;
    }

    Object.keys(errors).forEach((field) => {
      if (validators[field]) {
        validators[field].errors = [];
        validators[field].valid = false;
        errors[field].forEach((message) => {
          validators[field].errors.push(message);
        });
      }
    });

    return validators;
  },

  getFieldErrors(fieldName: string, validators: Validators | null): string[] {
    if (!validators) {
      return [];
    }

    const validator = validators[fieldName];
    if (validator && !validator.valid && validator.errors.length > 0) {
      return validator.errors;
    }

    return [];
  },

  hasErrors(fieldName: string, validators: Validators | null): boolean {
    if (!validators) {
      return false;
    }

    const validator = validators[fieldName];
    return validator ? !validator.valid : false;
  },

  createFieldValidator(rules: ValidationRule[]): FieldValidator {
    return {
      rules,
      errors: [],
      valid: true,
      state: '',
    };
  },
};

export const commonRules = {
  required: (message = 'Este campo es requerido'): ValidationRule => ({
    test: (value: string) => value.trim().length > 0,
    message,
  }),

  email: (message = 'Email inválido'): ValidationRule => ({
    test: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value: string) => value.length >= min,
    message: message || `Mínimo ${min} caracteres`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value: string) => value.length <= max,
    message: message || `Máximo ${max} caracteres`,
  }),

  exactLength: (length: number, message?: string): ValidationRule => ({
    test: (value: string) => value.length === length,
    message: message || `Debe tener exactamente ${length} caracteres`,
  }),

  numeric: (message = 'Solo números'): ValidationRule => ({
    test: /^\d+$/,
    message,
  }),

  alphanumeric: (message = 'Solo letras y números'): ValidationRule => ({
    test: /^[a-zA-Z0-9]+$/,
    message,
  }),

  ruc: (message = 'RUC inválido (11 dígitos)'): ValidationRule => ({
    test: /^\d{11}$/,
    message,
  }),

  dni: (message = 'DNI inválido (8 dígitos)'): ValidationRule => ({
    test: /^\d{8}$/,
    message,
  }),

  phone: (message = 'Teléfono inválido'): ValidationRule => ({
    test: /^\d{9,12}$/,
    message,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    test: regex,
    message,
  }),

  custom: (testFn: (value: string) => boolean, message: string): ValidationRule => ({
    test: testFn,
    message,
  }),
};

export interface InputErrorClassOptions {
  field: string;
  validators: Validators | null;
  errorClass?: string;
  normalClass?: string;
}

export function getInputErrorClass({
  field,
  validators,
  errorClass = 'border-red-500 dark:border-red-500',
  normalClass = 'border-gray-300 dark:border-gray-600',
}: InputErrorClassOptions): string {
  const hasError = formValidation.hasErrors(field, validators);
  return hasError ? errorClass : normalClass;
}

export default formValidation;
