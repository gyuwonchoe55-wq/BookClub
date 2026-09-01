import React, { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
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
      <textarea
        className={`w-full border border-gray-300 bg-white px-4 py-3 text-base text-black placeholder-gray-400 resize-vertical transition-colors focus:outline-none focus:border-black disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        style={{ minHeight: "120px" }}
        disabled={disabled}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-gray-600">{error}</p>}
    </div>
  );
};
