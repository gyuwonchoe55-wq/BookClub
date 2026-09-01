import React, { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, className = "" }) => {
  return (
    <div className={`mx-auto max-w-3xl px-4 py-8 md:px-8 ${className}`}>
      {children}
    </div>
  );
};
