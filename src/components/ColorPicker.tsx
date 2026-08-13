import { Input } from "./Field";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_SWATCH = "#4338ca";

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  hasError?: boolean;
}

export function ColorInput({ value, onChange, onBlur, disabled, hasError }: ColorInputProps) {
  const swatchValue = HEX_RE.test(value ?? "") ? value : FALLBACK_SWATCH;

  return (
    <div className="color-input">
      <input
        type="color"
        className="color-input-swatch"
        value={swatchValue}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Pick theme color"
      />
      <Input
        type="text"
        hasError={hasError}
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="#4338CA"
        style={{ flex: 1 }}
      />
    </div>
  );
}
