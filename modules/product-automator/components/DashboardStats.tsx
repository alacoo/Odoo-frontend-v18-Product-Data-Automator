
import React from 'react';
import { DashboardStat } from '../types';

interface Props {
  stats: any[]; 
}

export const DashboardStats: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const colorMap: Record<string, string> = {
            'primary': 'text-primary-600 bg-primary-50',
            'secondary': 'text-secondary-600 bg-secondary-50',
            'info': 'text-blue-600 bg-blue-50',
            'success': 'text-green-600 bg-green-50',
            'warning': 'text-amber-600 bg-amber-50',
            'error': 'text-red-600 bg-red-50',
        };

        const colorClass = colorMap[stat.color] || colorMap['primary'];
        
        return (
        <div 
            key={idx} 
            className="group p-4 px-5 rounded-xl border border-gray-200 bg-white dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-between h-[72px] transition-all duration-200 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700"
        >
          <div className="flex-1 min-w-0 me-3">
             <span className="block text-[0.7rem] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                {stat.label}
             </span>
             <span className="block text-xl font-extrabold text-gray-900 dark:text-white truncate" title={String(stat.value)}>
                {stat.value}
             </span>
          </div>
          <div className={`p-2.5 rounded-lg flex items-center justify-center ${colorClass}`}>
             <stat.icon size={20} />
          </div>
        </div>
      )})}
    </div>
  );
};
