import React, { useEffect, useState } from 'react';
import { reviewsAPI } from '../services/endpoints';

function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await reviewsAPI.getReviews();
        setReviews(data.results || data || []);
      } catch (error) {
        console.error('Failed to fetch reviews', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  return (
    <div>
      <h2>Reviews</h2>
      {loading ? (
        <p>Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p>No reviews available.</p>
      ) : (
        <ul>
          {reviews.map((review) => (
            <li key={review.review_id}>
              Log: {review.log} | Status: {review.status} | Rating: {review.rating || 'N/A'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ReviewsPage;