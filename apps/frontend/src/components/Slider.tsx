import React from 'react';

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  className?: string;
  accentColor?: string;
  trackColor?: string;
}

export default function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  className = '',
  accentColor = '#6366f1',
  trackColor = '#374151',
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`custom-slider ${className}`}
      style={{
        background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percentage}%, ${trackColor} ${percentage}%, ${trackColor} 100%)`
      }}
    />
  );
}
