# System Flow Diagrams

## 🎨 Visual Guide to New System

---

## 1️⃣ Create Organization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER VISITS /create-organization              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  FORM: Enter Organization Name, Your Name, Email, Password      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼ User clicks "Continue"
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND: Create verification record in database                │
│           Generate unique token                                  │
│           Store password in sessionStorage (temporary)           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  EMAIL: Send verification link to user's email                  │
│         Link: /verify-organization?token=xxx                     │
│         Expires in: 24 hours                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  PAGE: "Check Your Email" - waiting for verification            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ User clicks link in email
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  /verify-organization page loads                                 │
│  - Validates token                                               │
│  - Retrieves password from sessionStorage                        │
│  - Creates user account (supabase.auth.signUp)                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE FUNCTION: create_verified_organization()              │
│  - Creates organization with unique slug                         │
│  - Creates admin role                                            │
│  - Creates user profile with admin role                          │
│  - Marks verification as complete                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  AUTO SIGN-IN: User is signed in automatically                  │
│  REDIRECT: User sent to /home dashboard                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
                  🎉 SUCCESS! 🎉
```

---

## 2️⃣ Send Invitation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              ADMIN VISITS /user-invites                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  TABLE: Shows all pending invitations                            │
│  BUTTON: "Send Invite"                                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼ Admin clicks "Send Invite"
┌─────────────────────────────────────────────────────────────────┐
│  DIALOG: Enter email address and select role                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼ Admin clicks "Send Invite"
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE FUNCTION: create_user_invite()                         │
│  - Creates invite record in organization_invites table           │
│  - Generates unique token                                        │
│  - Sets expiration (7 days)                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  EMAIL: Send invitation to user's email                          │
│         Link: /accept-invite?token=xxx                           │
│         Expires in: 7 days                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUCCESS MESSAGE: "Invite sent to email@example.com!"           │
│  TABLE UPDATES: New invite appears in pending invites            │
└──────────────────────┴──────────────────────────────────────────┘
                       
                  🎉 INVITE SENT! 🎉
```

---

## 3️⃣ Accept Invitation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│     INVITED USER RECEIVES EMAIL, CLICKS INVITE LINK             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  /accept-invite?token=xxx page loads                             │
│  - Validates token                                               │
│  - Checks expiration                                             │
│  - Loads organization info                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  PAGE: "Join [Organization Name]"                                │
│  FORM: Enter name, email (pre-filled), create password          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼ User clicks "Create Account & Join"
┌─────────────────────────────────────────────────────────────────┐
│  CREATE ACCOUNT: supabase.auth.signUp()                          │
│  - Email is pre-filled from invite                               │
│  - User chooses password                                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  CREATE/UPDATE PROFILE:                                          │
│  - Link user to organization                                     │
│  - Assign role from invite                                       │
│  - Mark as active                                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  MARK INVITE AS ACCEPTED:                                        │
│  - Update accepted_at timestamp                                  │
│  - Remove from pending invites                                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  AUTO SIGN-IN: User is signed in automatically                  │
│  REDIRECT: User sent to /home dashboard                          │
└──────────────────────┴──────────────────────────────────────────┘
                       
                  🎉 USER JOINED! 🎉
```

---

## 4️⃣ Delete Organization Flow (NEW!)

```
┌─────────────────────────────────────────────────────────────────┐
│  OWNER: Go to Owner Portal > Customer Management                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  TABLE: List of all organizations                                │
│  ACTION: Click delete icon for an organization                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  DIALOG: "Are you sure?"                                         │
│  INPUT: Enter deletion reason                                    │
│  WARNING: "This will permanently delete all user accounts"       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼ Owner confirms deletion
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Get all users in organization                           │
│          FROM profiles WHERE organization_id = xxx               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: PERMANENTLY DELETE ALL USER PROFILES                    │
│          DELETE FROM profiles WHERE organization_id = xxx        │
│          ⚠️  Users are GONE - emails can be reused              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Delete all pending invites                              │
│          DELETE FROM organization_invites WHERE org_id = xxx     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: SOFT DELETE ORGANIZATION (for recovery)                 │
│          UPDATE organizations SET                                │
│            deleted_at = NOW(),                                   │
│            deleted_by = owner_id,                                │
│            deletion_reason = reason                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUCCESS: "Organization and X users permanently deleted"         │
│  NOTE: "Organization can be restored, but users need new emails" │
└──────────────────────┴──────────────────────────────────────────┘
                       
              🗑️ ORGANIZATION DELETED! 🗑️
                   (But recoverable!)
```

---

## 5️⃣ Restore Organization Flow (NEW!)

```
┌─────────────────────────────────────────────────────────────────┐
│  OWNER: Go to Owner Portal > Customer Management                │
│  TOGGLE: Turn on "Show Deleted"                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  TABLE: Deleted organizations appear (red background)            │
│  ICON: Restore button (↻) instead of delete button              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼ Owner clicks restore
┌─────────────────────────────────────────────────────────────────┐
│  DIALOG: "Restore [Organization Name]?"                          │
│  WARNING: "Users were permanently deleted. They need new emails" │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼ Owner confirms
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE: UPDATE organizations SET                              │
│            deleted_at = NULL,                                    │
│            deleted_by = NULL,                                    │
│            deletion_reason = NULL                                │
│            WHERE id = xxx                                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUCCESS: "Organization restored!"                               │
│  NOTE: "Users were permanently deleted. Send new invites."       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  OWNER ACTION REQUIRED:                                          │
│  - Go to /user-invites                                           │
│  - Send new invites to users                                     │
│  - Users MUST use DIFFERENT email addresses                      │
└──────────────────────┴──────────────────────────────────────────┘
                       
           ♻️ ORGANIZATION RESTORED! ♻️
          (Ready for new users with new emails)
```

---

## 🔑 Key Points

### Email Verification
- **Required** for security
- Links expire in **24 hours**
- Prevents spam accounts

### User Deletion
- **Permanent** when organization is deleted
- Emails can be **reused immediately**
- Clean, simple database

### Restoration
- Organization **can be recovered**
- Users **cannot be recovered**
- New users need **new email addresses**

---

## 📊 Data Retention

| What | When Org Deleted | When Org Restored |
|------|------------------|-------------------|
| Organization | ✅ Soft deleted (recoverable) | ✅ Restored |
| Users | ❌ Permanently deleted | ❌ Stay deleted |
| Bottles | ✅ Kept | ✅ Still there |
| Customers | ✅ Kept | ✅ Still there |
| Scans | ✅ Kept | ✅ Still there |
| Invites | ❌ Deleted | ❌ Must create new |

---

**This is exactly what you requested! Simple, clean, and professional.** ✨

