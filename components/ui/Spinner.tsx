
import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'border-darul-green-600' }) => {
    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };
    return (
        <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 ${color}`}></div>
    );
};

export default Spinner;
