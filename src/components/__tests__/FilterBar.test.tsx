import { describe, test, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import FilterBar from '../../../components/FilterBar';

describe('FilterBar', () => {
  test('renders filter controls', () => {
    const mockOnFilterChange = vi.fn();
    render(
      <FilterBar 
        onFilterChange={mockOnFilterChange}
      />
    );
    
    // Check if the Show Filters button is rendered
    expect(screen.getByText('Show Filters')).toBeInTheDocument();
    
    // Check if basic filter sections are rendered
    expect(screen.getByText('Property Type')).toBeInTheDocument();
    expect(screen.getByText('Price Range')).toBeInTheDocument();
    expect(screen.getByText('Bedrooms')).toBeInTheDocument();
    expect(screen.getByText('Bathrooms')).toBeInTheDocument();
  });

  test('calls onFilterChange when filters are updated', () => {
    const mockOnFilterChange = vi.fn();
    render(
      <FilterBar 
        onFilterChange={mockOnFilterChange}
      />
    );

    // Click the 'Houses' filter button
    fireEvent.click(screen.getByText('Houses'));

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyTypes: ['house'],
        priceRanges: [],
        bedrooms: [],
        bathrooms: []
      })
    );
  });
});
