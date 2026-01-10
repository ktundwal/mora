'use client';

import { useState, useCallback } from 'react';
import { COMMON_PATTERNS, type CommonPattern } from '@mora/core';
import { PatternCard } from './pattern-card';

interface PatternListProps {
  /** Which patterns to show. Defaults to all. */
  patterns?: CommonPattern[];
  /** Already bookmarked pattern IDs */
  bookmarkedIds?: string[];
  /** Called when user bookmarks a pattern */
  onBookmark?: (patternId: string) => void;
  /** Maximum patterns to show (useful for preview) */
  maxPatterns?: number;
  /** Title above the list */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
}

export function PatternList({
  patterns = COMMON_PATTERNS,
  bookmarkedIds = [],
  onBookmark,
  maxPatterns,
  title,
  subtitle,
}: PatternListProps) {
  // Local state for optimistic UI when no onBookmark provided
  const [localBookmarks, setLocalBookmarks] = useState<Set<string>>(
    new Set(bookmarkedIds)
  );

  const handleBookmark = useCallback((patternId: string) => {
    setLocalBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(patternId)) {
        next.delete(patternId);
      } else {
        next.add(patternId);
      }
      return next;
    });
    onBookmark?.(patternId);
  }, [onBookmark]);

  const displayPatterns = maxPatterns 
    ? patterns.slice(0, maxPatterns) 
    : patterns;

  return (
    <div className="space-y-4">
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        {displayPatterns.map(pattern => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            isBookmarked={localBookmarks.has(pattern.id)}
            onBookmark={handleBookmark}
            variant="compact"
          />
        ))}
      </div>

      {maxPatterns && patterns.length > maxPatterns && (
        <p className="text-sm text-muted-foreground text-center">
          + {patterns.length - maxPatterns} more patterns
        </p>
      )}
    </div>
  );
}
