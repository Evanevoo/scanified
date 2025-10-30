import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Switch,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormHelperText
} from '@mui/material';
import { ariaLabels, keyboardNavigation, screenReader } from '../utils/accessibility';

/**
 * Accessible Form Component
 * Provides WCAG 2.1 AA compliant form with proper ARIA labels and validation
 */
const AccessibleForm = ({
  fields = [],
  onSubmit,
  onReset,
  loading = false,
  error = null,
  success = null,
  title = 'Form',
  description,
  ...props
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Handle field changes
  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  }, [errors]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  // Validate field
  const validateField = useCallback((field, value) => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return ariaLabels.form.required(field.label);
    }
    
    if (field.validation) {
      return field.validation(value);
    }
    
    return null;
  }, []);

  // Validate all fields
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [fields, formData, validateField]);

  // Handle form submission
  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    
    if (validateForm() && onSubmit) {
      onSubmit(formData);
    } else {
      // Announce validation errors
      const errorCount = Object.keys(errors).length;
      screenReader.announce(
        `Form has ${errorCount} validation error${errorCount !== 1 ? 's' : ''}`,
        'assertive'
      );
    }
  }, [validateForm, onSubmit, formData, errors]);

  // Handle form reset
  const handleReset = useCallback(() => {
    setFormData({});
    setErrors({});
    setTouched({});
    if (onReset) {
      onReset();
    }
  }, [onReset]);

  // Render field based on type
  const renderField = useCallback((field) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];
    const isTouched = touched[field.name];
    const showError = isTouched && error;

    const commonProps = {
      id: field.name,
      name: field.name,
      value: value,
      onChange: (e) => handleFieldChange(field.name, e.target.value),
      onBlur: () => handleFieldBlur(field.name),
      error: showError,
      helperText: showError ? error : field.helperText,
      required: field.required,
      disabled: loading || field.disabled,
      'aria-describedby': showError ? `${field.name}-error` : field.helperText ? `${field.name}-helper` : undefined,
      'aria-invalid': showError,
      'aria-required': field.required
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
      case 'tel':
      case 'url':
        return (
          <TextField
            {...commonProps}
            type={field.type}
            label={field.label}
            placeholder={field.placeholder}
            fullWidth
            variant="outlined"
            InputProps={{
              'aria-label': field.ariaLabel || field.label
            }}
          />
        );

      case 'textarea':
        return (
          <TextField
            {...commonProps}
            multiline
            rows={field.rows || 4}
            label={field.label}
            placeholder={field.placeholder}
            fullWidth
            variant="outlined"
            InputProps={{
              'aria-label': field.ariaLabel || field.label
            }}
          />
        );

      case 'select':
        return (
          <FormControl
            fullWidth
            error={showError}
            required={field.required}
            disabled={loading || field.disabled}
          >
            <InputLabel id={`${field.name}-label`}>
              {field.label}
            </InputLabel>
            <Select
              {...commonProps}
              labelId={`${field.name}-label`}
              label={field.label}
              aria-label={field.ariaLabel || field.label}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {showError && (
              <FormHelperText id={`${field.name}-error`}>
                {error}
              </FormHelperText>
            )}
            {field.helperText && !showError && (
              <FormHelperText id={`${field.name}-helper`}>
                {field.helperText}
              </FormHelperText>
            )}
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                {...commonProps}
                checked={!!value}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                aria-label={field.ariaLabel || field.label}
              />
            }
            label={field.label}
            disabled={loading || field.disabled}
          />
        );

      case 'radio':
        return (
          <FormControl component="fieldset" error={showError}>
            <Typography component="legend" variant="subtitle2">
              {field.label}
            </Typography>
            <RadioGroup
              {...commonProps}
              aria-label={field.ariaLabel || field.label}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
            {showError && (
              <FormHelperText id={`${field.name}-error`}>
                {error}
              </FormHelperText>
            )}
            {field.helperText && !showError && (
              <FormHelperText id={`${field.name}-helper`}>
                {field.helperText}
              </FormHelperText>
            )}
          </FormControl>
        );

      case 'switch':
        return (
          <FormControlLabel
            control={
              <Switch
                {...commonProps}
                checked={!!value}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                aria-label={field.ariaLabel || field.label}
              />
            }
            label={field.label}
            disabled={loading || field.disabled}
          />
        );

      default:
        return null;
    }
  }, [formData, errors, touched, loading, handleFieldChange, handleFieldBlur]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      onReset={handleReset}
      aria-label={title}
      {...props}
    >
      {/* Form title */}
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>

      {/* Form description */}
      {description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>
      )}

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {error}
        </Alert>
      )}

      {/* Success message */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} role="status">
          {success}
        </Alert>
      )}

      {/* Form fields */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {fields.map((field) => (
          <Box key={field.name}>
            {renderField(field)}
          </Box>
        ))}
      </Box>

      {/* Form actions */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          aria-label={loading ? ariaLabels.form.submitting() : ariaLabels.button.save()}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Submitting...
            </>
          ) : (
            'Submit'
          )}
        </Button>
        
        <Button
          type="reset"
          variant="outlined"
          disabled={loading}
          aria-label={ariaLabels.button.cancel()}
        >
          Reset
        </Button>
      </Box>
    </Box>
  );
};

export default AccessibleForm;
