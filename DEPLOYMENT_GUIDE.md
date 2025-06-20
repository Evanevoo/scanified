# 🚀 **DEPLOYMENT GUIDE - NEW FEATURES**

## 📋 **Overview**
This guide will help you deploy the new notification system and delivery management features to your existing gas cylinder management system.

---

## 🔧 **STEP 1: DATABASE SETUP**

### **1.1 Apply the Delivery Schema**
Run the following SQL in your Supabase SQL editor:

```sql
-- Copy and paste the contents of delivery_schema_fixed.sql
-- This creates all the necessary tables for delivery management and notifications
```

**Tables Created:**
- `deliveries` - Main delivery management
- `delivery_items` - Items being delivered
- `delivery_zones` - Geographic delivery zones
- `delivery_routes` - Route optimization data
- `driver_locations` - Real-time driver tracking
- `notifications` - In-app notification system
- `notification_preferences` - User notification settings

### **1.2 Verify Tables Created**
Check that all tables were created successfully in your Supabase dashboard.

---

## 🔧 **STEP 2: NETLIFY FUNCTIONS SETUP**

### **2.1 Install Dependencies**
Add these to your `package.json` dependencies:

```json
{
  "nodemailer": "^6.9.7",
  "twilio": "^4.19.0"
}
```

### **2.2 Configure Environment Variables**
Add these to your Netlify environment variables:

```env
# Email Configuration (Gmail example)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@gascylinderapp.com

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Existing Stripe Configuration
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable
```

### **2.3 Deploy Netlify Functions**
The following functions are already created:
- `netlify/functions/send-email.js`
- `netlify/functions/send-sms.js`

Deploy them to Netlify by pushing your code.

---

## 🔧 **STEP 3: FRONTEND INTEGRATION**

### **3.1 Update Components**
The following components have been updated:
- `src/components/Navbar.jsx` - Added notification center
- `src/components/Sidebar.jsx` - Added delivery management link
- `src/services/notificationService.js` - New notification service
- `src/services/deliveryService.js` - Updated delivery service
- `src/pages/DeliveryManagement.jsx` - New delivery management page

### **3.2 Add New Routes**
Add these routes to your main App component:

```jsx
import DeliveryManagement from './pages/DeliveryManagement';

// In your routes
<Route path="/deliveries" element={<DeliveryManagement />} />
```

---

## 🔧 **STEP 4: MOBILE APP UPDATES**

### **4.1 Install Mobile Dependencies**
In your mobile app directory (`gas-cylinder-mobile`):

```bash
npm install expo-location react-native-maps react-native-vector-icons
```

### **4.2 Add New Screen**
The `DriverDashboard.tsx` screen has been created for mobile drivers.

### **4.3 Update Navigation**
Add the driver dashboard to your mobile app navigation.

---

## 🔧 **STEP 5: TESTING**

### **5.1 Test Notifications**
1. Create a test delivery
2. Assign a driver
3. Check that notifications are created in the database
4. Test email sending (check your email service logs)

### **5.2 Test Delivery Management**
1. Create a new delivery
2. Assign a driver
3. Update delivery status
4. Verify real-time updates

### **5.3 Test Mobile Features**
1. Open the mobile app
2. Navigate to driver dashboard
3. Test location tracking
4. Test delivery status updates

---

## 🔧 **STEP 6: CONFIGURATION**

### **6.1 Email Service Setup**
**For Gmail:**
1. Enable 2-factor authentication
2. Generate an app password
3. Use the app password in EMAIL_PASSWORD

**For SendGrid/Resend:**
1. Create an account
2. Get API key
3. Update the email function accordingly

### **6.2 SMS Service Setup**
**For Twilio:**
1. Create a Twilio account
2. Get Account SID and Auth Token
3. Get a phone number
4. Add to environment variables

### **6.3 Driver Role Setup**
Create driver users in your system:
1. Go to user management
2. Create users with role 'driver'
3. These users will see the driver dashboard

---

## 🔧 **STEP 7: PRODUCTION DEPLOYMENT**

### **7.1 Frontend Deployment**
Deploy your updated React app to your hosting platform (Netlify, Vercel, etc.)

### **7.2 Mobile App Deployment**
Build and deploy your mobile app:
```bash
# For Android
expo build:android

# For iOS
expo build:ios
```

### **7.3 Database Migration**
Ensure all database changes are applied to production:
1. Run the delivery schema
2. Verify all tables exist
3. Test RLS policies

---

## 🔧 **STEP 8: MONITORING**

### **8.1 Check Logs**
Monitor your Netlify function logs for:
- Email sending errors
- SMS sending errors
- Database connection issues

### **8.2 Monitor Performance**
- Check delivery creation speed
- Monitor notification delivery rates
- Track mobile app performance

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues:**

**1. "organization_id does not exist" error**
- Solution: Use the `delivery_schema_fixed.sql` instead of the original
- This version works without multi-tenancy initially

**2. Email not sending**
- Check EMAIL_USER and EMAIL_PASSWORD
- Verify Gmail app password is correct
- Check Netlify function logs

**3. SMS not sending**
- Verify Twilio credentials
- Check phone number format
- Review Twilio console for errors

**4. Notifications not appearing**
- Check RLS policies
- Verify user authentication
- Check database permissions

**5. Mobile app location issues**
- Ensure location permissions are granted
- Check Expo location configuration
- Verify device GPS is enabled

---

## 📞 **SUPPORT**

If you encounter issues:

1. **Check the logs** in Supabase and Netlify
2. **Verify environment variables** are set correctly
3. **Test each component** individually
4. **Review the database schema** for any missing tables

---

## ✅ **VERIFICATION CHECKLIST**

- [ ] Database tables created successfully
- [ ] Netlify functions deployed
- [ ] Environment variables configured
- [ ] Frontend components updated
- [ ] Mobile app updated
- [ ] Email notifications working
- [ ] SMS notifications working
- [ ] Delivery management functional
- [ ] Driver dashboard working
- [ ] Location tracking enabled
- [ ] RLS policies working
- [ ] All tests passing

---

## 🎉 **SUCCESS!**

Once all steps are completed, you'll have:
- ✅ Real-time notification system
- ✅ Complete delivery management
- ✅ Mobile driver dashboard
- ✅ Location tracking
- ✅ Email and SMS notifications
- ✅ Route optimization
- ✅ Delivery analytics

Your gas cylinder management system is now enhanced with modern delivery and notification capabilities! 