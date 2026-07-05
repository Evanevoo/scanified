import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Stack,
  IconButton,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { useBulkRentalEmail } from '../context/BulkRentalEmailContext';
import { useTheme, resolveAccentToHex } from '../context/ThemeContext';

export default function GlobalBulkRentalEmailProgress() {
  const {
    active,
    status,
    progress,
    resultSummary,
    pauseJob,
    resumeJob,
    cancelJob,
    dismiss,
  } = useBulkRentalEmail();
  const { accent } = useTheme();
  const primaryColor = resolveAccentToHex(accent);

  const visible = active || status === 'completed' || status === 'cancelled';
  if (!visible) return null;

  const doneCount = (progress.sent || 0) + (progress.failed || 0);
  const pct = progress.total > 0 ? Math.min(100, (doneCount / progress.total) * 100) : 0;
  const isPaused = status === 'paused';
  const isFinished = status === 'completed' || status === 'cancelled';

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 96,
        right: 16,
        zIndex: 1400,
        width: { xs: 'min(360px, calc(100vw - 32px))', sm: 360 },
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            {isFinished
              ? status === 'cancelled'
                ? 'Bulk email stopped'
                : 'Bulk email finished'
              : isPaused
                ? 'Bulk email paused'
                : 'Sending rental invoices'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isFinished
              ? 'You can dismiss this panel.'
              : 'Safe to leave this page — sending continues in the background.'}
          </Typography>
        </Box>
        {isFinished && (
          <IconButton size="small" onClick={dismiss} aria-label="Dismiss">
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          mb: 1,
          height: 6,
          borderRadius: 1,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: primaryColor },
        }}
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {progress.sent} sent · {progress.failed} failed · {doneCount}/{progress.total}
      </Typography>

      {!isFinished && progress.currentCustomerName && (
        <Typography variant="body2" noWrap sx={{ mb: 1 }}>
          {isPaused ? 'Paused on: ' : 'Now: '}
          <strong>{progress.currentCustomerName}</strong>
        </Typography>
      )}

      {isFinished && resultSummary && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {resultSummary}
        </Typography>
      )}

      {!isFinished && (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {isPaused ? (
            <Button
              size="small"
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={resumeJob}
              sx={{
                textTransform: 'none',
                bgcolor: primaryColor,
                '&:hover': { bgcolor: primaryColor, opacity: 0.9 },
              }}
            >
              Resume
            </Button>
          ) : (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PauseIcon />}
              onClick={pauseJob}
              sx={{ textTransform: 'none' }}
            >
              Pause
            </Button>
          )}
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<StopIcon />}
            onClick={cancelJob}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
        </Stack>
      )}

      {isFinished && (
        <Stack direction="row" justifyContent="flex-end">
          <Button size="small" onClick={dismiss} sx={{ textTransform: 'none' }}>
            Dismiss
          </Button>
        </Stack>
      )}
    </Paper>
  );
}
