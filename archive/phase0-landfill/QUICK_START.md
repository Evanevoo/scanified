# Quick Start - New System

## 🚀 What Changed?

Everything related to creating organizations and inviting users has been **completely rebuilt** from scratch to be simple, secure, and professional.

## ⚡ Quick Setup (5 minutes)

### Step 1: Run SQL Script
Copy and paste the entire contents of `setup-proper-invitation-system.sql` into your **Supabase SQL Editor** and execute it.

### Step 2: Test It Out

#### Create an Organization:
1. Go to `http://localhost:5174/create-organization`
2. Fill in your details
3. Check your email for verification link
4. Click the link
5. You're in! 🎉

#### Invite a User:
1. Sign in as admin
2. Go to `http://localhost:5174/user-invites`
3. Click "Send Invite"
4. Enter email and select role
5. User receives email with invite link
6. They click, create account, and join! 🎉

## 🗑️ Organization Deletion - IMPORTANT CHANGE

When you delete an organization from Owner Portal > Customer Management:

- ✅ Organization data is **soft deleted** (can be restored)
- ❌ All user accounts are **PERMANENTLY DELETED**
- 📧 If restored, users need **new email addresses** to rejoin

This is what you requested: "delete all the users associated with, and if the organization want it back, they will need to provide new email for it."

## 📁 New Pages

| Page | URL | Description |
|------|-----|-------------|
| Create Organization | `/create-organization` | New signup with email verification |
| Verify Organization | `/verify-organization?token=...` | Handles email verification |
| User Invites | `/user-invites` | Send and manage invitations |
| Accept Invite | `/accept-invite?token=...` | Accept invitation and join |

## 🔗 Updated Links

All "Start Free Trial" and "Create Organization" buttons now point to `/create-organization`.

## ✅ Ready to Deploy

All code is ready. Just run the SQL script and you're good to go!

## 📧 Email Service

The system uses your existing Netlify email function. Make sure you have SMTP configured in Netlify environment variables (SMTP2GO, Gmail, or Outlook).

## 🐛 Common Issues

**Email not sending?**
- Check Netlify function logs
- The system still works - users can copy invite links manually

**"User already registered"?**
- That email has an account - they should sign in instead

**Verification link expired?**
- Links expire in 24 hours - user must start over

## 📞 Need Help?

Check `SETUP_NEW_SYSTEM.md` for detailed documentation and troubleshooting.

