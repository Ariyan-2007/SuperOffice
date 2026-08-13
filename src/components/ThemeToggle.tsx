import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "../theme/ThemeModeContext";

export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  return (
    <button className="icon-btn" onClick={toggle} aria-label="Toggle color theme" title="Toggle color theme">
      {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
