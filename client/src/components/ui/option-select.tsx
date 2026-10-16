import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@spunto/design-system";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
}

interface OptionSelectProps {
  value: string;
  options: Option[];
  onValueChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}

// Le Select du design system (Base UI) est compositionnel ; on a seulement des listes
// plates de chaînes, donc ce raccourci options → items. `items` permet à SelectValue
// d'afficher le label de la valeur choisie plutôt que la valeur brute (ex: "" → "Tous les jobs").
export function OptionSelect({ value, options, onValueChange, className, ...props }: OptionSelectProps) {
  return (
    <Select items={options} value={value} onValueChange={(v) => onValueChange((v as string | null) ?? "")}>
      <SelectTrigger className={cn("text-xs", className)} aria-label={props["aria-label"]}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || "__empty"} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
