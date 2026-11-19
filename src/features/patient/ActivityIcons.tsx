import { AudioLines, BookOpenText, MessageCircle } from 'lucide-react';
import type { ActivityType } from '../../data/types';

export const ACTIVITY_ICON: Record<ActivityType, typeof AudioLines> = {
  sustained_vowel: AudioLines,
  reading: BookOpenText,
  conversation: MessageCircle,
};

/** The three activities in order (brief §1). */
export const ACTIVITIES: ActivityType[] = ['sustained_vowel', 'reading', 'conversation'];
