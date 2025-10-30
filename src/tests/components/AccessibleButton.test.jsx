import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccessibleButton from '../../components/AccessibleButton';

describe('AccessibleButton', () => {
  const defaultProps = {
    children: 'Test Button',
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders button with correct text', () => {
    render(<AccessibleButton {...defaultProps} />);
    expect(screen.getByRole('button')).toHaveTextContent('Test Button');
  });

  it('calls onClick when clicked', () => {
    render(<AccessibleButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation', () => {
    render(<AccessibleButton {...defaultProps} />);
    const button = screen.getByRole('button');
    
    // Test Enter key
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    
    // Test Space key
    fireEvent.keyDown(button, { key: ' ' });
    expect(defaultProps.onClick).toHaveBeenCalledTimes(2);
  });

  it('applies aria-label when provided', () => {
    render(<AccessibleButton {...defaultProps} ariaLabel="Custom label" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom label');
  });

  it('applies disabled state correctly', () => {
    render(<AccessibleButton {...defaultProps} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows loading state', () => {
    render(<AccessibleButton {...defaultProps} loading />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('applies custom className', () => {
    render(<AccessibleButton {...defaultProps} className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('handles different variants', () => {
    const { rerender } = render(<AccessibleButton {...defaultProps} variant="primary" />);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<AccessibleButton {...defaultProps} variant="secondary" />);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-600');

    rerender(<AccessibleButton {...defaultProps} variant="danger" />);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  it('applies size variants correctly', () => {
    const { rerender } = render(<AccessibleButton {...defaultProps} size="sm" />);
    expect(screen.getByRole('button')).toHaveClass('px-3 py-1.5 text-sm');

    rerender(<AccessibleButton {...defaultProps} size="lg" />);
    expect(screen.getByRole('button')).toHaveClass('px-6 py-3 text-lg');
  });
});
