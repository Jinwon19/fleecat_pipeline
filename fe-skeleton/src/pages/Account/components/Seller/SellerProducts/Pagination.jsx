import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  // 5개씩만 표시
  const getVisiblePages = () => {
    if (totalPages <= 5) return pages;
    
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    
    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft size={20} />
      </button>

      {visiblePages[0] > 1 && (
        <>
          <button
            className="pagination-page"
            onClick={() => onPageChange(1)}
          >
            1
          </button>
          {visiblePages[0] > 2 && <span className="pagination-ellipsis">...</span>}
        </>
      )}

      {visiblePages.map((page) => (
        <button
          key={page}
          className={`pagination-page ${page === currentPage ? 'active' : ''}`}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <span className="pagination-ellipsis">...</span>
          )}
          <button
            className="pagination-page"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
