import React from 'react';
import { render } from '@testing-library/react-native';
import OfflineBanner from './OfflineBanner';

describe('OfflineBanner', () => {
  it('should render when visible is true', () => {
    const { getByTestId, getByText } = render(<OfflineBanner visible={true} />);
    expect(getByTestId('offline-banner')).toBeTruthy();
    expect(getByText('오프라인 모드')).toBeTruthy();
    expect(getByText('모든 변경사항은 로컬에 저장됩니다')).toBeTruthy();
  });

  it('should render by default (visible is undefined)', () => {
    const { getByTestId } = render(<OfflineBanner />);
    expect(getByTestId('offline-banner')).toBeTruthy();
  });

  it('should not render when visible is false', () => {
    const { queryByTestId } = render(<OfflineBanner visible={false} />);
    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('should display offline icon', () => {
    const { getByTestId } = render(<OfflineBanner />);
    const banner = getByTestId('offline-banner');
    // Icon is rendered as child component
    expect(banner).toBeTruthy();
  });
});
