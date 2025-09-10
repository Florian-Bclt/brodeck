import React from "react";

type SwitchProps = {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
  className?: string;
  labelClassName?: string;
  activeColor?: string;
  inactiveColor?: string;
  id?: string;
};

export default function Switch({
  label,
  checked,
  onChange,
  name,
  className = "",
  labelClassName = "",
  activeColor = "bg-green-600",
  inactiveColor = "bg-gray-600",
  id,
}: SwitchProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {label && (
        <label htmlFor={id || name} className={`font-semibold text-md ${labelClassName}`}>
          {label}
        </label>
      )}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          id={id || name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={
          `w-11 h-6 rounded-full transition-colors duration-900 ease-in-out
           ${checked ? activeColor : inactiveColor}`
        }></div>
        <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-all duration-900 ease-in-out ${checked ? "translate-x-full" : ""}`}></div>
      </label>
    </div>
  );
}

