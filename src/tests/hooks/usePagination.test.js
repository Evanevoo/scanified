import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../../hooks/usePagination';

describe('usePagination Hook', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(false);
  });

  it('should initialize with custom values', () => {
    const { result } = renderHook(() => 
      usePagination({ 
        initialPage: 2, 
        initialPageSize: 20, 
        initialTotalCount: 100 
      })
    );

    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalCount).toBe(100);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(true);
  });

  it('should handle page changes', () => {
    const { result } = renderHook(() => 
      usePagination({ initialTotalCount: 100 })
    );

    act(() => {
      result.current.handlePageChange(3);
    });

    expect(result.current.page).toBe(3);
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(true);
  });

  it('should handle page size changes', () => {
    const { result } = renderHook(() => 
      usePagination({ initialTotalCount: 100 })
    );

    act(() => {
      result.current.handlePageSizeChange(25);
    });

    expect(result.current.pageSize).toBe(25);
    expect(result.current.page).toBe(1); // Should reset to first page
    expect(result.current.totalPages).toBe(4);
  });

  it('should handle total count updates', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setTotalCount(50);
    });

    expect(result.current.totalCount).toBe(50);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.hasNext).toBe(true);
  });

  it('should calculate total pages correctly', () => {
    const { result } = renderHook(() => 
      usePagination({ initialPageSize: 15, initialTotalCount: 100 })
    );

    expect(result.current.totalPages).toBe(7); // Math.ceil(100/15) = 7
  });

  it('should handle edge cases for total pages', () => {
    const { result } = renderHook(() => 
      usePagination({ initialPageSize: 10, initialTotalCount: 0 })
    );

    expect(result.current.totalPages).toBe(0);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(false);
  });

  it('should prevent invalid page changes', () => {
    const { result } = renderHook(() => 
      usePagination({ initialTotalCount: 100 })
    );

    act(() => {
      result.current.handlePageChange(0); // Invalid page
    });

    expect(result.current.page).toBe(1); // Should stay at valid page

    act(() => {
      result.current.handlePageChange(15); // Page beyond total pages
    });

    expect(result.current.page).toBe(10); // Should stay at last valid page
  });

  it('should handle next page navigation', () => {
    const { result } = renderHook(() => 
      usePagination({ initialPage: 2, initialTotalCount: 100 })
    );

    act(() => {
      result.current.handleNextPage();
    });

    expect(result.current.page).toBe(3);
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(true);
  });

  it('should handle previous page navigation', () => {
    const { result } = renderHook(() => 
      usePagination({ initialPage: 3, initialTotalCount: 100 })
    );

    act(() => {
      result.current.handlePreviousPage();
    });

    expect(result.current.page).toBe(2);
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(true);
  });

  it('should not allow navigation beyond bounds', () => {
    const { result } = renderHook(() => 
      usePagination({ initialPage: 1, initialTotalCount: 100 })
    );

    act(() => {
      result.current.handlePreviousPage();
    });

    expect(result.current.page).toBe(1); // Should stay at first page

    act(() => {
      result.current.handlePageChange(10);
      result.current.handleNextPage();
    });

    expect(result.current.page).toBe(10); // Should stay at last page
  });

  it('should calculate start and end indices correctly', () => {
    const { result } = renderHook(() => 
      usePagination({ initialPage: 3, initialPageSize: 20, initialTotalCount: 100 })
    );

    expect(result.current.startIndex).toBe(41); // (3-1) * 20 + 1
    expect(result.current.endIndex).toBe(60); // 3 * 20
  });

  it('should handle page size changes that affect current page', () => {
    const { result } = renderHook(() => 
      usePagination({ initialPage: 5, initialPageSize: 10, initialTotalCount: 100 })
    );

    act(() => {
      result.current.handlePageSizeChange(25); // This would make page 5 invalid
    });

    expect(result.current.page).toBe(1); // Should reset to first page
    expect(result.current.pageSize).toBe(25);
    expect(result.current.totalPages).toBe(4);
  });

  it('should provide pagination info', () => {
    const { result } = renderHook(() => 
      usePagination({ initialPage: 2, initialPageSize: 15, initialTotalCount: 100 })
    );

    const paginationInfo = result.current.getPaginationInfo();
    
    expect(paginationInfo).toEqual({
      page: 2,
      pageSize: 15,
      totalCount: 100,
      totalPages: 7,
      hasNext: true,
      hasPrevious: true,
      startIndex: 16,
      endIndex: 30,
    });
  });
});
