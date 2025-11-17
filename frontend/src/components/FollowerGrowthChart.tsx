import React from 'react';
import './FollowerGrowthChart.css';

interface ChartDataPoint {
  date: string;
  followers: number;
  following?: number;
}

interface FollowerGrowthChartProps {
  data: ChartDataPoint[];
}

const FollowerGrowthChart: React.FC<FollowerGrowthChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No data available for the selected period</p>
      </div>
    );
  }

  // Sort data by date (oldest first for chart)
  const sortedData = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate chart dimensions
  const maxFollowers = Math.max(...sortedData.map(d => d.followers), 1);
  const minFollowers = Math.min(...sortedData.map(d => d.followers), 0);
  const range = maxFollowers - minFollowers || 1;

  // Calculate points for the line
  const points = sortedData.map((point, index) => {
    const x = (index / (sortedData.length - 1 || 1)) * 100;
    const y = 100 - ((point.followers - minFollowers) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  // Format dates for x-axis
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="follower-growth-chart">
      <div className="chart-header">
        <h3>Follower Growth Over Time</h3>
      </div>
      <div className="chart-container">
        <svg viewBox="0 0 100 100" className="chart-svg" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="var(--border-primary)"
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}
          
          {/* Area fill */}
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="var(--accent-primary)"
            opacity="0.1"
          />
          
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {sortedData.map((point, index) => {
            const x = (index / (sortedData.length - 1 || 1)) * 100;
            const y = 100 - ((point.followers - minFollowers) / range) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                fill="var(--accent-primary)"
                className="chart-point"
              />
            );
          })}
        </svg>
        
        {/* Y-axis labels */}
        <div className="y-axis-labels">
          <span>{maxFollowers}</span>
          <span>{Math.round((maxFollowers + minFollowers) / 2)}</span>
          <span>{minFollowers}</span>
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="x-axis-labels">
        {sortedData.length > 0 && (
          <>
            <span>{formatDate(sortedData[0].date)}</span>
            {sortedData.length > 1 && sortedData.length % 2 === 0 && (
              <span>{formatDate(sortedData[Math.floor(sortedData.length / 2)].date)}</span>
            )}
            <span>{formatDate(sortedData[sortedData.length - 1].date)}</span>
          </>
        )}
      </div>
      
      {/* Legend */}
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
          <span>Followers</span>
        </div>
      </div>
    </div>
  );
};

export default FollowerGrowthChart;

