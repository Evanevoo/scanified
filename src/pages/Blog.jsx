import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Stack,
  Avatar,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';

const blogPosts = [
  {
    id: 1,
    title: 'The Future of Asset Management: Mobile-First Approaches',
    excerpt: 'Discover how mobile-first asset management is revolutionizing how businesses track and manage their valuable resources.',
    content: 'Traditional asset management systems were built for desktop computers, but the modern workforce is mobile...',
    author: 'Sarah Johnson',
    authorAvatar: '/avatars/sarah.jpg',
    date: '2024-01-15',
    readTime: '5 min read',
    category: 'Technology',
    image: '/blog/mobile-first.jpg',
    featured: true
  },
  {
    id: 2,
    title: 'ROI Calculator: Measuring the Impact of Digital Asset Tracking',
    excerpt: 'Learn how to calculate the return on investment for implementing digital asset tracking in your organization.',
    content: 'When considering a move to digital asset tracking, one of the first questions executives ask is...',
    author: 'Mike Chen',
    authorAvatar: '/avatars/mike.jpg',
    date: '2024-01-10',
    readTime: '7 min read',
    category: 'Business',
    image: '/blog/roi-calculator.jpg'
  },
  {
    id: 3,
    title: 'Barcode vs QR Code: Which is Better for Asset Tracking?',
    excerpt: 'A comprehensive comparison of barcode and QR code technologies for modern asset management systems.',
    content: 'Both barcodes and QR codes have their place in asset tracking, but understanding their differences...',
    author: 'Emily Rodriguez',
    authorAvatar: '/avatars/emily.jpg',
    date: '2024-01-05',
    readTime: '4 min read',
    category: 'Technology',
    image: '/blog/barcode-qr.jpg'
  },
  {
    id: 4,
    title: 'Best Practices for Asset Lifecycle Management',
    excerpt: 'Essential strategies for managing assets from acquisition to disposal, maximizing value at every stage.',
    content: 'Effective asset lifecycle management is crucial for maximizing return on investment...',
    author: 'David Kim',
    authorAvatar: '/avatars/david.jpg',
    date: '2023-12-28',
    readTime: '6 min read',
    category: 'Best Practices',
    image: '/blog/lifecycle.jpg'
  },
  {
    id: 5,
    title: 'Integration Guide: Connecting Asset Management with ERP Systems',
    excerpt: 'Step-by-step guide to integrating your asset management system with existing ERP and business systems.',
    content: 'Seamless integration between asset management and ERP systems is essential for modern businesses...',
    author: 'Lisa Wang',
    authorAvatar: '/avatars/lisa.jpg',
    date: '2023-12-20',
    readTime: '8 min read',
    category: 'Integration',
    image: '/blog/erp-integration.jpg'
  },
  {
    id: 6,
    title: 'Security in Cloud-Based Asset Management',
    excerpt: 'Understanding security considerations and best practices for cloud-based asset management solutions.',
    content: 'As more organizations move to cloud-based asset management, security becomes a top priority...',
    author: 'Robert Taylor',
    authorAvatar: '/avatars/robert.jpg',
    date: '2023-12-15',
    readTime: '5 min read',
    category: 'Security',
    image: '/blog/cloud-security.jpg'
  }
];

const categories = ['All', 'Technology', 'Business', 'Best Practices', 'Integration', 'Security'];

export default function Blog() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = React.useState('All');

  const filteredPosts = selectedCategory === 'All' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  const featuredPost = blogPosts.find(post => post.featured);
  const regularPosts = blogPosts.filter(post => !post.featured);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" fontWeight={700} gutterBottom>
            Scanified Blog
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ width: '100%' }}>
            Insights, tips, and best practices for modern asset management
          </Typography>
        </Box>

        {/* Category Filter */}
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
            {categories.map((category) => (
              <Chip
                key={category}
                label={category}
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                variant={selectedCategory === category ? 'filled' : 'outlined'}
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>

        {/* Featured Post */}
        {featuredPost && selectedCategory === 'All' && (
          <Card sx={{ mb: 8, overflow: 'hidden' }}>
            <Grid container>
              <Grid item xs={12} md={6}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 400,
                    bgcolor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="h6" color="text.secondary">
                    Featured Image
                  </Typography>
                </CardMedia>
              </Grid>
              <Grid item xs={12} md={6}>
                <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Chip label="Featured" color="primary" size="small" sx={{ alignSelf: 'flex-start', mb: 2 }} />
                  <Typography variant="h4" fontWeight={600} gutterBottom>
                    {featuredPost.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
                    {featuredPost.excerpt}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {featuredPost.author.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {featuredPost.author}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(featuredPost.date).toLocaleDateString()} • {featuredPost.readTime}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Button
                    variant="contained"
                    endIcon={<ArrowIcon />}
                    onClick={() => navigate(`/blog/${featuredPost.id}`)}
                  >
                    Read Full Article
                  </Button>
                </CardContent>
              </Grid>
            </Grid>
          </Card>
        )}

        {/* Blog Posts Grid */}
        <Grid container spacing={4}>
          {filteredPosts.map((post) => (
            <Grid item xs={12} md={6} lg={4} key={post.id}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 200,
                    bgcolor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Blog Image
                  </Typography>
                </CardMedia>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Chip label={post.category} size="small" variant="outlined" />
                    <Typography variant="caption" color="text.secondary">
                      {post.readTime}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {post.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
                    {post.excerpt}
                  </Typography>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                        {post.author.charAt(0)}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        {post.author}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(post.date).toLocaleDateString()}
                    </Typography>
                  </Box>
                  
                  <Button
                    variant="text"
                    endIcon={<ArrowIcon />}
                    onClick={() => navigate(`/blog/${post.id}`)}
                    sx={{ mt: 2, alignSelf: 'flex-start' }}
                  >
                    Read More
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Newsletter Signup */}
        <Box sx={{ 
          mt: 12, 
          p: 6, 
          bgcolor: 'primary.main', 
          color: 'white', 
          borderRadius: 4,
          textAlign: 'center'
        }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Stay Updated
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Get the latest insights and updates delivered to your inbox
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" maxWidth={400} mx="auto">
            <Box sx={{ 
              bgcolor: 'white', 
              p: 1.5, 
              borderRadius: 2, 
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center'
            }}>
              <Typography color="text.secondary" sx={{ px: 1 }}>
                Enter your email...
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              sx={{ 
                bgcolor: 'white', 
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              Subscribe
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}