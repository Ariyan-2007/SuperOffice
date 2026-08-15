import { useEffect, useRef, useState } from "react";
import { Input } from "./Field";
import { searchCurrencies } from "../lib/currencies";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  hasError?: boolean;
}

export function CurrencyInput({ value, onChange, onBlur, disabled, hasError }: CurrencyInputProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const matches = searchCurrencies(value ?? "");

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function pick(code: string) {
    onChange(code);
    setOpen(false);
  }

  return (
    <div className="currency-input" ref={wrapRef}>
      <Input
        type="text"
        hasError={hasError}
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="USD"
        maxLength={3}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && matches.length > 0 && (
        <ul className="currency-input-menu" role="listbox">
          {matches.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                className="currency-input-option"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pick(c.code)}
                role="option"
                aria-selected={c.code === (value ?? "").toUpperCase()}
              >
                <span className="currency-input-option-symbol">{c.symbol}</span>
                <span className="currency-input-option-code">{c.code}</span>
                <span className="currency-input-option-name">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
