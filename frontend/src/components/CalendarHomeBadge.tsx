import React from 'react';
import { getCalendarHomeLabel } from '../types/Event';
import './CalendarHomeBadge.css';

interface CalendarHomeBadgeProps {
  organizationType?: string;
}

const CalendarHomeBadge: React.FC<CalendarHomeBadgeProps> = ({ organizationType }) => {
  const label = getCalendarHomeLabel(organizationType);
  if (!label) return null;

  return (
    <span className={`calendar-home-badge ${label === 'Family' ? 'family' : 'church'}`}>
      {label}
    </span>
  );
};

export default CalendarHomeBadge;
