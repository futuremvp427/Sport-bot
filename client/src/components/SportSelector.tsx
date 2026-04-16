/**
 * SportSelector — Shared sport filter component used across pages.
 * Supports all 7 sports: NBA, NFL, MLB, NHL, Soccer, Golf, Boxing.
 */

export const SUPPORTED_SPORTS = [
  { value: "", label: "All Sports" },
  { value: "nba", label: "NBA" },
  { value: "nfl", label: "NFL" },
  { value: "mlb", label: "MLB" },
  { value: "nhl", label: "NHL" },
  { value: "soccer", label: "Soccer" },
  { value: "golf", label: "Golf" },
  { value: "boxing", label: "Boxing" },
] as const;

export type SportValue = (typeof SUPPORTED_SPORTS)[number]["value"];

interface SportSelectorProps {
  value: string;
  onChange: (sport: string) => void;
  /** If true, omit the "All Sports" option */
  excludeAll?: boolean;
  className?: string;
}

export default function SportSelector({
  value,
  onChange,
  excludeAll = false,
  className = "",
}: SportSelectorProps) {
  const options = excludeAll ? SUPPORTED_SPORTS.filter((s) => s.value !== "") : SUPPORTED_SPORTS;

  return (
    <div className={`flex gap-1.5 flex-wrap ${className}`}>
      {options.map((s) => (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            value === s.value
              ? "bg-primary text-primary-foreground"
              : "bg-accent/30 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
