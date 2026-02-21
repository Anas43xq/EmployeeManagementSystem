import { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  className?: string;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-900 text-white hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'text-gray-700 bg-gray-100 hover:bg-gray-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
  ghost: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
};

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  loadingText,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  icon,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg transition-colors whitespace-nowrap ${variantClasses[variant]} ${className}`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          {loadingText && <span>{loadingText}</span>}
        </>
      ) : (
        <>
          {icon}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
