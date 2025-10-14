// utils/pagination.js

/**
 * Generic pagination function for arrays or query results
 * @param {Array} items - Array of items to paginate
 * @param {number} pageIndex - Current page index (0-based)
 * @param {number} pageSize - Number of items per page
 * @returns {Object} - { data, totalItems, totalPages, pageIndex, pageSize }
 */
export const paginate = (items, pageIndex = 0, pageSize = 10) => {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // Clamp pageIndex
  const currentPage = Math.min(Math.max(pageIndex, 0), totalPages - 1);

  const start = currentPage * pageSize;
  const end = start + pageSize;
  const data = items.slice(start, end);

  return {
    data,
    totalItems,
    totalPages,
    pageIndex: currentPage,
    pageSize,
  };
}

