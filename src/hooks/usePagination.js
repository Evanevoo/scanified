import { useState, useMemo, useCallback } from 'react';

/**
 * Custom hook for pagination functionality
 * Provides pagination state and utilities for data management
 */
export const usePagination = (initialPage = 0, initialRowsPerPage = 25) => {
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const paginateData = useCallback((data) => {
    const start = page * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [page, rowsPerPage]);

  const getPaginationInfo = useCallback((totalCount) => {
    const start = page * rowsPerPage + 1;
    const end = Math.min((page + 1) * rowsPerPage, totalCount);
    return { start, end, total: totalCount };
  }, [page, rowsPerPage]);

  return {
    page,
    rowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
    paginateData,
    getPaginationInfo,
    setPage,
    setRowsPerPage
  };
};

/**
 * Custom hook for server-side pagination
 * Handles pagination with async data fetching
 */
export const useServerPagination = (initialPage = 0, initialRowsPerPage = 25) => {
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  const getPaginationInfo = useCallback(() => {
    const start = page * rowsPerPage + 1;
    const end = Math.min((page + 1) * rowsPerPage, totalCount);
    return { start, end, total: totalCount };
  }, [page, rowsPerPage, totalCount]);

  const getQueryParams = useCallback(() => {
    return {
      offset: page * rowsPerPage,
      limit: rowsPerPage
    };
  }, [page, rowsPerPage]);

  return {
    page,
    rowsPerPage,
    totalCount,
    loading,
    setTotalCount,
    setLoading,
    handleChangePage,
    handleChangeRowsPerPage,
    getPaginationInfo,
    getQueryParams,
    setPage,
    setRowsPerPage
  };
};
