// Beautiful form components for consistent styling across the app

import React, { ReactNode } from "react";

export interface FormGroupProps {
  label?: string;
  error?: string;
  required?: boolean;
  helper?: string;
  children: ReactNode;
  className?: string;
}

export function FormGroup({
  label,
  error,
  required,
  helper,
  children,
  className = "",
}: FormGroupProps) {
  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
            ⚠
          </span>
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="mt-1.5 text-xs text-gray-500">{helper}</p>
      )}
    </div>
  );
}

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className = "",
}: FormSectionProps) {
  return (
    <div className={`bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 ${className}`}>
      {(title || description) && (
        <div className="mb-5 pb-4 border-b border-gray-200">
          {title && (
            <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export interface FormContainerProps {
  children: ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  title?: string;
}

export function FormContainer({
  children,
  onSubmit,
  className = "",
  title,
}: FormContainerProps) {
  return (
    <form onSubmit={onSubmit} className={`space-y-5 ${className}`}>
      {title && (
        <div className="mb-6 pb-4 border-b-2 border-gradient-to-r from-blue-600 to-transparent">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
            {title}
          </h2>
        </div>
      )}
      {children}
    </form>
  );
}

export const INPUT_STYLES = {
  // Base input styling
  base: "w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm transition-all duration-200",
  // Focus states
  focus: "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:shadow-lg",
  // Hover state
  hover: "hover:border-gray-400",
  // Combined
  full: "w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:shadow-lg hover:border-gray-400",
  // Error state
  error: "border-red-400 focus:border-red-500 focus:ring-red-500",
  // Disabled state
  disabled: "opacity-50 cursor-not-allowed bg-gray-100",
};

export const TEXTAREA_STYLES = {
  base: "w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm transition-all duration-200 resize-none",
  focus: "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:shadow-lg",
  hover: "hover:border-gray-400",
  full: "w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm transition-all duration-200 resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:shadow-lg hover:border-gray-400",
};

export const SELECT_STYLES = {
  base: "w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm transition-all duration-200 appearance-none",
  focus: "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:shadow-lg",
  hover: "hover:border-gray-400",
  full: "w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm transition-all duration-200 appearance-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:shadow-lg hover:border-gray-400",
  // Arrow styling
  arrow: "pr-10 bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%222%22%3e%3cpolyline points=%226 9 12 15 18 9%22%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-right-4 bg-center",
};

export const BUTTON_STYLES = {
  primary:
    "px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "px-5 py-2.5 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
  success:
    "px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
  small:
    "px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
};

export const LABEL_STYLES =
  "block text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide";
