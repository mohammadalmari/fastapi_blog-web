import { useTheme } from "@/components/theme-provider";

import { Button } from "@/components/ui/button";

import { MoonIcon, SunIcon } from "lucide-react";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  // "system" follows the device; the button then switches away from
  // whatever the device currently shows.
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={isDark ? "Use the light theme" : "Use the dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
