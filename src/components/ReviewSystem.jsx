import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, Rating, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, Chip, Alert, List,
  ListItem, ListItemText, ListItemIcon, Avatar, Divider, FormControl,
  InputLabel, Select, MenuItem, IconButton, Tooltip, Paper, Badge
} from '@mui/material';
import {
  Star as StarIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Warning as WarningIcon,
  Verified as VerifiedIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const ReviewSystem = ({ isAdminView = false }) => {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    name: '',
    position: '',
    company: '',
    email: '',
    phone: '',
    rating: 5,
    title: '',
    review: '',
    wouldRecommend: true,
    consentGiven: false
  });
  const [loading, setLoading] = useState(false);

  // Mock approved reviews (these would come from database)
  const approvedReviews = [
    {
      id: 1,
      name: 'Sarah Johnson',
      position: 'Operations Manager',
      company: 'Industrial Gas Solutions',
      email: 'sarah.j@industrialgas.com',
      rating: 5,
      title: 'Transformed our cylinder tracking',
      review: 'This platform transformed our cylinder tracking. We went from manual spreadsheets to real-time visibility in just one day. The mobile app is incredibly intuitive and our drivers love it.',
      date: '2024-01-10',
      verified: true,
      approved: true,
      consentGiven: true,
      wouldRecommend: true
    },
    {
      id: 2,
      name: 'Mike Chen',
      position: 'Fleet Supervisor',
      company: 'Metro Gas Distribution',
      email: 'mike.c@metrogas.com',
      rating: 5,
      title: 'Finally, a system that works in the field',
      review: 'Finally, a system that actually works in the field. Our drivers love the mobile scanning, and I love the real-time reports. ROI was immediate and customer service is outstanding.',
      date: '2024-01-08',
      verified: true,
      approved: true,
      consentGiven: true,
      wouldRecommend: true
    }
  ];

  // Mock pending reviews (awaiting approval)
  const mockPendingReviews = [
    {
      id: 3,
      name: 'David Rodriguez',
      position: 'Owner',
      company: 'Southwest Cylinder Co.',
      email: 'david@swcylinder.com',
      rating: 4,
      title: 'Great alternative to legacy systems',
      review: 'Switched from TrackAbout and never looked back. This is what modern software should be - simple, powerful, and actually affordable. Setup was quick and support was helpful.',
      date: '2024-01-15',
      verified: false,
      approved: false,
      consentGiven: true,
      wouldRecommend: true
    },
    {
      id: 4,
      name: 'Lisa Thompson',
      position: 'IT Manager',
      company: 'Northern Gas Systems',
      email: 'lisa.t@northerngas.com',
      rating: 5,
      title: 'Excellent mobile-first approach',
      review: 'The mobile-first approach is exactly what we needed. Integration was seamless and the API documentation is excellent. Our team was up and running in hours, not weeks.',
      date: '2024-01-14',
      verified: false,
      approved: false,
      consentGiven: true,
      wouldRecommend: true
    }
  ];

  useEffect(() => {
    setReviews(approvedReviews);
    setPendingReviews(mockPendingReviews);
  }, []);

  const handleSubmitReview = async () => {
    if (!reviewForm.consentGiven) {
      alert('Please provide consent to display your review.');
      return;
    }

    setLoading(true);
    
    const newReview = {
      id: Date.now(),
      ...reviewForm,
      date: new Date().toISOString().split('T')[0],
      verified: false,
      approved: false
    };

    // Add to pending reviews
    setPendingReviews(prev => [...prev, newReview]);
    
    // Reset form
    setReviewForm({
      name: '',
      position: '',
      company: '',
      email: '',
      phone: '',
      rating: 5,
      title: '',
      review: '',
      wouldRecommend: true,
      consentGiven: false
    });
    
    setReviewDialog(false);
    setLoading(false);
    
    alert('Thank you for your review! It will be displayed after verification and approval.');
  };

  const handleApproveReview = (reviewId) => {
    const review = pendingReviews.find(r => r.id === reviewId);
    if (review) {
      // Move to approved reviews
      setReviews(prev => [...prev, { ...review, approved: true, verified: true }]);
      // Remove from pending
      setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
    }
  };

  const handleRejectReview = (reviewId) => {
    setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
  };

  const ReviewCard = ({ review, isPending = false }) => (
    <Card sx={{ mb: 2, border: isPending ? '2px solid #ff9800' : '1px solid #e0e0e0' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {review.name.split(' ').map(n => n[0]).join('')}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {review.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {review.position} at {review.company}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Rating value={review.rating} readOnly size="small" />
                {review.verified && (
                  <Chip 
                    icon={<VerifiedIcon />}
                    label="Verified Customer" 
                    size="small" 
                    color="success"
                  />
                )}
                {isPending && (
                  <Chip 
                    icon={<ScheduleIcon />}
                    label="Pending Approval" 
                    size="small" 
                    color="warning"
                  />
                )}
              </Box>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {new Date(review.date).toLocaleDateString()}
          </Typography>
        </Box>
        
        <Typography variant="h6" gutterBottom>
          {review.title}
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 2 }}>
          "{review.review}"
        </Typography>
        
        {review.wouldRecommend && (
          <Chip 
            icon={<CheckCircleIcon />}
            label="Would Recommend" 
            size="small" 
            color="success"
            variant="outlined"
          />
        )}

        {isAdminView && isPending && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={() => handleApproveReview(review.id)}
            >
              Approve
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => handleRejectReview(review.id)}
            >
              Reject
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EmailIcon />}
              onClick={() => window.open(`mailto:${review.email}?subject=Review Verification`)}
            >
              Contact Customer
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (isAdminView) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Review Management
        </Typography>
        
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Legal Compliance:</strong> Only approve genuine reviews from real customers. 
            Fake reviews violate FTC guidelines and can result in fines up to $43,792 per violation.
          </Typography>
        </Alert>

        {/* Pending Reviews */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={pendingReviews.length} color="warning">
              <ScheduleIcon />
            </Badge>
            Pending Reviews ({pendingReviews.length})
          </Typography>
          {pendingReviews.length === 0 ? (
            <Alert severity="info">No pending reviews</Alert>
          ) : (
            pendingReviews.map(review => (
              <ReviewCard key={review.id} review={review} isPending={true} />
            ))
          )}
        </Box>

        {/* Approved Reviews */}
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon color="success" />
            Approved Reviews ({reviews.length})
          </Typography>
          {reviews.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </Box>
      </Box>
    );
  }

  // Public view
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Customer Reviews
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setReviewDialog(true)}
        >
          Write a Review
        </Button>
      </Box>

      {/* Reviews Display */}
      <Grid container spacing={3}>
        {reviews.map(review => (
          <Grid item xs={12} md={6} key={review.id}>
            <ReviewCard review={review} />
          </Grid>
        ))}
      </Grid>

      {/* Review Submission Dialog */}
      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Submit a Review</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Important:</strong> Only customers who have actually used our service should submit reviews. 
              All reviews are verified before publication.
            </Typography>
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Your Name"
                value={reviewForm.name}
                onChange={(e) => setReviewForm({...reviewForm, name: e.target.value})}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Your Position"
                value={reviewForm.position}
                onChange={(e) => setReviewForm({...reviewForm, position: e.target.value})}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={reviewForm.company}
                onChange={(e) => setReviewForm({...reviewForm, company: e.target.value})}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={reviewForm.email}
                onChange={(e) => setReviewForm({...reviewForm, email: e.target.value})}
                required
                margin="normal"
                helperText="For verification purposes only"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={reviewForm.phone}
                onChange={(e) => setReviewForm({...reviewForm, phone: e.target.value})}
                margin="normal"
                helperText="Optional, for verification"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>Overall Rating</Typography>
                <Rating
                  value={reviewForm.rating}
                  onChange={(e, value) => setReviewForm({...reviewForm, rating: value})}
                  size="large"
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Review Title"
                value={reviewForm.title}
                onChange={(e) => setReviewForm({...reviewForm, title: e.target.value})}
                required
                margin="normal"
                placeholder="e.g., 'Great platform for cylinder tracking'"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Your Review"
                multiline
                rows={4}
                value={reviewForm.review}
                onChange={(e) => setReviewForm({...reviewForm, review: e.target.value})}
                required
                margin="normal"
                placeholder="Tell us about your experience with our platform..."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Would you recommend us?</InputLabel>
                <Select
                  value={reviewForm.wouldRecommend}
                  onChange={(e) => setReviewForm({...reviewForm, wouldRecommend: e.target.value})}
                  label="Would you recommend us?"
                >
                  <MenuItem value={true}>Yes, I would recommend</MenuItem>
                  <MenuItem value={false}>No, I would not recommend</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Consent Required:</strong> By submitting this review, you consent to us displaying 
                  your name, position, company, and review on our website and marketing materials.
                </Typography>
              </Alert>
              <FormControl fullWidth>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="checkbox"
                    checked={reviewForm.consentGiven}
                    onChange={(e) => setReviewForm({...reviewForm, consentGiven: e.target.checked})}
                    required
                  />
                  <Typography variant="body2">
                    I give consent to display my review publicly and confirm this is a genuine review of my experience.
                  </Typography>
                </Box>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitReview}
            variant="contained"
            disabled={!reviewForm.consentGiven || loading}
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewSystem; 