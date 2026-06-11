import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'accent'
    | 'bordered'
    | 'destructive'
    | 'danger'
    | 'ghost'
    | 'success';
  mobileBehavior?: 'icon-only' | 'full-width' | 'hidden' | 'none';
}

export function Button({
  children,
  variant = 'primary',
  mobileBehavior = 'none',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 active:scale-95 cursor-pointer flex flex-row items-center justify-center gap-2';

  const variants = {
    primary:
      'bg-button border border-border hover:brightness-140 hover:scale-105 text-white',
    accent: 'bg-accent hover:brightness-140 hover:scale-105 text-white',
    bordered:
      'bg-none border border-border hover:bg-white/10 hover:scale-105 text-text-light',
    destructive: 'bg-error hover:bg-red-500 hover:scale-105 text-white ',
    danger: 'bg-error hover:bg-red-500 hover:scale-105 text-white',
    ghost:
      'bg-none border-none hover:scale-115 text-text-light',
    success: 'bg-success hover:bg-green-600 hover:scale-105 text-white ',
  };

  const mobileStyles = {
    'icon-only': 'max-sm:w-11 max-sm:h-11 max-sm:min-w-11 max-sm:p-0 max-sm:[&>span]:hidden max-sm:rounded-2xl',
    'full-width': 'max-sm:w-full max-sm:flex-1',
    'hidden': 'max-sm:hidden',
    'none': '',
  };

  return (
    <button
      className={twMerge(baseStyles, variants[variant], mobileStyles[mobileBehavior], className)}
      {...props}
    >
      {children}
    </button>
  );
}