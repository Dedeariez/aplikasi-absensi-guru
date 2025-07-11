
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
  as?: React.ElementType;
  [key: string]: any; // Allow other props like htmlFor, etc.
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  as: Component = 'button',
  ...props
}) => {
  const baseStyles = 'font-bold rounded-lg transition-transform transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2';

  const variantStyles = {
    primary: 'bg-darul-green-600 text-white hover:bg-darul-green-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  
  const sizeStyles = {
      md: 'py-2 px-4',
      sm: 'py-1 px-3 text-sm'
  };

  const nonButtonStyles = Component !== 'button' ? 'cursor-pointer' : '';

  return (
    <Component
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${nonButtonStyles} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Button;