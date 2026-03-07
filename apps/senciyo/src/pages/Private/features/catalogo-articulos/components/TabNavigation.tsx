// src/features/catalogo-articulos/components/TabNavigation.tsx

import React from 'react';
import type { TabKey } from '../models/types';

interface Tab {
  key: TabKey;
  label: string;
  count?: number;
}

interface TabNavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  tabs: Tab[];
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  tabs
}) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`
              group relative inline-flex items-center py-4 px-1 font-medium text-sm transition-all duration-200
              ${activeTab === tab.key
                ? 'text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
            aria-current={activeTab === tab.key ? 'page' : undefined}
          >
            <span className="flex items-center">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`
                    ml-2 py-0.5 px-2 rounded-full text-xs font-medium
                    ${activeTab === tab.key
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300'
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {/* Active indicator */}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full"></div>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;