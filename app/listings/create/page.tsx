'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';

interface ListingForm {
  title: string;
  description: string;
  price: string;
  location: string;
}

export default function CreateListing(): JSX.Element {
  const [listing, setListing] = useState<ListingForm>({
    title: '',
    description: '',
    price: '',
    location: '',
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setListing(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      // Add logic to post the listing to the server
      console.log('Listing submitted:', listing);
      // Here you can add the actual API call to your backend
    } catch (error) {
      console.error('Error submitting listing:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create a New Listing</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col">
          <label className="mb-2">Title</label>
          <input
            type="text"
            name="title"
            value={listing.title}
            onChange={handleChange}
            className="border rounded p-2"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-2">Description</label>
          <textarea
            name="description"
            value={listing.description}
            onChange={handleChange}
            className="border rounded p-2"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-2">Price</label>
          <input
            type="number"
            name="price"
            value={listing.price}
            onChange={handleChange}
            className="border rounded p-2"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-2">Location</label>
          <input
            type="text"
            name="location"
            value={listing.location}
            onChange={handleChange}
            className="border rounded p-2"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Submit Listing
        </button>
      </form>
    </div>
  );
}

