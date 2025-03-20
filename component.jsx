{/* Pagination controls - only show when there are listings and not loading */}
{listings.length > 0 && !loading && (
  <div className="mt-8 flex items-center justify-center gap-2">
    <button
      onClick={() => handlePageChange('prev')}
      className="px-4 py-2 border rounded-md bg-white hover:bg-gray-50 text-gray-700 flex items-center"
    >
      <span className="mr-1">←</span> Previous
    </button>
    
    <div className="flex items-center gap-1">
      {renderPaginationItems()}
    </div>
    
    <button
      onClick={() => handlePageChange('next')}
      className="px-4 py-2 border rounded-md bg-white hover:bg-gray-50 text-gray-700 flex items-center"
    >
      Next <span className="ml-1">→</span>
    </button>
  </div>
)}

