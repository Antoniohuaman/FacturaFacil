// IconPersonalizeTwoSliders.tsx
// Ícono de personalización con 2 sliders horizontales (más limpio que 3)
// Diseño ópticamente centrado

interface IconPersonalizeTwoSlidersProps {
  className?: string;
}

export function IconPersonalizeTwoSliders({ className = "" }: IconPersonalizeTwoSlidersProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width="18" 
      height="18" 
      aria-hidden="true" 
      className={className}
      fill="none"
    >
      {/* Slider horizontal superior */}
      <line x1="4" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      
      {/* Slider horizontal inferior */}
      <line x1="4" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
