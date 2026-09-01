import React, { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  children,
  className = "",
  disabled = false,
  ...props
}) => {
  const baseStyles =
    "min-h-12 px-4 py-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: "border-2 border-black bg-white text-black hover:bg-gray-50 active:bg-gray-100",
    secondary: "border border-gray-400 bg-white text-black hover:bg-gray-50 active:bg-gray-100",
    ghost: "bg-white text-black hover:bg-gray-50 active:bg-gray-100",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
