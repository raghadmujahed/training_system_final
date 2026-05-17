import { ACADEMIC_MAJORS } from "../../constants/academicMajors";

export default function MajorSelect({
  id = "major",
  name = "major",
  value,
  onChange,
  onBlur,
  required = false,
  className = "",
  majors = ACADEMIC_MAJORS,
  disabled = false,
  placeholder,
}) {
  const options = Array.isArray(majors) ? majors : [];
  const safeValue = options.includes(value) ? value : "";

  const defaultPlaceholder = !options.length
    ? disabled
      ? "اختر القسم أولاً"
      : "لا تتوفر تخصصات لهذا القسم"
    : "اختر التخصص";

  return (
    <select
      id={id}
      name={name}
      value={safeValue}
      onChange={onChange}
      onBlur={onBlur}
      required={required && options.length > 0}
      disabled={disabled || options.length === 0}
      className={className}
    >
      <option value="">{placeholder ?? defaultPlaceholder}</option>
      {options.map((major) => (
        <option key={major} value={major}>
          {major}
        </option>
      ))}
    </select>
  );
}
