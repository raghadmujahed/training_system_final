/**
 * Validation utilities for frontend forms
 * Matches backend Laravel validation rules
 */

// Phone number validation - Palestinian format (056/059 + 7 digits)
export const isValidPhone = (phone) => {
  if (!phone || phone === "") return true; // Phone is optional
  return /^(056|059)\d{7}$/.test(phone);
};

export const getPhoneErrorMessage = () => {
  return "رقم الهاتف يجب أن يكون مكونًا من 10 أرقام ويبدأ بـ 056 أو 059";
};

// Email validation
export const isValidEmail = (email) => {
  if (!email || email === "") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Student email domain validation
export const isValidStudentEmail = (email) => {
  if (!email || email === "") return false;
  return email.toLowerCase().endsWith("@students.hebron.edu");
};

export const getStudentEmailErrorMessage = () => {
  return "البريد الإلكتروني للطلاب يجب أن ينتهي بـ @students.hebron.edu";
};

// Password validation (min 8 characters)
export const isValidPassword = (password) => {
  if (!password || password === "") return false;
  return password.length >= 8;
};

export const getPasswordErrorMessage = () => {
  return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
};

// Password confirmation validation
export const isPasswordMatch = (password, confirmation) => {
  if (!confirmation || confirmation === "") return true; // Don't show error on empty
  return password === confirmation;
};

export const getPasswordMatchErrorMessage = () => {
  return "كلمتا المرور غير متطابقتين";
};

// University ID validation (6-20 digits for students)
export const isValidUniversityId = (id) => {
  if (!id || id === "") return false;
  return /^\d{6,20}$/.test(id);
};

export const getUniversityIdErrorMessage = () => {
  return "الرقم الجامعي يجب أن يكون بين 6 و 20 رقمًا";
};

// Required field validation
export const isRequired = (value) => {
  if (typeof value === "string") {
    return value.trim() !== "";
  }
  if (typeof value === "number") {
    return !isNaN(value);
  }
  return value !== null && value !== undefined && value !== "";
};

export const getRequiredErrorMessage = (fieldName) => {
  return `${fieldName} مطلوب`;
};

// Name validation (not empty, reasonable length)
export const isValidName = (name) => {
  if (!name || name === "") return false;
  return name.trim().length >= 2 && name.trim().length <= 255;
};

export const getNameErrorMessage = () => {
  return "الاسم يجب أن يكون حرفين على الأقل";
};

// Trim input value
export const trimInput = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }
  return value;
};

// Numeric validation
export const isNumeric = (value) => {
  if (!value || value === "") return true; // Optional
  return !isNaN(value) && isFinite(value);
};

export const getNumericErrorMessage = () => {
  return "القيمة يجب أن تكون رقمًا";
};

// Min value validation
export const isMinValue = (value, min) => {
  if (!value || value === "") return true; // Optional
  return Number(value) >= min;
};

export const getMinValueErrorMessage = (min) => {
  return `القيمة يجب أن تكون ${min} على الأقل`;
};

// Max value validation
export const isMaxValue = (value, max) => {
  if (!value || value === "") return true; // Optional
  return Number(value) <= max;
};

export const getMaxValueErrorMessage = (max) => {
  return `القيمة يجب ألا تتجاوز ${max}`;
};

// Date validation
export const isValidDate = (value) => {
  if (!value || value === "") return true; // Optional
  const date = new Date(value);
  return !isNaN(date.getTime());
};

export const getInvalidDateErrorMessage = () => {
  return "التاريخ غير صحيح";
};

// Date range validation
export const isDateAfter = (startDate, endDate) => {
  if (!startDate || !endDate) return true; // Optional
  return new Date(startDate) <= new Date(endDate);
};

export const getDateRangeErrorMessage = () => {
  return "تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية";
};

// Integer validation
export const isInteger = (value) => {
  if (!value || value === "") return true; // Optional
  return Number.isInteger(Number(value));
};

export const getIntegerErrorMessage = () => {
  return "القيمة يجب أن تكون عددًا صحيحًا";
};

// Min length validation
export const isMinLength = (value, min) => {
  if (!value || value === "") return true; // Optional
  return value.length >= min;
};

export const getMinLengthErrorMessage = (min) => {
  return `القيمة يجب أن تكون ${min} أحرف على الأقل`;
};

// Max length validation
export const isMaxLength = (value, max) => {
  if (!value || value === "") return true; // Optional
  return value.length <= max;
};

export const getMaxLengthErrorMessage = (max) => {
  return `القيمة يجب ألا تتجاوز ${max} حرف`;
};

// Validate form object
export const validateForm = (form, rules) => {
  const errors = {};
  let isValid = true;

  for (const [field, validations] of Object.entries(rules)) {
    const value = form[field];

    for (const validation of validations) {
      const { type, message, condition } = validation;

      let fieldError = null;

      switch (type) {
        case "required":
          if (!isRequired(value)) {
            fieldError = message || getRequiredErrorMessage(field);
          }
          break;
        case "email":
          if (value && !isValidEmail(value)) {
            fieldError = message || "صيغة البريد الإلكتروني غير صحيحة";
          }
          break;
        case "studentEmail":
          if (value && !isValidStudentEmail(value)) {
            fieldError = message || getStudentEmailErrorMessage();
          }
          break;
        case "phone":
          if (value && !isValidPhone(value)) {
            fieldError = message || getPhoneErrorMessage();
          }
          break;
        case "password":
          if (value && !isValidPassword(value)) {
            fieldError = message || getPasswordErrorMessage();
          }
          break;
        case "passwordMatch":
          const compareField = validation.compareField;
          if (!isPasswordMatch(form[compareField], value)) {
            fieldError = message || getPasswordMatchErrorMessage();
          }
          break;
        case "universityId":
          if (value && !isValidUniversityId(value)) {
            fieldError = message || getUniversityIdErrorMessage();
          }
          break;
        case "name":
          if (value && !isValidName(value)) {
            fieldError = message || getNameErrorMessage();
          }
          break;
        case "custom":
          if (condition && !condition(value, form)) {
            fieldError = message || "قيمة غير صحيحة";
          }
          break;
        default:
          break;
      }

      if (fieldError) {
        errors[field] = fieldError;
        isValid = false;
        break; // Stop at first error for this field
      }
    }
  }

  return { isValid, errors };
};

// Real-time validation helper
export const validateField = (fieldName, value, rules, form = {}) => {
  const fieldRules = rules[fieldName];
  if (!fieldRules) return null;

  for (const rule of fieldRules) {
    const { type, message, compareField, min, max } = rule;

    switch (type) {
      case "required":
        if (!isRequired(value)) {
          return message || getRequiredErrorMessage(fieldName);
        }
        break;
      case "email":
        if (value && !isValidEmail(value)) {
          return message || "صيغة البريد الإلكتروني غير صحيحة";
        }
        break;
      case "studentEmail":
        if (value && !isValidStudentEmail(value)) {
          return message || getStudentEmailErrorMessage();
        }
        break;
      case "phone":
        if (value && !isValidPhone(value)) {
          return message || getPhoneErrorMessage();
        }
        break;
      case "password":
        if (value && !isValidPassword(value)) {
          return message || getPasswordErrorMessage();
        }
        break;
      case "passwordMatch":
        if (!isPasswordMatch(form[compareField], value)) {
          return message || getPasswordMatchErrorMessage();
        }
        break;
      case "universityId":
        if (value && !isValidUniversityId(value)) {
          return message || getUniversityIdErrorMessage();
        }
        break;
      case "name":
        if (value && !isValidName(value)) {
          return message || getNameErrorMessage();
        }
        break;
      case "numeric":
        if (value && !isNumeric(value)) {
          return message || getNumericErrorMessage();
        }
        break;
      case "minValue":
        if (value && !isMinValue(value, min)) {
          return message || getMinValueErrorMessage(min);
        }
        break;
      case "maxValue":
        if (value && !isMaxValue(value, max)) {
          return message || getMaxValueErrorMessage(max);
        }
        break;
      case "date":
        if (value && !isValidDate(value)) {
          return message || getInvalidDateErrorMessage();
        }
        break;
      case "dateAfter":
        if (!isDateAfter(form[compareField], value)) {
          return message || getDateRangeErrorMessage();
        }
        break;
      case "integer":
        if (value && !isInteger(value)) {
          return message || getIntegerErrorMessage();
        }
        break;
      case "minLength":
        if (value && !isMinLength(value, min)) {
          return message || getMinLengthErrorMessage(min);
        }
        break;
      case "maxLength":
        if (value && !isMaxLength(value, max)) {
          return message || getMaxLengthErrorMessage(max);
        }
        break;
      default:
        break;
    }
  }

  return null;
};
