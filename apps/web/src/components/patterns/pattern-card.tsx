'use client';

import { useState } from 'react';
import { 
  MessageSquareMore, 
  HelpCircle, 
  VolumeX, 
  Scale, 
  Brain, 
  Wrench, 
  Contrast, 
  FastForward,
  Check,
  ChevronDown,
  ChevronUp,
  // Work-specific icons
  Heart,
  Sword,
  Handshake,
  BookOpen,
  Shield,
  ShieldOff,
  Eye,
  User,
  CheckSquare,
  Mail,
  Award,
  type LucideIcon 
} from 'lucide-react';
import type { CommonPattern } from '@mora/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  MessageSquareMore,
  HelpCircle,
  VolumeX,
  Scale,
  Brain,
  Wrench,
  Contrast,
  FastForward,
  // Work-specific
  Heart,
  Sword,
  Handshake,
  BookOpen,
  Shield,
  ShieldOff,
  Eye,
  User,
  CheckSquare,
  Mail,
  Award,
};

interface PatternCardProps {
  pattern: CommonPattern;
  isBookmarked?: boolean;
  onBookmark?: (patternId: string) => void;
  /** Compact view for lists, expanded for detail */
  variant?: 'compact' | 'expanded';
}

export function PatternCard({ 
  pattern, 
  isBookmarked = false, 
  onBookmark,
  variant = 'compact',
}: PatternCardProps) {
  const [isExpanded, setIsExpanded] = useState(variant === 'expanded');
  const [justBookmarked, setJustBookmarked] = useState(false);
  
  const Icon = iconMap[pattern.icon] || MessageSquareMore;

  const handleBookmark = () => {
    onBookmark?.(pattern.id);
    setJustBookmarked(true);
    setTimeout(() => setJustBookmarked(false), 2000);
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      isBookmarked && "border-primary/30 bg-primary/5"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isBookmarked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">{pattern.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pattern.shortDescription}
              </p>
            </div>
          </div>
          
          {variant === 'compact' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed">
            {pattern.longDescription}
          </p>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              What it sounds like
            </p>
            <ul className="space-y-1">
              {pattern.examples.slice(0, 3).map((example, i) => (
                <li key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-muted">
                  {example}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              What to try instead
            </p>
            <p className="text-sm">
              {pattern.alternative}
            </p>
          </div>

          {onBookmark && (
            <Button
              variant={isBookmarked ? "secondary" : "outline"}
              className="w-full"
              onClick={handleBookmark}
              disabled={justBookmarked}
            >
              {justBookmarked ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              ) : isBookmarked ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  This applies to me
                </>
              ) : (
                "This applies to me"
              )}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
