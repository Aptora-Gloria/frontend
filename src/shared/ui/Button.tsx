import type { ButtonHTMLAttributes } from 'react';

export const Button = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { className = '', ...rest } = props;
  return (
    <button
      className={
        'inline-flex items-center rounded-md px-4 py-2 text-sm font-medium border ' +
        'border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 ' +
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 ' +
        className
      }
      {...rest}
    />
  );
};
