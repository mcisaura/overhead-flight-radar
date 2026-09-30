import { ChevronDown, Images } from "lucide-react";

export type HeroBackground = "original" | "houston" | "low-poly";

const backgrounds: { value: HeroBackground; label: string }[] = [
  { value: "original", label: "Original sky" },
  { value: "houston", label: "Houston skyline" },
  { value: "low-poly", label: "Low-poly sky" },
];

export default function HeroBackgroundToggle({ value, onChange }: { value: HeroBackground; onChange: (background: HeroBackground) => void }) {
  return <div className="hero-background-control">
    <label htmlFor="hero-background-select">Hero background</label>
    <span className="hero-background-select-wrap">
      <Images size={15} aria-hidden="true" />
      <select id="hero-background-select" value={value} onChange={(event) => onChange(event.target.value as HeroBackground)}>
        {backgrounds.map((background) => <option key={background.value} value={background.value}>{background.label}</option>)}
      </select>
      <ChevronDown className="hero-background-chevron" size={14} aria-hidden="true" />
    </span>
  </div>;
}
