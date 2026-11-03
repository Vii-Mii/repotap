import React, { useState } from 'react';
import { TAGS } from '../../lib/utils.js';
import { Search, X } from 'lucide-react';

export default function TagSelector({ selected = [], onChange, onSelectFirstTag }) {
  const [filter, setFilter] = useState('');

  function toggle(id) {
    if (selected.includes(id)) {
      onChange(selected.filter(t => t !== id));
    } else {
      const updated = [...selected, id];
      onChange(updated);
      if (onSelectFirstTag && selected.length === 0) {
        onSelectFirstTag(id);
      }
    }
  }

  const filteredTags = filter.trim()
    ? TAGS.filter(t =>
        t.label.toLowerCase().includes(filter.toLowerCase()) ||
        t.id.toLowerCase().includes(filter.toLowerCase())
      )
    : TAGS;

  return (
    <div className="space-y-2">
      {/* Selected tags list */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 p-1.5 bg-brand-50/50 dark:bg-brand-950/20 rounded-lg border border-brand-200 dark:border-brand-900/50">
          {selected.map(id => {
            const tag = TAGS.find(t => t.id === id) || { id, label: id };
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-500 text-white"
              >
                {tag.label}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(id); }}
                  className="hover:opacity-75"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Filter search bar */}
      <div className="relative">
        <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search tags (e.g. two-pointer, hashing, dp)..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full text-[11px] pl-7 pr-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-brand-400 dark:focus:border-brand-500 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 transition-colors"
        />
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Available tag pills */}
      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
        {filteredTags.map(tag => {
          const isSelected = selected.includes(tag.id);
          return (
            <button
              type="button"
              key={tag.id}
              onClick={() => toggle(tag.id)}
              className={`
                px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border
                ${isSelected
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-brand-400 dark:hover:border-brand-500'
                }
              `}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
