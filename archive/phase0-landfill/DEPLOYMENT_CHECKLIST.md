# 📋 Deployment Checklist

## ✅ Pre-Deployment

### Database Setup
- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Copy entire contents of `setup-proper-invitation-system.sql`
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Verify "SUCCESS" message appears
- [ ] Check tables created:
  - [ ] `organization_verifications`
  - [ ] `organization_invites` (recreated)
- [ ] Check functions created:
  - [ ] `request_organization_verification()`
  - [ ] `create_verified_organization()`
  - [ ] `create_user_invite()`

### Email Configuration
- [ ] Open Netlify Dashboard
- [ ] Go to Site Settings > Environment Variables
- [ ] Verify one of these is configured:
  - [ ] SMTP2GO (SMTP2GO_USER, SMTP2GO_PASSWORD, SMTP2GO_FROM)
  - [ ] Gmail (EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM)
  - [ ] Outlook (OUTLOOK_USER, OUTLOOK_PASSWORD, OUTLOOK_FROM)

### Code Review
- [ ] All new files created:
  - [ ] `src/pages/CreateOrganization.jsx`
  - [ ] `src/pages/VerifyOrganization.jsx`
  - [ ] `src/pages/UserInvites.jsx`
  - [ ] `src/pages/AcceptInvite.jsx`
  - [ ] `netlify/functions/email-templates.js`
  - [ ] `setup-proper-invitation-system.sql`
- [ ] Old files deleted:
  - [ ] `src/pages/OrganizationDeleted.jsx`
- [ ] Routes updated in `src/App.jsx`:
  - [ ] `/create-organization` → CreateOrganization
  - [ ] `/verify-organization` → VerifyOrganization
  - [ ] `/accept-invite` → AcceptInvite
  - [ ] `/user-invites` → UserInvites

---

## 🧪 Local Testing

### Test 1: Organization Creation
- [ ] Visit `http://localhost:5174/create-organization`
- [ ] Fill in all fields with real email
- [ ] Click "Continue"
- [ ] Check email inbox (and spam folder!)
- [ ] Email received within 1 minute? ✅
- [ ] Click verification link in email
- [ ] Redirected to dashboard? ✅
- [ ] Can see "Home" page? ✅
- [ ] Organization appears in database? ✅
- [ ] User profile created with admin role? ✅

### Test 2: User Invitation
- [ ] Sign in as admin
- [ ] Visit `http://localhost:5174/user-invites`
- [ ] Click "Send Invite"
- [ ] Enter test email and role
- [ ] Click "Send Invite"
- [ ] Success message appears? ✅
- [ ] Invite appears in pending table? ✅
- [ ] Email received? ✅
- [ ] Click invite link
- [ ] Can create account? ✅
- [ ] User joins organization? ✅
- [ ] Invite marked as accepted? ✅

### Test 3: Organization Deletion
- [ ] Sign in as platform owner
- [ ] Go to Owner Portal > Customer Management
- [ ] Find test organization
- [ ] Click delete icon
- [ ] Enter deletion reason
- [ ] Confirm deletion
- [ ] Organization marked as deleted? ✅
- [ ] User profiles deleted from database? ✅
- [ ] Can re-register with same email? ✅

### Test 4: Organization Restoration
- [ ] Still in Customer Management
- [ ] Toggle "Show Deleted" to ON
- [ ] Deleted organization appears? ✅
- [ ] Click restore icon
- [ ] Confirm restoration
- [ ] Organization marked as active? ✅
- [ ] Try to sign in with old email - should fail ✅
- [ ] Send new invite with different email ✅
- [ ] New user can join? ✅

### Test 5: Landing Page Links
- [ ] Visit `http://localhost:5174/`
- [ ] Click "Start Free Trial"
- [ ] Goes to `/create-organization`? ✅
- [ ] Click "Create Organization" (if visible)
- [ ] Goes to `/create-organization`? ✅

### Test 6: Email Templates
- [ ] Organization verification email looks professional? ✅
- [ ] Invitation email looks professional? ✅
- [ ] Links work correctly? ✅
- [ ] Expiration times shown? ✅

---

## 🚀 Production Deployment

### Build & Deploy
- [ ] Run `npm run build`
- [ ] Build completes without errors? ✅
- [ ] Run `netlify deploy --prod` (or push to Git)
- [ ] Deployment successful? ✅
- [ ] Visit production URL

### Production Testing
- [ ] Create organization on production ✅
- [ ] Receive verification email ✅
- [ ] Verify and sign in ✅
- [ ] Send invitation ✅
- [ ] Accept invitation ✅
- [ ] All features working ✅

---

## 📱 Post-Deployment

### Documentation
- [ ] Read `QUICK_START.md`
- [ ] Read `SETUP_NEW_SYSTEM.md`
- [ ] Read `REBUILD_SUMMARY.md`
- [ ] Understand all changes

### Monitoring
- [ ] Check Netlify function logs for email issues
- [ ] Check Supabase logs for database errors
- [ ] Monitor error rate in first 24 hours
- [ ] Test from different email providers (Gmail, Outlook, etc.)

### User Communication (if needed)
- [ ] Notify existing users about new signup flow
- [ ] Update any external documentation
- [ ] Update FAQs if needed

---

## ⚠️ Rollback Plan (If Needed)

### If Something Goes Wrong:
1. Revert Git commit: `git revert HEAD`
2. Redeploy previous version
3. Restore `organization_invites` table from backup
4. Contact support with error logs

### Database Backup:
- [ ] Before running SQL script, export these tables:
  - [ ] `organization_invites`
  - [ ] `organization_verifications` (if exists)

---

## 🎯 Success Criteria

All these should be TRUE:
- [x] SQL script ran successfully
- [ ] No linter errors in code
- [ ] All tests pass locally
- [ ] Email sending works
- [ ] Organization creation works
- [ ] User invitations work
- [ ] Organization deletion works correctly
- [ ] Organization restoration works correctly
- [ ] Production deployment successful
- [ ] No errors in logs for 24 hours

---

## 📞 Support Contacts

### If Issues Occur:
- Check browser console for frontend errors
- Check Netlify function logs for email errors
- Check Supabase logs for database errors
- Review `SETUP_NEW_SYSTEM.md` for troubleshooting

### Documentation:
- `WHAT_TO_DO_NOW.md` - Start here
- `QUICK_START.md` - Fast setup
- `SETUP_NEW_SYSTEM.md` - Detailed guide
- `REBUILD_SUMMARY.md` - What changed
- `FLOW_DIAGRAMS.md` - Visual flows

---

## ✨ Final Checklist

Before marking as complete:
- [ ] All database changes applied
- [ ] All local tests passed
- [ ] Production deployment successful
- [ ] Email service working
- [ ] No critical errors in logs
- [ ] Documentation reviewed
- [ ] Team notified (if applicable)

---

**Once all checkboxes are checked, you're DONE! 🎉**

