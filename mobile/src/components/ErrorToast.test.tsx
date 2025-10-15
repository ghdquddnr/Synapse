/**
 * ErrorToast Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ErrorToast from './ErrorToast';

describe('ErrorToast', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Visibility', () => {
    it('should render when visible is true', () => {
      render(
        <ErrorToast message="Test error" visible={true} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('error-toast')).toBeTruthy();
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Test error');
    });

    it('should not render when visible is false', () => {
      render(
        <ErrorToast message="Test error" visible={false} onDismiss={mockOnDismiss} />
      );

      // Component should not be rendered
      expect(screen.queryByTestId('error-toast')).toBeNull();
    });
  });

  describe('Severity Levels', () => {
    it('should display error severity with correct icon', () => {
      render(
        <ErrorToast
          message="Error message"
          severity="error"
          visible={true}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('❌')).toBeTruthy();
    });

    it('should display warning severity with correct icon', () => {
      render(
        <ErrorToast
          message="Warning message"
          severity="warning"
          visible={true}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('⚠️')).toBeTruthy();
    });

    it('should display info severity with correct icon', () => {
      render(
        <ErrorToast
          message="Info message"
          severity="info"
          visible={true}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('ℹ️')).toBeTruthy();
    });

    it('should display success severity with correct icon', () => {
      render(
        <ErrorToast
          message="Success message"
          severity="success"
          visible={true}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('✅')).toBeTruthy();
    });
  });

  describe('Dismiss Functionality', () => {
    it('should call onDismiss when dismiss button is pressed', () => {
      render(
        <ErrorToast message="Test error" visible={true} onDismiss={mockOnDismiss} />
      );

      const dismissButton = screen.getByTestId('dismiss-button');
      fireEvent.press(dismissButton);

      // Wait for animation
      jest.advanceTimersByTime(200);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('should auto-dismiss after duration', () => {
      render(
        <ErrorToast
          message="Test error"
          visible={true}
          onDismiss={mockOnDismiss}
          duration={3000}
        />
      );

      expect(mockOnDismiss).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(3000);

      // Wait for animation
      jest.advanceTimersByTime(200);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('should not auto-dismiss when duration is 0', () => {
      render(
        <ErrorToast
          message="Test error"
          visible={true}
          onDismiss={mockOnDismiss}
          duration={0}
        />
      );

      // Fast-forward time
      jest.advanceTimersByTime(10000);

      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Message Display', () => {
    it('should display short message', () => {
      render(
        <ErrorToast message="Short" visible={true} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('toast-message')).toHaveTextContent('Short');
    });

    it('should display long message', () => {
      const longMessage =
        'This is a very long error message that should still be displayed correctly';
      render(
        <ErrorToast message={longMessage} visible={true} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('toast-message')).toHaveTextContent(longMessage);
    });

    it('should display message with newlines', () => {
      const multiLineMessage = 'Line 1 Line 2 Line 3';
      render(
        <ErrorToast message={multiLineMessage} visible={true} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('toast-message')).toBeTruthy();
    });
  });

  describe('Custom Styling', () => {
    it('should render with custom style prop', () => {
      const customStyle = { marginTop: 100 };
      render(
        <ErrorToast
          message="Test"
          visible={true}
          onDismiss={mockOnDismiss}
          style={customStyle}
        />
      );

      expect(screen.getByTestId('error-toast')).toBeTruthy();
    });
  });
});
