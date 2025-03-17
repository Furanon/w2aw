import React from 'react';
import VectorSearch from '../../components/VectorSearch';

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Semantic Search</h1>
      <VectorSearch />
    </div>
  );
}

