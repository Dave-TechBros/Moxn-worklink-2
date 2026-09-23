import React, { useEffect, useRef, useState } from 'react';
import { getSkillSuggestions } from '../lib/skills';

interface SkillSuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: (value: string) => void;
  exclude?: string[];
  placeholder?: string;
  inputClassName?: string;
  buttonClassName?: string;
  buttonLabel?: React.ReactNode;
  showButton?: boolean;
}

export const SkillSuggestInput: React.FC<SkillSuggestInputProps> = ({
  value,
  onChange,
  onAdd,
  exclude = [],
  placeholder,
  inputClassName,
  buttonClassName,
  buttonLabel = 'Add',
  showButton = true
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = getSkillSuggestions(value, exclude);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const commit = (skill: string) => {
    onAdd(skill);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="flex gap-2 w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(value);
            }
          }}
          placeholder={placeholder}
          className={inputClassName}
        />
        {showButton && (
          <button
            type="button"
            onClick={() => commit(value)}
            className={buttonClassName}
          >
            {buttonLabel}
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl bg-white border border-slate-200 shadow-lg max-h-48 overflow-y-auto py-1">
          {suggestions.map((skill) => (
            <button
              key={skill}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(skill);
                commit(skill);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 cursor-pointer"
            >
              {skill}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};