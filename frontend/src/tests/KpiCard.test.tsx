import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from '../components/common/KpiCard';
import { Wind } from 'lucide-react';

describe('KpiCard Component', () => {
  it('renders title, formatted value, and subtitle', () => {
    render(
      <KpiCard
        title="Mean Absolute Error"
        value="2,016 MW"
        subtitle="Average discrepancy"
        icon={Wind}
      />
    );

    expect(screen.getByText('Mean Absolute Error')).toBeInTheDocument();
    expect(screen.getByText('2,016 MW')).toBeInTheDocument();
    expect(screen.getByText('Average discrepancy')).toBeInTheDocument();
  });

  it('renders badge with correct text', () => {
    render(
      <KpiCard
        title="Forecast Bias"
        value="+1,730 MW"
        subtitle="Mean Error"
        icon={Wind}
        badge={{ text: 'Overforecasting', variant: 'positive' }}
      />
    );

    expect(screen.getByText('Overforecasting')).toBeInTheDocument();
  });
});
