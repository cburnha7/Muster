import React from 'react';
import { render } from '@testing-library/react-native';
import { CancellationPolicyDisplay } from '../../../src/components/facilities/CancellationPolicyDisplay';

describe('CancellationPolicyDisplay', () => {
  it('renders the cancellation policy header', () => {
    const { getByText } = render(
      <CancellationPolicyDisplay
        noticeWindowHours={24}
        teamPenaltyPct={50}
        penaltyDestination="facility"
      />
    );

    expect(getByText('Cancellation Policy')).toBeTruthy();
  });

  it('displays notice window in plain language', () => {
    const { getByText } = render(
      <CancellationPolicyDisplay
        noticeWindowHours={24}
        teamPenaltyPct={50}
        penaltyDestination="facility"
      />
    );

    expect(getByText('Cancel at least 24 hours before game time for a full refund.')).toBeTruthy();
  });

  it('uses singular "hour" when notice window is 1', () => {
    const { getByText } = render(
      <CancellationPolicyDisplay
        noticeWindowHours={1}
        teamPenaltyPct={50}
        penaltyDestination="facility"
      />
    );

    expect(getByText('Cancel at least 1 hour before game time for a full refund.')).toBeTruthy();
  });

  it('handles 0 hour notice window', () => {
    const { getByText } = render(
      <CancellationPolicyDisplay
        noticeWindowHours={0}
        teamPenaltyPct={50}
        penaltyDestination="facility"
      />
    );

    expect(getByText('Cancel any time before game start for a full refund.')).toBeTruthy();
  });

  it('displays penalty percentage', () => {
    const { getByText } = render(
      <CancellationPolicyDisplay
        noticeWindowHours={24}
        teamPenaltyPct={50}
        penaltyDestination="facility"
      />
    );

    expect(getByText('Late cancellations forfeit 50% of your escrow.')).toBeTruthy();
  });

  it('shows no penalty message when teamPenaltyPct is 0', () => {
    const { getByText, queryByText } = render(
      <CancellationPolicyDisplay
        noticeWindowHours={24}
        teamPenaltyPct={0}
        penaltyDestination="facility"
      />
    );

    expect(getByText('No penalty for late cancellations.')).toBeTruthy();
    expect(queryByText(/Penalty goes to/)).toBeNull();
  });

  it('shows full escrow forfeited when teamPenaltyPct is 100', () => {
    const { getByText } = render(
      <CancellationPolicyDisplay
        noticeWindowHours={24}
        teamPenaltyPct={100}
        penaltyDestination="facility"
      />
    );

    expect(getByText('Late cancellations forfeit your full escrow.')).toBeTruthy();
  });

  it('displays facility as penalty destination', () => {
    const { getByText } = render(
      <CancellationPolicyDisplay
        noticeWindowHours={24}
        teamPenaltyPct={50}
        penaltyDestination="facility"
      />
    );

    expect(getByText('Penalty goes to: the facility.')).toBeTruthy();
  });

  it('displays opposing roster as penalty destination', () => {
    const { getByText } = render(
      <CancellationPolicyDisplay
        noticeWindowHours={24}
        teamPenaltyPct={50}
        penaltyDestination="opposing_team"
      />
    );

    expect(getByText('Penalty goes to: the opposing roster.')).toBeTruthy();
  });

  it('displays split as penalty destination', () => {
    const { getByText } = render(
      <CancellationPolicyDisplay
        noticeWindowHours={48}
        teamPenaltyPct={25}
        penaltyDestination="split"
      />
    );

    expect(getByText('Penalty goes to: split between facility and opposing roster.')).toBeTruthy();
  });
});
