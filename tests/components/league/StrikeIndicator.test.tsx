import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StrikeIndicator } from '../../../src/components/league/StrikeIndicator';

describe('StrikeIndicator', () => {
  it('renders nothing when strikeCount is 0', () => {
    const { toJSON } = render(
      <StrikeIndicator strikeCount={0} rosterName="Net Ninjas" />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders a warning badge for 1 strike', () => {
    const { getByText, queryByText } = render(
      <StrikeIndicator strikeCount={1} rosterName="Net Ninjas" />
    );
    expect(getByText('1 strike')).toBeTruthy();
    expect(queryByText('Remove Roster')).toBeNull();
  });

  it('renders a warning badge for 2 strikes without remove button', () => {
    const { getByText, queryByText } = render(
      <StrikeIndicator strikeCount={2} rosterName="Net Ninjas" />
    );
    expect(getByText('2 strikes')).toBeTruthy();
    expect(queryByText('Remove Roster')).toBeNull();
  });

  it('renders a danger badge and remove button at 3 strikes', () => {
    const onRemove = jest.fn();
    const { getByText } = render(
      <StrikeIndicator strikeCount={3} rosterName="Net Ninjas" onRemoveRoster={onRemove} />
    );
    expect(getByText('3 strikes')).toBeTruthy();
    expect(getByText('Remove Roster')).toBeTruthy();
  });

  it('calls onRemoveRoster when remove button is pressed', () => {
    const onRemove = jest.fn();
    const { getByText } = render(
      <StrikeIndicator strikeCount={3} rosterName="Net Ninjas" onRemoveRoster={onRemove} />
    );
    fireEvent.press(getByText('Remove Roster'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders remove button for strikes above threshold', () => {
    const onRemove = jest.fn();
    const { getByText } = render(
      <StrikeIndicator strikeCount={5} rosterName="Net Ninjas" onRemoveRoster={onRemove} />
    );
    expect(getByText('5 strikes')).toBeTruthy();
    expect(getByText('Remove Roster')).toBeTruthy();
  });

  it('does not render remove button at threshold when no handler provided', () => {
    const { getByText, queryByText } = render(
      <StrikeIndicator strikeCount={3} rosterName="Net Ninjas" />
    );
    expect(getByText('3 strikes')).toBeTruthy();
    expect(queryByText('Remove Roster')).toBeNull();
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(
      <StrikeIndicator strikeCount={2} rosterName="Net Ninjas" />
    );
    expect(getByLabelText('Net Ninjas has 2 strikes')).toBeTruthy();
  });
});
