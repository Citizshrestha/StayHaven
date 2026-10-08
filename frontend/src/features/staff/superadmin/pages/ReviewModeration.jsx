import React, { useState, useEffect } from 'react';
import SuperAdminLayout from './SuperAdminLayout';
import { toast } from 'react-toastify';
import { apiError } from '../utils/apiError';
import {
  getPendingReviews,
  moderateReview,
  getModerationMetrics,
  seedReviewData,
  toggleFeaturedReview,
} from '../../../../core/api/services/reviewModeration.service';
import ReasonModal from '../components/ReasonModal';
import './ReviewModeration.css';

const PAST_TENSE = { approve: 'approved', reject: 'rejected', flag: 'flagged' };

const ReviewModeration = () => {
  const [rejectTarget, setRejectTarget] = useState(null); // { id, hide }
  const [moderatingId, setModeratingId] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (activeTab === 'queue') loadReviews();
    else if (activeTab === 'metrics') loadMetrics();
  }, [activeTab, filterStatus]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const result = await getPendingReviews({ status: filterStatus, page: 1, limit: 20 });
      setReviews(result.data);
    } catch (error) {
      toast.error(apiError(error, 'Failed to load reviews'));
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const result = await getModerationMetrics();
      setMetrics(result.data);
    } catch (error) {
      toast.error(apiError(error, 'Failed to load metrics'));
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedReviewData();
      toast.success('Review demo data seeded');
      if (activeTab === 'queue') loadReviews();
      else loadMetrics();
    } catch (error) {
      toast.error(apiError(error, 'Failed to seed reviews. Run superadmin-data seed first.'));
    } finally {
      setSeeding(false);
    }
  };

  const handleModerate = async (reviewId, action, reason = '') => {
    if (moderatingId) return false; // one moderation at a time (no double submit)
    setModeratingId(reviewId);
    try {
      await moderateReview(reviewId, { action, reason });
      toast.success(`Review ${PAST_TENSE[action] || action} successfully`);
      loadReviews();
      return true;
    } catch (error) {
      toast.error(apiError(error, `Failed to ${action} review`));
      return false;
    } finally {
      setModeratingId(null);
    }
  };

  const confirmReject = async (reason) => {
    if (!rejectTarget) return;
    const ok = await handleModerate(rejectTarget.id, 'reject', reason);
    if (ok) setRejectTarget(null);
  };

  const handleToggleFeatured = async (reviewId, currentStatus) => {
    try {
      await toggleFeaturedReview(reviewId, { isFeatured: !currentStatus });
      toast.success(`Review ${!currentStatus ? 'featured' : 'unfeatured'} successfully`);
      loadReviews();
    } catch (error) {
      toast.error(apiError(error, 'Failed to toggle featured status'));
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={`star ${star <= rating ? 'filled' : ''}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <SuperAdminLayout pageTitle="Review Moderation">
      <div className="review-moderation-page">
        <div className="moderation-header">
          <div className="tab-navigation">
            <button
              className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('queue')}
            >
              Queue
            </button>
            <button
              className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => setActiveTab('metrics')}
            >
              Metrics
            </button>
          </div>

          <div className="moderation-actions">
            {activeTab === 'queue' && (
              <div className="filter-controls">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="flagged">Flagged</option>
                </select>
              </div>
            )}
            <button className="btn-seed" onClick={handleSeedData} disabled={seeding}>
              <span className="material-symbols-outlined">database</span>
              {seeding ? 'Seeding...' : 'Seed Demo Data'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : (
          <>
            {activeTab === 'queue' && (
              <div className="queue-tab">
                <div className="reviews-list">
                  {reviews.length === 0 ? (
                    <div className="empty-state">
                      <span className="material-symbols-outlined">rate_review</span>
                      <p>No reviews to moderate</p>
                    </div>
                  ) : (
                    reviews.map((review) => (
                      <div key={review._id} className="review-card">
                        <div className="review-header">
                          <div className="reviewer-info">
                            <h4>{review.guest?.fullname || 'Anonymous'}</h4>
                            {review.isVerifiedGuest && (
                              <span className="verified-badge">
                                <span className="material-symbols-outlined">verified</span>
                                Verified Guest
                              </span>
                            )}
                          </div>
                          <div className="review-meta">
                            <p className="hotel-name">{review.hotel?.name || 'Unknown Hotel'}</p>
                            <p className="review-date">{new Date(review.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="review-content">
                          {renderStars(review.rating)}
                          {review.title && <h5 className="review-title">{review.title}</h5>}
                          <p className="review-text">{review.comment}</p>
                        </div>

                        {review.autoFlagReasons && review.autoFlagReasons.length > 0 && (
                          <div className="auto-flags">
                            {review.autoFlagReasons.map((reason, index) => (
                              <span key={index} className="flag-pill">
                                ⚠ {reason}
                              </span>
                            ))}
                          </div>
                        )}

                        {review.moderationStatus === 'flagged' && review.flags?.length > 0 && (
                          <div className="auto-flags">
                            {review.flags.slice(-3).map((flag, index) => (
                              <span key={index} className="flag-pill">⚑ {flag.reason}</span>
                            ))}
                          </div>
                        )}

                        {['pending', 'flagged'].includes(review.moderationStatus) && (
                          <div className="review-actions">
                            <button
                              type="button"
                              className="btn-approve"
                              disabled={moderatingId === review._id}
                              onClick={() => handleModerate(review._id, 'approve')}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-reject"
                              disabled={moderatingId === review._id}
                              onClick={() => setRejectTarget({ id: review._id, hide: false })}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">cancel</span>
                              Reject
                            </button>
                            {review.moderationStatus === 'pending' && (
                              <button
                                type="button"
                                className="btn-flag"
                                disabled={moderatingId === review._id}
                                onClick={() => handleModerate(review._id, 'flag')}
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">flag</span>
                                Flag
                              </button>
                            )}
                          </div>
                        )}

                        {review.moderationStatus !== 'pending' && (
                          <div className="moderation-status">
                            <span className={`status-badge status-${review.moderationStatus}`}>
                              {review.moderationStatus}
                            </span>
                            {review.moderatedAt && (
                              <span className="moderated-date">
                                Moderated on {new Date(review.moderatedAt).toLocaleDateString()}
                              </span>
                            )}
                            {review.moderationStatus === 'approved' && (
                              <>
                                <button
                                  type="button"
                                  className={`btn-featured ${review.isFeatured ? 'featured-active' : ''}`}
                                  onClick={() => handleToggleFeatured(review._id, review.isFeatured)}
                                  aria-pressed={!!review.isFeatured}
                                  title={review.isFeatured ? 'Remove from homepage' : 'Feature on homepage'}
                                >
                                  <span className="material-symbols-outlined" aria-hidden="true">
                                    {review.isFeatured ? 'star' : 'star_outline'}
                                  </span>
                                  {review.isFeatured ? 'Featured' : 'Feature'}
                                </button>
                                <button
                                  type="button"
                                  className="btn-reject"
                                  disabled={moderatingId === review._id}
                                  onClick={() => setRejectTarget({ id: review._id, hide: true })}
                                >
                                  <span className="material-symbols-outlined" aria-hidden="true">visibility_off</span>
                                  Hide
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'metrics' && metrics && (
              <div className="metrics-tab">
                <div className="metrics-grid">
                  <div className="metric-card">
                    <h4>Approval Rate</h4>
                    <p className="metric-value">{metrics.approvalRate}%</p>
                  </div>
                  <div className="metric-card">
                    <h4>Avg Response Time</h4>
                    <p className="metric-value">{metrics.avgResponseTime}h</p>
                  </div>
                  <div className="metric-card">
                    <h4>Pending Reviews</h4>
                    <p className="metric-value">{metrics.pendingCount}</p>
                  </div>
                  <div className="metric-card">
                    <h4>Flagged Reviews</h4>
                    <p className="metric-value">{metrics.flaggedCount}</p>
                  </div>
                </div>

                {metrics.commonRejectionReasons && metrics.commonRejectionReasons.length > 0 && (
                  <div className="reasons-card">
                    <h3>Common Rejection Reasons</h3>
                    <table className="reasons-table">
                      <thead>
                        <tr>
                          <th>Reason</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.commonRejectionReasons.map((reason, index) => (
                          <tr key={index}>
                            <td>{reason.reason}</td>
                            <td>{reason.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <ReasonModal
        isOpen={!!rejectTarget}
        title={rejectTarget?.hide ? 'Hide this review?' : 'Reject this review?'}
        description="The review is removed from the public site and from homepage testimonials. The reason is kept with the review and shown in moderation metrics."
        label="Reason"
        confirmText={rejectTarget?.hide ? 'Hide review' : 'Reject review'}
        busy={!!moderatingId}
        darkMode={(() => { try { return JSON.parse(localStorage.getItem('superadmin-dark-mode')) === true; } catch { return false; } })()}
        onCancel={() => setRejectTarget(null)}
        onConfirm={confirmReject}
      />
    </SuperAdminLayout>
  );
};

export default ReviewModeration;
