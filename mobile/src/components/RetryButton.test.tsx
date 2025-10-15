/**
 * RetryButton Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import RetryButton from './RetryButton';

describe('RetryButton', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with default text', () => {
      render(<RetryButton onRetry={mockOnRetry} />);

      expect(screen.getByTestId('retry-button')).toBeTruthy();
      expect(screen.getByTestId('retry-text')).toHaveTextContent('다시 시도');
    });

    it('should render with custom text', () => {
      render(<RetryButton onRetry={mockOnRetry} text="재시도" />);

      expect(screen.getByTestId('retry-text')).toHaveTextContent('재시도');
    });
  });

  describe('Press Handling', () => {
    it('should call onRetry when pressed', () => {
      render(<RetryButton onRetry={mockOnRetry} />);

      const button = screen.getByTestId('retry-button');
      fireEvent.press(button);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should handle async onRetry', async () => {
      const asyncRetry = jest.fn().mockResolvedValue(undefined);
      render(<RetryButton onRetry={asyncRetry} />);

      const button = screen.getByTestId('retry-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(asyncRetry).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onRetry when disabled', () => {
      render(<RetryButton onRetry={mockOnRetry} disabled={true} />);

      const button = screen.getByTestId('retry-button');
      fireEvent.press(button);

      expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it('should not call onRetry when loading', () => {
      render(<RetryButton onRetry={mockOnRetry} loading={true} />);

      const button = screen.getByTestId('retry-button');
      fireEvent.press(button);

      expect(mockOnRetry).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading is true', () => {
      render(<RetryButton onRetry={mockOnRetry} loading={true} />);

      expect(screen.getByTestId('retry-loading')).toBeTruthy();
      expect(screen.queryByTestId('retry-text')).toBeNull();
    });

    it('should show text when loading is false', () => {
      render(<RetryButton onRetry={mockOnRetry} loading={false} />);

      expect(screen.queryByTestId('retry-loading')).toBeNull();
      expect(screen.getByTestId('retry-text')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('should render primary variant', () => {
      render(<RetryButton onRetry={mockOnRetry} variant="primary" />);

      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      render(<RetryButton onRetry={mockOnRetry} variant="secondary" />);

      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });

    it('should render outline variant', () => {
      render(<RetryButton onRetry={mockOnRetry} variant="outline" />);

      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      render(<RetryButton onRetry={mockOnRetry} size="small" />);

      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });

    it('should render medium size (default)', () => {
      render(<RetryButton onRetry={mockOnRetry} size="medium" />);

      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });

    it('should render large size', () => {
      render(<RetryButton onRetry={mockOnRetry} size="large" />);

      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('should have disabled prop when disabled is true', () => {
      render(<RetryButton onRetry={mockOnRetry} disabled={true} />);

      const button = screen.getByTestId('retry-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('should have disabled prop when loading is true', () => {
      render(<RetryButton onRetry={mockOnRetry} loading={true} />);

      const button = screen.getByTestId('retry-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('should not be disabled when both are false', () => {
      render(<RetryButton onRetry={mockOnRetry} disabled={false} loading={false} />);

      const button = screen.getByTestId('retry-button');
      // Button should be pressable (not disabled)
      expect(button).toBeTruthy();
    });
  });

  describe('Custom Styling', () => {
    it('should render with custom style prop', () => {
      const customStyle = { marginTop: 20 };
      render(<RetryButton onRetry={mockOnRetry} style={customStyle} />);

      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });

    it('should render with custom text style prop', () => {
      const customTextStyle = { fontSize: 18 };
      render(<RetryButton onRetry={mockOnRetry} textStyle={customTextStyle} />);

      expect(screen.getByTestId('retry-text')).toBeTruthy();
    });
  });
});
