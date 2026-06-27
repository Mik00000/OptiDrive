'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';

interface BaseInputProps {
  className?: string;
  wrapperClassName?: string;
  children?: React.ReactNode;
}

interface TextInputProps
  extends BaseInputProps, React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'text' | 'search' | 'password';
}

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps extends Omit<BaseInputProps, 'children'> {
  variant: 'options' | 'select';
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  icon?: string;
  prefix?: string;
}

type InputProps = TextInputProps | SelectInputProps;

const baseStyles =
  'px-3 py-2 bg-bg text-text-light border border-slate-700 rounded-xl focus:border-accent focus:bg-white/5 outline-none placeholder:text-text-muted text-sm transition-all duration-200';

function SelectInput(props: SelectInputProps) {
  const { options, value, onChange, placeholder, icon, prefix, className: selectClass } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Закриття по кліку поза елементом
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Розрахунок позиції випадаючого списку
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // max-h-60 в Tailwind дорівнює 240px (15rem)
      const dropdownMaxHeight = 240; 

      // Якщо знизу мало місця, а зверху його більше — відкриваємо вверх
      if (spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  return (
    <div className={twMerge('relative w-fit', selectClass)} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={twMerge(
          baseStyles,
          'hover:border-accent flex w-full cursor-pointer items-center justify-between gap-4 transition-colors',
          selectClass
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {icon && <Icon icon={icon} className="text-text-muted shrink-0" width={18} height={18} />}
          <span
            className={twMerge(
              !selectedOption && !prefix ? 'text-text-muted' : '',
              'truncate text-left'
            )}
          >
            {prefix && <span>{prefix}</span>}
            {selectedOption
              ? selectedOption.label
              : placeholder || 'Select...'}
          </span>
        </div>
        <Icon
          icon="lucide:chevron-down"
          className={`text-text-muted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          className={twMerge(
            "bg-bg border-border absolute z-50 max-h-60 min-w-full w-max overflow-y-auto rounded-xl border p-1 shadow-lg",
            dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange?.(option.value);
                setIsOpen(false);
              }}
              className={`hover:bg-accent/10 hover:text-accent cursor-pointer whitespace-nowrap px-3 py-2 text-sm rounded-lg transition-colors ${
                value === option.value
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-light'
              }`}
            >
              {option.label}
            </div>
          ))}
          {options.length === 0 && (
            <div className="text-text-muted px-3 py-2 text-center text-sm">
              No options
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Input({
  variant = 'text',
  className = '',
  wrapperClassName = '',
  ...props
}: InputProps) {
  if (variant === 'options' || variant === 'select') {
    return <SelectInput className={className} {...(props as SelectInputProps)} />;
  }

  const { children, ...restProps } = props as TextInputProps;
  const inputProps = restProps as React.InputHTMLAttributes<HTMLInputElement>;

  const variants = {
    text: '',
    search: 'gap-2.25 text-text-muted',
    password: '',
  };

  const combinedClassName = twMerge(baseStyles, variants[variant as keyof typeof variants], className);

  if (variant === 'search' || children) {
    return (
      <div className={twMerge("relative flex items-center w-full", wrapperClassName)}>
        {variant === 'search' && (
          <Icon
            icon="lucide:search"
            className="text-text-muted pointer-events-none absolute left-3"
          />
        )}
        <input
          className={twMerge(combinedClassName, 'w-full', variant === 'search' ? 'pl-9' : '')}
          type={variant === 'search' ? 'search' : variant}
          {...inputProps}
        />
        {children && (
          <div className="absolute right-3 flex items-center">{children}</div>
        )}
      </div>
    );
  }

  return <input className={twMerge(combinedClassName, wrapperClassName)} type={variant} {...inputProps} />;
}