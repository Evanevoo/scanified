# OAuth Organization Linking System

## Overview

This system allows users who sign up via OAuth (Google, Apple) to securely join organizations using one-time numeric codes or email invitations. It addresses the challenge of linking OAuth users to organizations without requiring them to know organization details beforehand.

## Key Features

### 🔐 Security-First Design
- **One-time use codes**: Each code expires after use or time limit
- **6-digit numeric format**: Easy to share verbally or via text
- **Time-based expiration**: Configurable (default 24 hours)
- **Admin-only generation**: Only admins/managers can create codes
- **Audit trail**: Track who created and used codes

### 📱 Multi-Platform Support
- **Web App**: Full-featured organization linking page
- **Mobile App**: Native organization join screen
- **Deep linking**: Invite links work across platforms

### 🔄 Multiple Join Methods
1. **Email Invitations** (existing)
2. **One-time Join Codes** (new)
3. **Email Domain Matching** (automatic)
4. **Organization Browse** (admin approval)

## System Components

### Database Schema

```sql
-- One-time join codes table
CREATE TABLE organization_join_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMP NULL,
    used_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT true,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    notes TEXT
);
```

### PostgreSQL Functions

- `generate_numeric_join_code()`: Creates unique 6-digit codes
- `create_organization_join_code()`: Admin function to generate codes
- `use_organization_join_code()`: Validates and consumes codes
- `cleanup_expired_join_codes()`: Maintenance function

## User Flow

### Web App Flow

1. **User signs in with OAuth** (Google/Apple)
2. **System checks for organization**:
   - If linked → redirect to dashboard
   - If not linked → redirect to `/connect-organization`
3. **Organization Link Page** offers options:
   - Accept pending invitation (if available)
   - Enter 6-digit join code
   - Browse public organizations
   - Create new organization
4. **Code Entry**:
   - User enters 6-digit code
   - System validates code via `use_organization_join_code()`
   - Profile linked to organization
   - Redirect to dashboard

### Mobile App Flow

1. **User signs in with OAuth**
2. **App checks for organization**:
   - If linked → show home screen
   - If not linked → show `OrganizationJoinScreen`
3. **Join Screen** offers same options as web
4. **Code Entry** works identically
5. **Success** refreshes app state

### Admin Flow

1. **Admin accesses Join Codes page** (`/organization-join-codes`)
2. **Generate Code**:
   - Set expiration (1 hour - 1 week)
   - Set max uses (1-10)
   - Add optional notes
   - Code automatically copied to clipboard
3. **Share Code** securely with new user
4. **Monitor Usage**:
   - View active/expired codes
   - See usage statistics
   - Deactivate codes if needed

## Implementation Files

### Web App
- `src/pages/OAuthOrganizationLink.jsx` - Main organization linking page
- `src/pages/OrganizationJoinCodes.jsx` - Admin interface for code management
- `src/App.jsx` - Updated routing for OAuth users
- `src/components/Sidebar.jsx` - Added "Join Codes" menu item

### Mobile App
- `screens/OrganizationJoinScreen.tsx` - Native organization join interface
- `App.tsx` - Updated navigation flow
- `LoginScreen.tsx` - Enhanced OAuth handling

### Database
- `create-one-time-join-codes.sql` - Complete database schema
- PostgreSQL functions for code management
- RLS policies for security

## Security Considerations

### Code Generation
- Cryptographically random 6-digit codes
- Collision detection ensures uniqueness
- Configurable expiration times
- Rate limiting (admin-generated only)

### Access Control
- Row Level Security (RLS) policies
- Admin/manager roles required for code creation
- Users can only join via valid codes
- Audit logging of all code operations

### Data Protection
- Codes are single-use by default
- Automatic cleanup of expired codes
- No permanent organization identifiers exposed
- Secure token handling in mobile apps

## Testing

### Test Page
`test-oauth-flow.html` provides a browser-based testing interface:
- Generate test codes
- Simulate user join flow
- Validate code consumption
- Test error scenarios

### Manual Testing Steps

1. **Generate Code** (as admin):
   ```
   Navigate to /organization-join-codes
   Click "Generate Code"
   Copy the 6-digit code
   ```

2. **Test Join Flow** (as new user):
   ```
   Sign up with OAuth
   Navigate to /connect-organization
   Enter the 6-digit code
   Verify successful join
   ```

3. **Verify Code Consumption**:
   ```
   Try using the same code again
   Should show "already been used" error
   ```

### Automated Testing

```javascript
// Example test case
describe('OAuth Organization Linking', () => {
  it('should allow user to join via one-time code', async () => {
    // 1. Admin generates code
    const code = await generateJoinCode(orgId, adminId);
    
    // 2. User signs up with OAuth
    const user = await signUpWithOAuth('google');
    
    // 3. User enters code
    const result = await useJoinCode(code.code, user.id);
    
    // 4. Verify success
    expect(result.success).toBe(true);
    expect(result.organization_id).toBe(orgId);
    
    // 5. Verify code is consumed
    const secondUse = await useJoinCode(code.code, user.id);
    expect(secondUse.success).toBe(false);
  });
});
```

## Configuration

### Environment Variables
```bash
# Web App
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Admin Operations (server-side)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Code Settings (Configurable)
- **Expiration Time**: 1 hour to 1 week (default: 24 hours)
- **Max Uses**: 1-10 uses per code (default: 1)
- **Code Length**: 6 digits (fixed for security/usability balance)
- **Cleanup Frequency**: Daily cleanup of expired codes

## Monitoring & Analytics

### Metrics to Track
- Code generation frequency
- Code usage success rate
- Time between generation and use
- Failed join attempts
- Organization growth via codes

### Admin Dashboard
The Organization Join Codes page provides:
- Active code count
- Usage statistics
- Expiration warnings
- Recent activity log

## Best Practices

### For Admins
1. **Generate codes just-in-time** (don't create in advance)
2. **Use short expiration times** for sensitive organizations
3. **Add descriptive notes** to track code purpose
4. **Monitor usage** and deactivate unused codes
5. **Share codes securely** (avoid email, use secure messaging)

### For Developers
1. **Handle all error cases** gracefully
2. **Provide clear user feedback** during join process
3. **Test OAuth flows** on both platforms
4. **Monitor code usage** for abuse patterns
5. **Keep audit logs** for security compliance

## Troubleshooting

### Common Issues

**"Invalid join code"**
- Code may be expired
- Code may have been used
- Code may have been deactivated
- User may have mistyped code

**"User already has organization"**
- Check if user is already linked
- May need to leave current organization first

**"OAuth user not found"**
- Ensure OAuth flow completed successfully
- Check Supabase auth session

### Debug Steps

1. **Check code status**:
   ```sql
   SELECT * FROM organization_join_codes 
   WHERE code = 'XXXXXX';
   ```

2. **Check user profile**:
   ```sql
   SELECT * FROM profiles 
   WHERE email = 'user@example.com';
   ```

3. **Test code function**:
   ```sql
   SELECT * FROM use_organization_join_code('123456', 'user-uuid');
   ```

## Future Enhancements

### Planned Features
- QR code generation for easy mobile sharing
- Bulk code generation for events
- Integration with calendar invites
- SMS/WhatsApp code delivery
- Advanced analytics dashboard

### Scalability Considerations
- Code generation rate limiting
- Database partitioning for large organizations
- Caching of frequently accessed codes
- Background cleanup jobs

## Support

### For Users
- Contact your organization administrator for join codes
- Use the "Browse Organizations" option if available
- Create a new organization if you're the first user

### For Admins
- Access Join Codes via the admin menu
- Generate codes with appropriate expiration times
- Monitor code usage in the dashboard
- Contact support for bulk operations

---

This system provides a secure, user-friendly way for OAuth users to join organizations while maintaining strong security principles and excellent user experience across all platforms.
