import React from 'react';
import { render } from '@testing-library/react-native';
import SyncStatusBanner, { SyncStatus } from './SyncStatusBanner';

describe('SyncStatusBanner', () => {
  it('should not render when status is idle', () => {
    const { queryByTestId } = render(<SyncStatusBanner status="idle" />);
    expect(queryByTestId('sync-status-banner')).toBeNull();
  });

  it('should not render when visible is false', () => {
    const { queryByTestId } = render(<SyncStatusBanner status="syncing" visible={false} />);
    expect(queryByTestId('sync-status-banner')).toBeNull();
  });

  it('should render syncing status with spinner', () => {
    const { getByTestId, getByText } = render(<SyncStatusBanner status="syncing" />);
    expect(getByTestId('sync-status-banner')).toBeTruthy();
    expect(getByTestId('sync-spinner')).toBeTruthy();
    expect(getByText('동기화 중...')).toBeTruthy();
  });

  it('should render success status with icon', () => {
    const { getByTestId, getByText, queryByTestId } = render(<SyncStatusBanner status="success" />);
    expect(getByTestId('sync-status-banner')).toBeTruthy();
    expect(queryByTestId('sync-spinner')).toBeNull();
    expect(getByText('동기화 완료')).toBeTruthy();
  });

  it('should render error status with icon', () => {
    const { getByTestId, getByText } = render(<SyncStatusBanner status="error" />);
    expect(getByTestId('sync-status-banner')).toBeTruthy();
    expect(getByText('동기화 실패')).toBeTruthy();
  });

  it('should render custom message', () => {
    const customMessage = 'Custom sync message';
    const { getByText } = render(<SyncStatusBanner status="syncing" message={customMessage} />);
    expect(getByText(customMessage)).toBeTruthy();
  });

  it('should use default message when no custom message provided', () => {
    const { getByText } = render(<SyncStatusBanner status="syncing" />);
    expect(getByText('동기화 중...')).toBeTruthy();
  });

  it('should render all sync statuses correctly', () => {
    const statuses: SyncStatus[] = ['syncing', 'success', 'error'];

    statuses.forEach(status => {
      const { getByTestId } = render(<SyncStatusBanner status={status} />);
      expect(getByTestId('sync-status-banner')).toBeTruthy();
    });
  });
});
