# Google Play Store Listing — School Manager

## App Name (30 chars max)
School Manager

## Short Description (80 chars max)
Manage your school — pupils, teachers, parents, attendance, fees & reports.

## Full Description (4000 chars max)

School Manager is a comprehensive multi-school management platform designed for nursery and primary schools. Run your entire school from one app — manage pupils, teachers, parents, attendance, fees, assessments, and reports.

🏫 SCHOOL MANAGEMENT MADE EASY
Whether you manage one school or multiple schools, School Manager gives you complete control. Register your school in minutes and start managing everything from enrollment to report cards.

👨‍🎓 PUPIL MANAGEMENT
• Comprehensive admission forms with all student details
• Upload student photos
• Track enrollment history and transfers
• Link parents/guardians to students
• Manage boarding and day students

👩‍🏫 TEACHER MANAGEMENT
• Teacher profiles with qualifications
• Assign teachers to classes and subjects
• Track teacher attendance
• Upload teacher photos

👪 PARENT PORTAL
• Parents can view their children's progress
• Receive notifications and announcements
• View attendance records and report cards
• Stay connected with the school

📋 ATTENDANCE TRACKING
• Daily attendance marking for all classes
• Attendance reports and statistics
• Track absence patterns
• Export attendance records

💰 FEES & PAYMENTS
• Create custom fee structures
• Record payments with receipts
• Track outstanding balances
• Financial reports and summaries
• Multi-currency support (USD, KES, UGX)

📊 REPORTS & ANALYTICS
• Enrollment reports
• Attendance summaries
• Financial reports
• School profile reports
• Export as PDF, Excel, or Text
• Share reports via WhatsApp, Email, etc.

📝 ASSESSMENTS & REPORT CARDS
• Record student assessments
• Generate professional report cards
• Track academic performance over time

📢 ANNOUNCEMENTS & NOTIFICATIONS
• Send announcements to teachers, parents, or all
• Platform-wide broadcasts from administration
• Real-time notification bell with sound alerts

🎨 CUSTOMIZABLE
• Custom school branding (colors, fonts, logo)
• Theme customization for each school
• Personalized report headers

📱 WORKS OFFLINE
• Use the app even without internet
• Changes sync automatically when connected
• Your data is always safe and backed up

🔒 SECURE
• Role-based access (Admin, Teacher, Parent)
• Encrypted data transmission
• School-isolated data — each school sees only their own data

💎 SUBSCRIPTION PLANS
• Free Starter plan to get started
• Standard and Pro plans for advanced features
• Flexible billing: Monthly, Termly, or Yearly

Download School Manager today and transform how you manage your school!

## Category
Education

## Tags / Keywords
school management, school app, pupil management, attendance tracker, fee management, report cards, school administration, education app, teacher management, parent portal, primary school, nursery school, school fees, school reports

## Content Rating
Everyone

## Contact Email
support@yourdomain.com

## Privacy Policy URL
https://yourdomain.com/privacy-policy.html

---

## Required Assets Checklist

### Icons
- [ ] Hi-res icon: 512 x 512 PNG (store-assets/hi-res-icon-512x512.svg → convert to PNG)

### Feature Graphic
- [ ] Feature graphic: 1024 x 500 PNG (store-assets/feature-graphic-1024x500.svg → convert to PNG)

### Screenshots (minimum 2, recommended 8)
Required sizes: Phone screenshots should be min 320px, max 3840px on any side
- [ ] Login screen
- [ ] Dashboard
- [ ] Pupils list
- [ ] Attendance marking
- [ ] Report cards
- [ ] Fee management
- [ ] Announcements
- [ ] Settings/Theme customization

### How to take screenshots:
1. Open the app in Chrome DevTools mobile view (Pixel 5 or similar)
2. Navigate to each page
3. Take screenshot (Cmd+Shift+P → "Capture screenshot")
4. Save as PNG in store-assets/screenshots/

---

## App Signing

### Generate a signing key (run once, keep the .jks file safe!):
```bash
keytool -genkeypair -v -storetype JKS \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -alias school-manager \
  -keystore school-manager-release.jks \
  -dname "CN=School Manager, OU=Development, O=School Manager, L=Kampala, ST=Central, C=UG"
```

### Build signed AAB (Android App Bundle) for Play Store:
In Android Studio:
1. Build → Generate Signed Bundle / APK
2. Choose "Android App Bundle"
3. Select your keystore file
4. Build "release" variant
5. The .aab file will be in: android/app/build/outputs/bundle/release/

### Or build from command line:
```bash
cd frontend/android
./gradlew bundleRelease
```

