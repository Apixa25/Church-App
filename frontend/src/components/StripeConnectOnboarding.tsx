import React, { useState, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import axios from 'axios';
import styled from 'styled-components';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Card = styled.div`
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 10px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
  margin-bottom: 30px;
  line-height: 1.6;
`;

const StatusBadge = styled.div<{ status: 'pending' | 'active' | 'incomplete' }>`
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
  background: ${props => {
    switch (props.status) {
      case 'active': return '#e8f5e9';
      case 'incomplete': return '#fff3e0';
      case 'pending': return '#f5f5f5';
      default: return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'active': return '#2e7d32';
      case 'incomplete': return '#e65100';
      case 'pending': return '#666';
      default: return '#666';
    }
  }};
`;

const InfoBox = styled.div`
  background: #f0f7ff;
  border: 2px solid #4a90e2;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
`;

const InfoTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
`;

const InfoText = styled.div`
  font-size: 14px;
  color: #666;
  line-height: 1.6;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 20px 0;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  font-size: 15px;
  color: #333;

  &:before {
    content: '✓';
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e8f5e9;
    color: #2e7d32;
    border-radius: 50%;
    font-weight: bold;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  ${props => props.variant === 'primary' ? `
    background: #4a90e2;
    color: white;
    &:hover {
      background: #3a7bc8;
    }
  ` : `
    background: white;
    color: #4a90e2;
    border: 2px solid #4a90e2;
    &:hover {
      background: #f0f7ff;
    }
  `}

  &:disabled {
    background: #ccc;
    color: #999;
    cursor: not-allowed;
    border: none;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 40px;
  font-size: 16px;
  color: #666;
`;

const ErrorMessage = styled.div`
  background: #fee;
  border: 2px solid #fcc;
  border-radius: 8px;
  padding: 12px 16px;
  color: #c00;
  margin-bottom: 20px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  background: #efe;
  border: 2px solid #cfc;
  border-radius: 8px;
  padding: 12px 16px;
  color: #090;
  margin-bottom: 20px;
  font-size: 14px;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 20px 0;
`;

const StatCard = styled.div`
  background: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
`;

const StatLabel = styled.div`
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
`;

interface StripeAccountStatus {
  hasAccount: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  country?: string;
  defaultCurrency?: string;
}

interface StripeConnectOnboardingProps {
  organizationId: string;
}

const StripeConnectOnboarding: React.FC<StripeConnectOnboardingProps> = ({ organizationId }) => {
  const { primaryMembership } = useOrganization();
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const token = localStorage.getItem('token');
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  useEffect(() => {
    fetchAccountStatus();
  }, [organizationId]);

  const fetchAccountStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/api/stripe-connect/account-status/${organizationId}`);
      setStatus(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch account status');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      const response = await api.post(`/api/stripe-connect/create-account/${organizationId}`);

      // Redirect to Stripe onboarding
      if (response.data.onboardingUrl) {
        window.location.href = response.data.onboardingUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create Stripe account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleContinueOnboarding = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      const response = await api.post(`/api/stripe-connect/create-account-link/${organizationId}`);

      // Redirect to Stripe onboarding
      if (response.data.onboardingUrl) {
        window.location.href = response.data.onboardingUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create onboarding link');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await api.post(`/api/stripe-connect/create-dashboard-link/${organizationId}`);

      // Open Stripe dashboard in new tab
      if (response.data.dashboardUrl) {
        window.open(response.data.dashboardUrl, '_blank');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to open dashboard');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading Stripe Connect status...</LoadingSpinner>
      </Container>
    );
  }

  // Check if user's primary org matches this org
  const isUsersPrimaryOrg = primaryMembership?.organizationId === organizationId;

  return (
    <Container>
      <Card>
        <Title>Donation Processing Setup</Title>
        <Subtitle>
          Enable your organization to accept online donations through Stripe Connect
        </Subtitle>

        {!isUsersPrimaryOrg && (
          <InfoBox>
            <InfoTitle>Not Your Primary Organization</InfoTitle>
            <InfoText>
              This is not your primary organization. Only administrators of this organization
              can set up donation processing.
            </InfoText>
          </InfoBox>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}

        {/* No Account Yet */}
        {!status?.hasAccount && (
          <>
            <StatusBadge status="pending">Not Set Up</StatusBadge>

            <InfoBox>
              <InfoTitle>Why Stripe Connect?</InfoTitle>
              <InfoText>
                Stripe Connect allows your organization to receive donations directly to your own
                bank account. The Gathering never touches your funds - they go straight from donors
                to your organization.
              </InfoText>
            </InfoBox>

            <FeatureList>
              <FeatureItem>Secure payment processing with industry-leading security</FeatureItem>
              <FeatureItem>Accept credit cards, debit cards, and digital wallets</FeatureItem>
              <FeatureItem>Automatic deposit to your organization's bank account</FeatureItem>
              <FeatureItem>Comprehensive reporting and analytics</FeatureItem>
              <FeatureItem>No monthly fees - only pay per transaction</FeatureItem>
            </FeatureList>

            <ButtonGroup>
              <Button
                variant="primary"
                onClick={handleCreateAccount}
                disabled={actionLoading || !isUsersPrimaryOrg}
              >
                {actionLoading ? 'Creating Account...' : 'Get Started with Stripe'}
              </Button>
            </ButtonGroup>
          </>
        )}

        {/* Account Created but Onboarding Incomplete */}
        {status?.hasAccount && !status?.detailsSubmitted && (
          <>
            <StatusBadge status="incomplete">Onboarding Incomplete</StatusBadge>

            <InfoBox>
              <InfoTitle>Complete Your Setup</InfoTitle>
              <InfoText>
                Your Stripe account has been created, but you need to complete the onboarding
                process to start accepting donations. This includes verifying your organization's
                details and bank account information.
              </InfoText>
            </InfoBox>

            <StatGrid>
              <StatCard>
                <StatLabel>Account ID</StatLabel>
                <StatValue>{status.accountId?.slice(0, 20)}...</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Charges Enabled</StatLabel>
                <StatValue>{status.chargesEnabled ? 'Yes' : 'No'}</StatValue>
              </StatCard>
            </StatGrid>

            <ButtonGroup>
              <Button
                variant="primary"
                onClick={handleContinueOnboarding}
                disabled={actionLoading || !isUsersPrimaryOrg}
              >
                {actionLoading ? 'Loading...' : 'Continue Onboarding'}
              </Button>
            </ButtonGroup>
          </>
        )}

        {/* Account Fully Set Up */}
        {status?.hasAccount && status?.detailsSubmitted && (
          <>
            <StatusBadge status="active">Active</StatusBadge>

            <InfoBox>
              <InfoTitle>Donation Processing Active</InfoTitle>
              <InfoText>
                Your organization is ready to accept online donations! Members can now contribute
                to your organization through the app.
              </InfoText>
            </InfoBox>

            <StatGrid>
              <StatCard>
                <StatLabel>Account ID</StatLabel>
                <StatValue>{status.accountId?.slice(0, 20)}...</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Charges Enabled</StatLabel>
                <StatValue>{status.chargesEnabled ? '✓ Yes' : '✗ No'}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Payouts Enabled</StatLabel>
                <StatValue>{status.payoutsEnabled ? '✓ Yes' : '✗ No'}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Country</StatLabel>
                <StatValue>{status.country?.toUpperCase()}</StatValue>
              </StatCard>
            </StatGrid>

            <ButtonGroup>
              <Button
                variant="primary"
                onClick={handleOpenDashboard}
                disabled={actionLoading || !isUsersPrimaryOrg}
              >
                {actionLoading ? 'Loading...' : 'Open Stripe Dashboard'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleContinueOnboarding}
                disabled={actionLoading || !isUsersPrimaryOrg}
              >
                Update Account Details
              </Button>
            </ButtonGroup>
          </>
        )}
      </Card>
    </Container>
  );
};

export default StripeConnectOnboarding;
