import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';

describe('Loading and Error States', () => {
  it('renders LoadingState with descriptive text', () => {
    render(<LoadingState />);
    expect(screen.getByText(/Ingesting & Analyzing Elexon BMRS Datasets/i)).toBeInTheDocument();
  });

  it('renders ErrorState and triggers retry', () => {
    const handleRetry = vi.fn();
    render(<ErrorState message="API connection failed" onRetry={handleRetry} />);

    expect(screen.getByText(/Unable to Load Analytics Data/i)).toBeInTheDocument();
    expect(screen.getByText('API connection failed')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry Request/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
