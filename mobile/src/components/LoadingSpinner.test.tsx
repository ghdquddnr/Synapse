import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render spinner', () => {
    const { getByTestId } = render(<LoadingSpinner />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('should render with message', () => {
    const { getByTestId, getByText } = render(<LoadingSpinner message="Loading data..." />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
    expect(getByText('Loading data...')).toBeTruthy();
  });

  it('should render without message', () => {
    const { getByTestId, queryByTestId } = render(<LoadingSpinner />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
    expect(queryByTestId('loading-message')).toBeNull();
  });

  it('should render with small size', () => {
    const { getByTestId } = render(<LoadingSpinner size="small" />);
    const indicator = getByTestId('activity-indicator');
    expect(indicator.props.size).toBe('small');
  });

  it('should render with large size', () => {
    const { getByTestId } = render(<LoadingSpinner size="large" />);
    const indicator = getByTestId('activity-indicator');
    expect(indicator.props.size).toBe('large');
  });

  it('should render with custom color', () => {
    const customColor = '#FF0000';
    const { getByTestId } = render(<LoadingSpinner color={customColor} />);
    const indicator = getByTestId('activity-indicator');
    expect(indicator.props.color).toBe(customColor);
  });

  it('should render in fullScreen mode', () => {
    const { getByTestId } = render(<LoadingSpinner fullScreen />);
    const container = getByTestId('loading-spinner');
    expect(container.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ flex: 1 })])
    );
  });
});
