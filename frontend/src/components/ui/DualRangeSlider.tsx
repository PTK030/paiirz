import React, { useState, useEffect } from "react";

interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
}) => {
  const [minVal, setMinVal] = useState(value[0] || min);
  const [maxVal, setMaxVal] = useState(value[1] || max);

  // Update local state if props change (e.g., from reset)
  useEffect(() => {
    setMinVal(value[0] || min);
    setMaxVal(value[1] || max);
  }, [value[0], value[1], min, max]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = Math.min(Number(e.target.value), maxVal - 1);
    setMinVal(newVal);
    onChange([newVal, maxVal]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = Math.max(Number(e.target.value), minVal + 1);
    setMaxVal(newVal);
    onChange([minVal, newVal]);
  };

  const getPercent = (val: number) =>
    Math.round(((val - min) / (max - min)) * 100);

  const minPercent = getPercent(minVal);
  const maxPercent = getPercent(maxVal);

  return (
    <div className="relative w-full h-10 flex items-center group">
      {/* Track background */}
      <div className="absolute w-full h-1.5 bg-zinc-800/80 rounded-full" />

      {/* Active track segment */}
      <div
        className="absolute h-1.5 bg-indigo-500 rounded-full"
        style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
      />

      {/* Min Slider */}
      <input
        type="range"
        min={min}
        max={max}
        value={minVal}
        onChange={handleMinChange}
        className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none
          [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-zinc-200 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-500
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
          group-hover:[&::-webkit-slider-thumb]:scale-110
          [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-zinc-200 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-indigo-500
          [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none z-10"
      />

      {/* Max Slider */}
      <input
        type="range"
        min={min}
        max={max}
        value={maxVal}
        onChange={handleMaxChange}
        className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none
          [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-zinc-200 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-500
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
          group-hover:[&::-webkit-slider-thumb]:scale-110
          [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-zinc-200 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-indigo-500
          [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none z-20"
      />
    </div>
  );
};
