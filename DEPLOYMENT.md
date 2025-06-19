# Deployment Guide

This guide will help you deploy the Gas Cylinder Management Application to either Netlify or Vercel.

## Prerequisites

- GitHub repository connected (already done)
- Supabase project configured
- Environment variables ready

## Environment Variables

Before deploying, you'll need to set up these environment variables in your deployment platform:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Option 1: Deploy to Netlify

### Method 1: Connect via GitHub (Recommended)

1. **Go to Netlify**
   - Visit [netlify.com](https://netlify.com)
   - Sign up/Login with your GitHub account

2. **Create New Site**
   - Click "New site from Git"
   - Choose "GitHub" as your Git provider
   - Select your repository: `Evanevoo/Gas-Cylinder-`

3. **Configure Build Settings**
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18`

4. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add your Supabase environment variables

5. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically build and deploy your site

### Method 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Build your project
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

## Option 2: Deploy to Vercel

### Method 1: Connect via GitHub (Recommended)

1. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Sign up/Login with your GitHub account

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository: `Evanevoo/Gas-Cylinder-`

3. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Set Environment Variables**
   - Add your Supabase environment variables
   - Click "Deploy"

### Method 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Post-Deployment

### 1. Verify Deployment
- Check that your site loads correctly
- Test authentication functionality
- Verify Supabase connection

### 2. Set Up Custom Domain (Optional)
- **Netlify**: Site settings → Domain management
- **Vercel**: Project settings → Domains

### 3. Configure HTTPS
- Both platforms provide automatic HTTPS
- No additional configuration needed

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Node.js version (should be 18+)
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Environment Variables Not Working**
   - Ensure variables are set in deployment platform
   - Check variable names (must start with `VITE_`)
   - Redeploy after adding variables

3. **Supabase Connection Issues**
   - Verify Supabase URL and keys
   - Check CORS settings in Supabase
   - Ensure Row Level Security is configured

### Build Optimization

The deployment configurations include:
- ✅ Static asset caching
- ✅ Security headers
- ✅ SPA routing support
- ✅ Performance optimizations

## Monitoring

### Netlify
- Function logs in dashboard
- Build logs for debugging
- Analytics and performance metrics

### Vercel
- Function logs in dashboard
- Real-time build logs
- Performance analytics

## Continuous Deployment

Both platforms support automatic deployments:
- Every push to `main` branch triggers a new deployment
- Preview deployments for pull requests
- Rollback to previous versions if needed

## Support

If you encounter issues:
1. Check the platform's documentation
2. Review build logs for errors
3. Verify environment variables
4. Test locally with `npm run build` 