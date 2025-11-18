import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  createConnectAccount,
  getAccountStatus,
  createOnboardingLink,
  getAccountBalance,
  StripeAccountStatus,
  StripeAccountBalance
} from '../services/stripeConnectApi';

interface StripeConnectSetupProps {
  organizationId: string;
  organizationName: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

const StripeConnectSetup: React.FC<StripeConnectSetupProps> = ({
  organizationId,
  organizationName,
  onSuccess,
  onClose
}) => {
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);
  const [balance, setBalance] = useState<StripeAccountBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAccountStatus();
  }, [organizationId]);

  const loadAccountStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const accountStatus = await getAccountStatus(organizationId);
      setStatus(accountStatus);

      // If account exists and is fully set up, load balance
      if (accountStatus.hasAccount && accountStatus.chargesEnabled) {
        try {
          const accountBalance = await getAccountBalance(organizationId);
          setBalance(accountBalance);
        } catch (err) {
          console.error('Could not load balance:', err);
        }
      }
    } catch (err: any) {
      console.error('Error loading account status:', err);
      setError(err.response?.data?.error || 'Failed to load account status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupAccount = async () => {
    try {
      setIsCreating(true);
      setError(null);
      setSuccess(null);

      const result = await createConnectAccount(organizationId);
      
      setSuccess('Stripe Connect account created! Redirecting to onboarding...');
      
      // Redirect to Stripe's onboarding page
      setTimeout(() => {
        window.location.href = result.onboardingUrl;
      }, 1500);

    } catch (err: any) {
      console.error('Error creating account:', err);
      setError(err.response?.data?.error || 'Failed to create Stripe Connect account');
    } finally {
      setIsCreating(false);
    }
  };

  const handleContinueOnboarding = async () => {
    try {
      setIsCreating(true);
      setError(null);

      const result = await createOnboardingLink(organizationId);
      
      // Redirect to Stripe's onboarding page
      window.location.href = result.url;

    } catch (err: any) {
      console.error('Error creating onboarding link:', err);
      setError(err.response?.data?.error || 'Failed to create onboarding link');
    } finally {
      setIsCreating(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100); // Stripe amounts are in cents
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingState>
          <Spinner />
          <p>Loading Stripe Connect status...</p>
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>💳 Donation Processing Setup</Title>
        <Subtitle>Configure Stripe Connect for {organizationName}</Subtitle>
      </Header>

      {error && (
        <Alert type="error">
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {success && (
        <Alert type="success">
          <strong>Success!</strong> {success}
        </Alert>
      )}

      {!status?.hasAccount && (
        <Section>
          <SectionTitle>🚀 Get Started with Donations</SectionTitle>
          <InfoBox>
            <InfoIcon>ℹ️</InfoIcon>
            <div>
              <p><strong>Enable donation processing for your organization</strong></p>
              <p>Stripe Connect allows you to securely accept donations directly to your bank account.</p>
            </div>
          </InfoBox>

          <FeatureList>
            <Feature>
              <FeatureIcon>✅</FeatureIcon>
              <div>
                <strong>Secure & Compliant</strong>
                <p>PCI-compliant payment processing by Stripe</p>
              </div>
            </Feature>
            <Feature>
              <FeatureIcon>💰</FeatureIcon>
              <div>
                <strong>Direct Deposits</strong>
                <p>Donations go directly to your bank account</p>
              </div>
            </Feature>
            <Feature>
              <FeatureIcon>📊</FeatureIcon>
              <div>
                <strong>Detailed Reports</strong>
                <p>Track all donations with comprehensive analytics</p>
              </div>
            </Feature>
            <Feature>
              <FeatureIcon>🔄</FeatureIcon>
              <div>
                <strong>Recurring Giving</strong>
                <p>Support weekly, monthly, and yearly donations</p>
              </div>
            </Feature>
          </FeatureList>

          <ButtonGroup>
            <PrimaryButton 
              onClick={handleSetupAccount} 
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Spinner small /> Setting up...
                </>
              ) : (
                <>
                  🚀 Setup Donations
                </>
              )}
            </PrimaryButton>
            {onClose && (
              <SecondaryButton onClick={onClose}>
                Cancel
              </SecondaryButton>
            )}
          </ButtonGroup>
        </Section>
      )}

      {status?.hasAccount && !status.chargesEnabled && (
        <Section>
          <SectionTitle>⚠️ Complete Your Setup</SectionTitle>
          <InfoBox type="warning">
            <InfoIcon>⚠️</InfoIcon>
            <div>
              <p><strong>Account setup incomplete</strong></p>
              <p>Your Stripe Connect account needs additional information before you can accept donations.</p>
            </div>
          </InfoBox>

          {status.requiresInformation && status.currentlyDue && status.currentlyDue.length > 0 && (
            <RequirementsList>
              <h4>Required Information:</h4>
              <ul>
                {status.currentlyDue.map((req, index) => (
                  <li key={index}>{formatRequirement(req)}</li>
                ))}
              </ul>
            </RequirementsList>
          )}

          <ButtonGroup>
            <PrimaryButton 
              onClick={handleContinueOnboarding} 
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Spinner small /> Loading...
                </>
              ) : (
                <>
                  ✍️ Continue Setup
                </>
              )}
            </PrimaryButton>
            <SecondaryButton onClick={loadAccountStatus}>
              🔄 Refresh Status
            </SecondaryButton>
          </ButtonGroup>
        </Section>
      )}

      {status?.hasAccount && status.chargesEnabled && (
        <Section>
          <SectionTitle>✅ Donations Enabled</SectionTitle>
          <InfoBox type="success">
            <InfoIcon>✅</InfoIcon>
            <div>
              <p><strong>Your organization is ready to accept donations!</strong></p>
              <p>Stripe Connect Account ID: <code>{status.accountId}</code></p>
            </div>
          </InfoBox>

          <StatusGrid>
            <StatusCard>
              <StatusIcon>💳</StatusIcon>
              <StatusLabel>Card Payments</StatusLabel>
              <StatusValue>{status.chargesEnabled ? '✅ Enabled' : '❌ Disabled'}</StatusValue>
            </StatusCard>
            <StatusCard>
              <StatusIcon>💰</StatusIcon>
              <StatusLabel>Payouts</StatusLabel>
              <StatusValue>{status.payoutsEnabled ? '✅ Enabled' : '⏳ Pending'}</StatusValue>
            </StatusCard>
            <StatusCard>
              <StatusIcon>📋</StatusIcon>
              <StatusLabel>Details</StatusLabel>
              <StatusValue>{status.detailsSubmitted ? '✅ Complete' : '⚠️ Incomplete'}</StatusValue>
            </StatusCard>
          </StatusGrid>

          {balance && (
            <BalanceSection>
              <h4>💰 Account Balance</h4>
              <BalanceGrid>
                <BalanceCard>
                  <BalanceLabel>Available</BalanceLabel>
                  <BalanceAmount>
                    {balance.available.length > 0
                      ? formatCurrency(balance.available[0].amount, balance.available[0].currency)
                      : '$0.00'}
                  </BalanceAmount>
                  <BalanceNote>Ready for payout</BalanceNote>
                </BalanceCard>
                <BalanceCard>
                  <BalanceLabel>Pending</BalanceLabel>
                  <BalanceAmount>
                    {balance.pending.length > 0
                      ? formatCurrency(balance.pending[0].amount, balance.pending[0].currency)
                      : '$0.00'}
                  </BalanceAmount>
                  <BalanceNote>Processing</BalanceNote>
                </BalanceCard>
              </BalanceGrid>
            </BalanceSection>
          )}

          <ButtonGroup>
            <SecondaryButton onClick={loadAccountStatus}>
              🔄 Refresh Status
            </SecondaryButton>
            {onClose && (
              <SecondaryButton onClick={onClose}>
                Close
              </SecondaryButton>
            )}
          </ButtonGroup>
        </Section>
      )}
    </Container>
  );
};

// Helper function to format Stripe requirement names
const formatRequirement = (requirement: string): string => {
  const mapping: Record<string, string> = {
    'business_profile.url': 'Organization website URL',
    'business_profile.mcc': 'Business category',
    'external_account': 'Bank account information',
    'tos_acceptance.date': 'Terms of service acceptance',
    'tos_acceptance.ip': 'Terms acceptance confirmation',
    'representative.first_name': 'Representative first name',
    'representative.last_name': 'Representative last name',
    'representative.dob': 'Representative date of birth',
    'representative.address': 'Representative address',
    'representative.ssn_last_4': 'Representative SSN (last 4 digits)',
    'company.tax_id': 'Organization tax ID (EIN)',
    'company.address': 'Organization address',
    'company.phone': 'Organization phone number'
  };
  
  return mapping[requirement] || requirement.replace(/_/g, ' ').replace(/\./g, ' - ');
};

// Styled Components
const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 30px;
`;

const Title = styled.h2`
  font-size: 28px;
  color: #1a1a1a;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
`;

const Section = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  margin-bottom: 20px;
  color: #1a1a1a;
`;

const Alert = styled.div<{ type: 'error' | 'success' | 'warning' }>`
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  background: ${props =>
    props.type === 'error' ? '#fee' :
    props.type === 'success' ? '#efe' :
    '#fff3cd'};
  border: 1px solid ${props =>
    props.type === 'error' ? '#fcc' :
    props.type === 'success' ? '#cfc' :
    '#ffeaa7'};
  color: ${props =>
    props.type === 'error' ? '#c33' :
    props.type === 'success' ? '#2c7' :
    '#856404'};
`;

const InfoBox = styled.div<{ type?: 'info' | 'warning' | 'success' }>`
  display: flex;
  gap: 15px;
  padding: 20px;
  border-radius: 8px;
  background: ${props =>
    props.type === 'warning' ? '#fff8e1' :
    props.type === 'success' ? '#f0f9ff' :
    '#f5f7fa'};
  border: 1px solid ${props =>
    props.type === 'warning' ? '#ffe082' :
    props.type === 'success' ? '#bfdbfe' :
    '#e1e8ed'};
  margin-bottom: 20px;

  p {
    margin: 5px 0;
    color: #1a1a1a;
  }

  code {
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
  }
`;

const InfoIcon = styled.div`
  font-size: 24px;
  flex-shrink: 0;
`;

const FeatureList = styled.div`
  display: grid;
  gap: 15px;
  margin: 25px 0;
`;

const Feature = styled.div`
  display: flex;
  gap: 15px;
  align-items: start;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;

  strong {
    display: block;
    margin-bottom: 4px;
    color: #1a1a1a;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
`;

const FeatureIcon = styled.div`
  font-size: 24px;
  flex-shrink: 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 25px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: #4CAF50;
  color: white;

  &:hover:not(:disabled) {
    background: #45a049;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }
`;

const SecondaryButton = styled(Button)`
  background: #f5f5f5;
  color: #333;

  &:hover:not(:disabled) {
    background: #e0e0e0;
  }
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 20px 0;
`;

const StatusCard = styled.div`
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
`;

const StatusIcon = styled.div`
  font-size: 32px;
  margin-bottom: 10px;
`;

const StatusLabel = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
`;

const StatusValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
`;

const BalanceSection = styled.div`
  margin-top: 30px;
  padding-top: 30px;
  border-top: 2px solid #f0f0f0;

  h4 {
    margin-bottom: 15px;
    color: #1a1a1a;
  }
`;

const BalanceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
`;

const BalanceCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const BalanceLabel = styled.div`
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
`;

const BalanceAmount = styled.div`
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
`;

const BalanceNote = styled.div`
  font-size: 13px;
  opacity: 0.8;
`;

const RequirementsList = styled.div`
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;

  h4 {
    margin: 0 0 12px 0;
    color: #856404;
  }

  ul {
    margin: 0;
    padding-left: 25px;
    color: #856404;
  }

  li {
    margin: 6px 0;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #666;

  p {
    margin-top: 20px;
  }
`;

const Spinner = styled.div<{ small?: boolean }>`
  border: ${props => props.small ? '2px' : '4px'} solid #f3f3f3;
  border-top: ${props => props.small ? '2px' : '4px'} solid #4CAF50;
  border-radius: 50%;
  width: ${props => props.small ? '16px' : '40px'};
  height: ${props => props.small ? '16px' : '40px'};
  animation: spin 1s linear infinite;
  margin: ${props => props.small ? '0' : '0 auto'};

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export default StripeConnectSetup;

