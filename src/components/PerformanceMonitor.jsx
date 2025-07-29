import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

const PerformanceMonitor = ({ enabled = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState({
    fps: 0,
    memoryUsage: 0,
    loadTimes: [],
    renderTimes: [],
    cacheHits: 0,
    cacheMisses: 0,
    networkRequests: 0,
    errors: 0
  });
  const [performanceEntries, setPerformanceEntries] = useState([]);
  
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef();
  const observerRef = useRef();

  // FPS calculation
  useEffect(() => {
    if (!enabled) return;

    const calculateFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      
      if (now - lastTimeRef.current >= 1000) {
        setMetrics(prev => ({
          ...prev,
          fps: Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current))
        }));
        
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      animationFrameRef.current = requestAnimationFrame(calculateFPS);
    };

    calculateFPS();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  // Memory usage monitoring
  useEffect(() => {
    if (!enabled || !performance.memory) return;

    const updateMemoryUsage = () => {
      const memory = performance.memory;
      const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage: Math.round(memoryUsage)
      }));
    };

    const interval = setInterval(updateMemoryUsage, 1000);
    return () => clearInterval(interval);
  }, [enabled]);

  // Performance entries monitoring
  useEffect(() => {
    if (!enabled) return;

    const updatePerformanceEntries = () => {
      const entries = performance.getEntriesByType('navigation');
      const resourceEntries = performance.getEntriesByType('resource');
      const measureEntries = performance.getEntriesByType('measure');
      
      setPerformanceEntries([
        ...entries,
        ...resourceEntries.slice(-10), // Last 10 resources
        ...measureEntries.slice(-10)   // Last 10 measures
      ]);
    };

    updatePerformanceEntries();
    const interval = setInterval(updatePerformanceEntries, 5000);
    return () => clearInterval(interval);
  }, [enabled]);

  // Intersection Observer for render performance
  useEffect(() => {
    if (!enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const renderTime = performance.now() - entry.time;
            setMetrics(prev => ({
              ...prev,
              renderTimes: [...prev.renderTimes.slice(-9), renderTime]
            }));
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe all cards and major components
    const elements = document.querySelectorAll('[data-performance-monitor]');
    elements.forEach(el => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled]);

  // Network request monitoring
  useEffect(() => {
    if (!enabled) return;

    const originalFetch = window.fetch;
    let requestCount = 0;

    window.fetch = async (...args) => {
      requestCount++;
      setMetrics(prev => ({
        ...prev,
        networkRequests: requestCount
      }));

      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        setMetrics(prev => ({
          ...prev,
          loadTimes: [...prev.loadTimes.slice(-9), loadTime]
        }));

        return response;
      } catch (error) {
        setMetrics(prev => ({
          ...prev,
          errors: prev.errors + 1
        }));
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [enabled]);

  if (!enabled) return null;

  const getPerformanceStatus = () => {
    if (metrics.fps >= 55 && metrics.memoryUsage < 70) return 'excellent';
    if (metrics.fps >= 45 && metrics.memoryUsage < 80) return 'good';
    if (metrics.fps >= 30 && metrics.memoryUsage < 90) return 'fair';
    return 'poor';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent': return <CheckCircleIcon />;
      case 'good': return <CheckCircleIcon />;
      case 'fair': return <WarningIcon />;
      case 'poor': return <ErrorIcon />;
      default: return <SpeedIcon />;
    }
  };

  const avgLoadTime = metrics.loadTimes.length > 0 
    ? metrics.loadTimes.reduce((a, b) => a + b, 0) / metrics.loadTimes.length 
    : 0;

  const avgRenderTime = metrics.renderTimes.length > 0 
    ? metrics.renderTimes.reduce((a, b) => a + b, 0) / metrics.renderTimes.length 
    : 0;

  const status = getPerformanceStatus();

  return (
    <Box
      position="fixed"
      top={80}
      right={20}
      zIndex={9999}
      sx={{
        opacity: 0.9,
        transition: 'all 0.3s ease-in-out'
      }}
    >
      <Card sx={{ minWidth: 280 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <SpeedIcon color="primary" />
              <Typography variant="h6">Performance</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                icon={getStatusIcon(status)}
                label={status.toUpperCase()}
                color={getStatusColor(status)}
                size="small"
              />
              <IconButton 
                size="small" 
                onClick={() => setIsVisible(!isVisible)}
              >
                {isVisible ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </Box>
          </Box>

          {/* Basic Metrics */}
          <Grid container spacing={2} mb={2}>
            <Grid item xs={6}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {metrics.fps}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  FPS
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box textAlign="center">
                <Typography variant="h4" color="secondary">
                  {metrics.memoryUsage}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Memory
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Memory Usage Bar */}
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2">Memory Usage</Typography>
              <Typography variant="caption">{metrics.memoryUsage}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={metrics.memoryUsage}
              color={metrics.memoryUsage > 80 ? 'error' : metrics.memoryUsage > 60 ? 'warning' : 'success'}
            />
          </Box>

          {/* Detailed Metrics */}
          <Collapse in={isVisible}>
            <Grid container spacing={1} mb={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Avg Load Time
                </Typography>
                <Typography variant="body2">
                  {avgLoadTime.toFixed(0)}ms
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Avg Render Time
                </Typography>
                <Typography variant="body2">
                  {avgRenderTime.toFixed(0)}ms
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Network Requests
                </Typography>
                <Typography variant="body2">
                  {metrics.networkRequests}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Errors
                </Typography>
                <Typography variant="body2" color={metrics.errors > 0 ? 'error' : 'inherit'}>
                  {metrics.errors}
                </Typography>
              </Grid>
            </Grid>

            {/* Performance Entries */}
            {performanceEntries.length > 0 && (
              <Box>
                <Typography variant="subtitle2" mb={1}>
                  Recent Performance Entries
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Size</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {performanceEntries.slice(-5).map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="caption">
                              {entry.entryType}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {entry.duration?.toFixed(0) || 0}ms
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {entry.transferSize ? `${(entry.transferSize / 1024).toFixed(1)}KB` : '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceMonitor; 