
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  endAdornment?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, id, endAdornment, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={`block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400
                     focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500
                     disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none
                     ${endAdornment ? 'pr-10' : ''}`}
          {...props}
        />
        {endAdornment && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {endAdornment}
            </div>
        )}
      </div>
    </div>
  );
};

export default Input;
