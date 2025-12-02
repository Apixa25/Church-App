import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickActions from './QuickActions';
import dashboardApi from '../services/dashboardApi';
import { useActiveContext } from '../contexts/ActiveContextContext';
import './QuickActionsPage.css';

const QuickActionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasAnyPrimary, activeOrganizationId } = useActiveContext();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await dashboardApi.getDashboardWithAll(
          hasAnyPrimary,
          activeOrganizationId || undefined
        );
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to fetch quick actions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [hasAnyPrimary, activeOrganizationId]);

  return (
    <div className="quick-actions-page">
      <header className="quick-actions-header">
        <button
          className="back-button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ← Back
        </button>
        <h1>Quick Actions</h1>
      </header>

      <main className="quick-actions-content">
        <QuickActions
          actions={dashboardData?.quickActions || []}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
};

export default QuickActionsPage;
