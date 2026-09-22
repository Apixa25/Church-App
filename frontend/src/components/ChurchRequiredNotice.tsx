import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ChurchRequiredNotice.css';

interface ChurchRequiredNoticeProps {
  feature: string;
}

/**
 * Church-life screens (prayer, calendar, announcements, giving) require the
 * user's locked church. Family membership stays on the feed and in messages.
 */
const ChurchRequiredNotice: React.FC<ChurchRequiredNoticeProps> = ({ feature }) => {
  const navigate = useNavigate();

  return (
    <div className="church-required-notice" role="status">
      <h2>A church is required</h2>
      <p>
        {feature} stays with your primary church. Join a church to use it.
        Your family stays on the feed and in messages.
      </p>
      <button type="button" onClick={() => navigate('/organizations?focus=church')}>
        Find a church
      </button>
    </div>
  );
};

export default ChurchRequiredNotice;
