import { useCallback } from 'react';
import { highlightParts } from '../utils/highlighting';

export const useHighlight = () => {
  const renderHighlight = useCallback((value?: string, query?: string) => {
    if (!value || !query) {
      return value || null;
    }
    const segments = highlightParts(value, query);
    if (!segments.length) {
      return value;
    }
    return segments.map((segment, index) =>
      segment.match ? (
        <mark
          key={`${value}-${index}`}
          className="rounded-sm bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-400/30"
        >
          {segment.text}
        </mark>
      ) : (
        <span key={`${value}-${index}`}>{segment.text}</span>
      )
    );
  }, []);

  return { renderHighlight };
};