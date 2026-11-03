import React, { useState } from 'react';
import { COMPLEXITY_PRESETS } from '../../lib/utils.js';
import { ChevronDown } from 'lucide-react';

export default function ComplexityPicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-brand-400 dark:hover:border-brand-500 transition-colors"
      >
        <span className="font-mono">{value || 'Select...'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden">
          {COMPLEXITY_PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => { onChange(preset); setOpen(false); }}
              className={`
                w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors
                ${value === preset ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-zinc-700 dark:text-zinc-300'}
              `}
            >
              {preset}
            </button>
          ))}
          <div className="border-t border-zinc-200 dark:border-zinc-700 p-2">
            <input
              type="text"
              placeholder="Custom (e.g. O(V+E))"
              className="w-full text-xs font-mono px-2 py-1 bg-zinc-100 dark:bg-zinc-700 rounded-md outline-none text-zinc-700 dark:text-zinc-300 placeholder-zinc-400"
              value={COMPLEXITY_PRESETS.includes(value) ? '' : value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
