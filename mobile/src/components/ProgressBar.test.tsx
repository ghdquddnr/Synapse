/**
 * ProgressBar Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ProgressBar, { CircularProgress } from './ProgressBar';

describe('ProgressBar', () => {
  describe('Basic Rendering', () => {
    it('should render progress bar', () => {
      render(<ProgressBar progress={50} />);

      expect(screen.getByTestId('progress-track')).toBeTruthy();
      expect(screen.getByTestId('progress-bar')).toBeTruthy();
    });

    it('should not render label by default', () => {
      render(<ProgressBar progress={50} />);

      expect(screen.queryByTestId('progress-label')).toBeNull();
    });

    it('should render label when showLabel is true', () => {
      render(<ProgressBar progress={50} showLabel={true} />);

      expect(screen.getByTestId('progress-label')).toBeTruthy();
    });
  });

  describe('Progress Values', () => {
    it('should handle 0% progress', () => {
      render(<ProgressBar progress={0} showLabel={true} />);

      expect(screen.getByTestId('progress-label')).toHaveTextContent('0%');
    });

    it('should handle 50% progress', () => {
      render(<ProgressBar progress={50} showLabel={true} />);

      expect(screen.getByTestId('progress-label')).toHaveTextContent('50%');
    });

    it('should handle 100% progress', () => {
      render(<ProgressBar progress={100} showLabel={true} />);

      expect(screen.getByTestId('progress-label')).toHaveTextContent('100%');
    });

    it('should clamp negative progress to 0', () => {
      render(<ProgressBar progress={-10} showLabel={true} />);

      expect(screen.getByTestId('progress-label')).toHaveTextContent('0%');
    });

    it('should clamp progress over 100 to 100', () => {
      render(<ProgressBar progress={150} showLabel={true} />);

      expect(screen.getByTestId('progress-label')).toHaveTextContent('100%');
    });
  });

  describe('Label Formats', () => {
    it('should display percentage format', () => {
      render(<ProgressBar progress={75} showLabel={true} labelFormat="percentage" />);

      expect(screen.getByTestId('progress-label')).toHaveTextContent('75%');
    });

    it('should display count format', () => {
      render(
        <ProgressBar
          progress={50}
          showLabel={true}
          labelFormat="count"
          current={5}
          total={10}
        />
      );

      expect(screen.getByTestId('progress-label')).toHaveTextContent('5 / 10');
    });

    it('should display custom label', () => {
      render(
        <ProgressBar
          progress={50}
          showLabel={true}
          labelFormat="custom"
          customLabel="Processing..."
        />
      );

      expect(screen.getByTestId('progress-label')).toHaveTextContent('Processing...');
    });

    it('should fallback to percentage when count values are missing', () => {
      render(<ProgressBar progress={50} showLabel={true} labelFormat="count" />);

      expect(screen.getByTestId('progress-label')).toHaveTextContent('50%');
    });
  });

  describe('Custom Styling', () => {
    it('should render with custom height prop', () => {
      render(<ProgressBar progress={50} height={12} />);

      expect(screen.getByTestId('progress-track')).toBeTruthy();
      expect(screen.getByTestId('progress-bar')).toBeTruthy();
    });

    it('should render with custom color prop', () => {
      render(<ProgressBar progress={50} color="#FF0000" />);

      expect(screen.getByTestId('progress-bar')).toBeTruthy();
    });

    it('should render with custom background color prop', () => {
      render(<ProgressBar progress={50} backgroundColor="#CCCCCC" />);

      expect(screen.getByTestId('progress-track')).toBeTruthy();
    });

    it('should render with custom container style prop', () => {
      const customStyle = { marginTop: 20 };
      render(<ProgressBar progress={50} style={customStyle} />);

      expect(screen.getByTestId('progress-track')).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should render with animation enabled by default', () => {
      render(<ProgressBar progress={50} />);

      expect(screen.getByTestId('progress-bar')).toBeTruthy();
    });

    it('should render with animation disabled', () => {
      render(<ProgressBar progress={50} animated={false} />);

      expect(screen.getByTestId('progress-bar')).toBeTruthy();
    });
  });
});

describe('CircularProgress', () => {
  describe('Basic Rendering', () => {
    it('should render circular progress', () => {
      render(<CircularProgress progress={50} />);

      expect(screen.getByTestId('circular-progress')).toBeTruthy();
    });

    it('should not render label by default', () => {
      render(<CircularProgress progress={50} />);

      expect(screen.queryByTestId('circular-progress-label')).toBeNull();
    });

    it('should render label when showLabel is true', () => {
      render(<CircularProgress progress={50} showLabel={true} />);

      expect(screen.getByTestId('circular-progress-label')).toBeTruthy();
    });
  });

  describe('Progress Values', () => {
    it('should display 0% progress label', () => {
      render(<CircularProgress progress={0} showLabel={true} />);

      expect(screen.getByTestId('circular-progress-label')).toHaveTextContent('0%');
    });

    it('should display 50% progress label', () => {
      render(<CircularProgress progress={50} showLabel={true} />);

      expect(screen.getByTestId('circular-progress-label')).toHaveTextContent('50%');
    });

    it('should display 100% progress label', () => {
      render(<CircularProgress progress={100} showLabel={true} />);

      expect(screen.getByTestId('circular-progress-label')).toHaveTextContent('100%');
    });
  });

  describe('Custom Sizing', () => {
    it('should apply custom size', () => {
      render(<CircularProgress size={60} />);

      const container = screen.getByTestId('circular-progress');
      expect(container.props.style).toContainEqual(
        expect.objectContaining({ width: 60, height: 60 })
      );
    });

    it('should use default size of 40', () => {
      render(<CircularProgress />);

      const container = screen.getByTestId('circular-progress');
      expect(container.props.style).toContainEqual(
        expect.objectContaining({ width: 40, height: 40 })
      );
    });
  });
});
