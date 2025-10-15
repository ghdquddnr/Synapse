import React from 'react';
import { render } from '@testing-library/react-native';
import SkeletonLoader, { SkeletonNoteCard, SkeletonSearchResult, SkeletonReflection } from './SkeletonLoader';

describe('SkeletonLoader', () => {
  it('should render skeleton', () => {
    const { getByTestId } = render(<SkeletonLoader />);
    expect(getByTestId('skeleton-loader')).toBeTruthy();
  });

  it('should render with custom width', () => {
    const { getByTestId } = render(<SkeletonLoader width={200} />);
    const skeleton = getByTestId('skeleton-loader');
    expect(skeleton.props.style).toMatchObject(
      expect.objectContaining({ width: 200 })
    );
  });

  it('should render with custom height', () => {
    const { getByTestId } = render(<SkeletonLoader height={40} />);
    const skeleton = getByTestId('skeleton-loader');
    expect(skeleton.props.style).toMatchObject(
      expect.objectContaining({ height: 40 })
    );
  });

  it('should render with custom border radius', () => {
    const { getByTestId } = render(<SkeletonLoader borderRadius={8} />);
    const skeleton = getByTestId('skeleton-loader');
    expect(skeleton.props.style).toMatchObject(
      expect.objectContaining({ borderRadius: 8 })
    );
  });

  it('should render with percentage width', () => {
    const { getByTestId } = render(<SkeletonLoader width="50%" />);
    const skeleton = getByTestId('skeleton-loader');
    expect(skeleton.props.style).toMatchObject(
      expect.objectContaining({ width: '50%' })
    );
  });
});

describe('SkeletonNoteCard', () => {
  it('should render note card skeleton', () => {
    const { getByTestId } = render(<SkeletonNoteCard />);
    expect(getByTestId('skeleton-note-card')).toBeTruthy();
  });
});

describe('SkeletonSearchResult', () => {
  it('should render search result skeleton', () => {
    const { getByTestId } = render(<SkeletonSearchResult />);
    expect(getByTestId('skeleton-search-result')).toBeTruthy();
  });
});

describe('SkeletonReflection', () => {
  it('should render reflection skeleton', () => {
    const { getByTestId } = render(<SkeletonReflection />);
    expect(getByTestId('skeleton-reflection')).toBeTruthy();
  });
});
