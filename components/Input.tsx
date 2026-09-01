import React, { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = "",
  disabled = false,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-black">
          {label}
        </label>
      )}
      <input
        className={`w-full border border-gray-300 bg-white px-4 py-3 text-base text-black placeholder-gray-400 transition-colors focus:outline-none focus:border-black disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        disabled={disabled}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-gray-600">{error}</p>}
    </div>
  );
};
