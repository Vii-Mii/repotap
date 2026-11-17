import React from 'react';
import { Flame, Trophy } from 'lucide-react';
import { localDateKey } from '../../../lib/storage.js';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dayHasActivity(entry) {
  return Boolean(entry && ((entry.accepted || 0) + (entry.commits || 0) > 0));
}

function intensity(entry) {
  const total = (entry?.accepted || 0) + (entry?.commits || 0);
  if (total <= 0) return 'bg-zinc-200 dark:bg-zinc-800';
  if (total === 1) return 'bg-orange-200 dark:bg-orange-900/60';
  if (total <= 3) return 'bg-orange-400 dark:bg-orange-600';
  return 'bg-orange-500 dark:bg-orange-500';
}

export default function StreakCard({ streak, bestStreak, activity }) {
  // Last 7 days, oldest first
  const days = [];
  const cursor = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i);
    const key = localDateKey(d);
    days.push({
      key,
      label: DAY_LABELS[d.getDay()],
      entry: activity[key],
      isToday: i === 0,
    });
  }

  const totalToday = activity[localDateKey()] || { accepted: 0, commits: 0 };
  const todayCount = (totalToday.accepted || 0) + (totalToday.commits || 0);

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-800/80 dark:to-zinc-800/40 border border-orange-200 dark:border-zinc-700 rounded-xl p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${streak > 0 ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
            <Flame className={`w-5 h-5 ${streak > 0 ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              {streak > 0 ? `${streak} day streak` : 'No streak yet'}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {todayCount > 0
                ? `${todayCount} action${todayCount === 1 ? '' : 's'} today — keep it going!`
                : 'Solve or commit today to start a streak'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
          <Trophy className="w-3 h-3 text-amber-500" />
          <span>Best: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{bestStreak}</span></span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        {days.map(d => (
          <div key={d.key} className="flex flex-col items-center gap-1">
            <div
              title={`${d.key}: ${d.entry ? `${d.entry.accepted || 0} accepted, ${d.entry.commits || 0} commits` : 'no activity'}`}
              className={`w-6 h-6 rounded-md ${intensity(d.entry)} ${d.isToday ? 'ring-2 ring-orange-400 dark:ring-orange-500 ring-offset-1 ring-offset-transparent' : ''}`}
            />
            <span className={`text-[9px] ${d.isToday ? 'font-bold text-orange-500 dark:text-orange-400' : 'text-zinc-400'}`}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}