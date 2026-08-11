# Requirements Document

## 1. Application Overview

**Application Name**: Bellinzone A Credit

**Description**: A full-stack digital banking web application built with React + Vite (TypeScript) frontend and Supabase backend. The platform provides comprehensive banking services including account management, fund transfers, investment plans, credit cards, and loan products.

**Tagline**: Empowering Your Financial Future

**Contact Information**:
- Address: London Office, Skyboard Plaza, Westminster, SW1A 1AA
- Phone: +8801682648101
- Email: Available via contact form

## 2. Users and Usage Scenarios

**Target Users**:
- Individual banking customers seeking digital banking services
- Investors looking for investment opportunities
- Students requiring banking accounts
- Corporate clients needing business banking solutions
- Private banking clients

**Core Usage Scenarios**:
- Open new bank accounts online
- Manage personal finances and view account balances
- Transfer funds between accounts
- Invest in various investment plans
- Apply for loans and credit cards
- Access insurance and private banking services

## 3. Page Structure and Functionality

### 3.1 Page Hierarchy

```
Bellinzone A Credit
├── Public Pages (Marketing Site)
│   ├── Home (/)
│   ├── Digital Banking (/digital-banking)
│   ├── Mobile & Web Banking (/mobile-web-banking)
│   ├── Insurance Policies (/insurance-policies)
│   ├── Home & Property Loan (/home-property-loan)
│   ├── All Bank Accounts (/all-bank-accounts)
│   ├── Borrowing Accounts (/borrowing-account)
│   ├── Private Banking (/private-banking)
│   ├── Fixed Term Account (/fixed-term-account)
│   ├── Investment Plans (/investment)
│   ├── Credit Cards (/credit-cards)
│   ├── Contact (/contact)
│   ├── Login (/login)
│   └── Register (/register)
└── Authenticated Dashboard Pages
    ├── Dashboard (/dashboard)
    ├── Transactions (/dashboard/transactions)
    ├── Transfer (/dashboard/transfer)
    └── Profile (/dashboard/profile)
```

### 3.2 Public Pages Functionality

#### 3.2.1 Home (/)
- **Hero Banner Carousel**: Display 3 rotating slides
  - Slide 1: \"Future-Ready Digital Banking\"
  - Slide 2: \"Seamless Wealth Management\"
  - Slide 3: \"Smarter Investing Solutions\"
- **Feature Cards**: Display three key features
  - Wealth Protection
  - Global Connectivity
  - Smart Analytics
- **About Section**: \"Modern Banking Redefined\" content
- **Investment Portfolio Tiers Preview**: Overview of available investment tiers
- **Digital Ecosystem Section**: Showcase digital banking capabilities
- **Statistics Display**:
  - 2.4B+ AUM (Assets Under Management)
  - 500K+ investors
  - 99.9% uptime
- **Testimonials**: Display 5 client testimonials
- **Footer**: Newsletter subscription form, navigation links, social media icons, copyright 2026

#### 3.2.2 Digital Banking (/digital-banking)
- **Hero Section**: Introduction to digital banking services
- **Features Display**:
  - Instant Notifications
  - Multi-Currency Access
  - Smart Safe Vaults
- **Mock Banking UI Card**: Display sample balance of $84,950.40

#### 3.2.3 Mobile & Web Banking (/mobile-web-banking)
- Display mobile and web banking features

#### 3.2.4 Insurance Policies (/insurance-policies)
- Display available insurance products

#### 3.2.5 Home & Property Loan (/home-property-loan)
- Display loan products for home and property purchases

#### 3.2.6 All Bank Accounts (/all-bank-accounts)
- Display 6 account types with details:
  - Smart Savings: 4.85% APY
  - Premium Current Checking
  - Corporate Vanguard
  - Student Next-Gen
  - Joint Dual Checking
  - Fixed Capital Deposit: 5.40% APY

#### 3.2.7 Borrowing Accounts (/borrowing-account)
- Display borrowing products and services

#### 3.2.8 Private Banking (/private-banking)
- Display private banking services for high-net-worth clients

#### 3.2.9 Fixed Term Account (/fixed-term-account)
- Display fixed term deposit products

#### 3.2.10 Investment Plans (/investment)
- Display 4 investment tiers:
  - **Starter**: 150% return, Minimum $500, 5 days duration
  - **Beginner Growth**: 16% daily return, Minimum $100, 60 days duration
  - **Standard Alpha**: 2.5% daily return, Minimum $25K, 60 days duration
  - **Gold Premium**: 5% daily return

#### 3.2.11 Credit Cards (/credit-cards)
- **Card Customizer**: 
  - Name input field for card personalization
  - Material selector for card type
- **Cashback Calculator**: Interactive sliders for cashback estimation
  - Dining: 4% cashback
  - Travel: 3% cashback
  - Shopping: 1.5% cashback

#### 3.2.12 Contact (/contact)
- **Location Information**: London Office Skyboard Plaza
- **Contact Details**: 
  - Phone: +8801682648101
  - Email contact option
- **Contact Form**: Allow users to submit inquiries

#### 3.2.13 Login (/login)
- **Step 1**: Email or username input field
- **Step 2**: PIN entry with 4 separate input boxes for 4-digit login PIN
- Authenticate user and redirect to dashboard upon successful login

#### 3.2.14 Register (/register)
- **4-Step Registration Form**:
  - **Step 1 - Personal Information**:
    - First name
    - Last name
    - Gender
    - Date of birth
  - **Step 2 - Contact Information**:
    - Country
    - Email
    - Phone number
  - **Step 3 - Account & KYC**:
    - Currency selection
    - Account type selection
    - Branch selection
    - ID card type selection
    - KYC document upload (front and back)
  - **Step 4 - Security Setup**:
    - Username
    - Password
    - Login PIN (4-digit)
- Store user data in backend upon successful registration
- Store uploaded KYC documents

### 3.3 Authenticated Dashboard Pages Functionality

#### 3.3.1 Dashboard (/dashboard)
- **Account Overview**: Display user's account summary
- **Balance Display**: Show current account balance
- **Recent Transactions**: List recent transaction history
- **Quick Actions**: Provide shortcuts to common operations (transfer, view transactions)

#### 3.3.2 Transactions (/dashboard/transactions)
- Display complete transaction history
- Show transaction details: date, amount, type, description

#### 3.3.3 Transfer (/dashboard/transfer)
- **Fund Transfer Form**:
  - Recipient account selection or input
  - Transfer amount input
  - Transfer description/note
  - Confirmation step
- Process transfer and update account balances
- Record transaction in transaction history

#### 3.3.4 Profile (/dashboard/profile)
- Display user profile information
- Allow users to update personal information
- Allow users to change password

### 3.4 Navigation Components

#### 3.4.1 Header
- **Logo**: Positioned on the left
- **Navigation Menu** (center):
  - Home
  - Services (dropdown menu)
  - Investment
  - Credit Cards
  - Contact
- **Action Buttons** (right):
  - Login button
  - Open Account button
- **Sticky behavior**: Header remains visible on scroll
- **Mobile**: Hamburger menu for responsive navigation

#### 3.4.2 Footer
- About text
- Navigation links
- Newsletter subscription form
- Social media icons
- Copyright notice: 2026

## 4. Business Rules and Logic

### 4.1 Authentication Rules
- Users must register before accessing dashboard features
- Login requires both email/username and 4-digit PIN
- Backend authentication handled through Supabase Auth with custom login_pin field

### 4.2 Registration Rules
- All 4 steps must be completed for successful registration
- KYC documents (front and back) are mandatory
- Login PIN must be exactly 4 digits
- Username must be unique

### 4.3 Account Management Rules
- Each user can have multiple account types
- Account balances are updated in real-time after transactions
- Different account types have different interest rates (APY)

### 4.4 Transaction Rules
- Transfers can only be initiated by authenticated users
- Transfer amount cannot exceed available balance
- All transactions are recorded with timestamp and description

### 4.5 Investment Rules
- Each investment tier has specific minimum investment amounts
- Investment durations are fixed per tier
- Returns are calculated based on tier specifications

### 4.6 Data Security Rules
- Row Level Security (RLS) policies enforce data access control
- Users can only access their own account and transaction data
- KYC documents are stored securely in Supabase Storage

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| Login with incorrect credentials | Display error message, allow retry |
| Registration with existing username/email | Display error message, prompt to use different credentials |
| Transfer amount exceeds balance | Display insufficient funds error, prevent transaction |
| KYC document upload fails | Display error message, allow re-upload |
| Network error during transaction | Display error message, do not process transaction |
| Invalid PIN format (non-numeric or not 4 digits) | Display validation error, prevent submission |
| Session timeout | Redirect to login page, display session expired message |
| Missing required fields in registration | Display validation errors, highlight missing fields |

## 6. Acceptance Criteria

1. User visits home page and views hero carousel with 3 slides, feature cards, statistics, and testimonials
2. User navigates to Register page and completes all 4 steps: personal info, contact info, account/KYC setup, security setup
3. User logs in using email/username and 4-digit PIN
4. User accesses Dashboard and views account balance, recent transactions, and quick actions
5. User navigates to Transfer page, enters recipient and amount, confirms transfer
6. User views updated balance on Dashboard and sees new transaction in Transactions page

## 7. Out of Scope for This Release

- Mobile native applications (iOS/Android)
- Biometric authentication
- Multi-factor authentication beyond PIN
- Real-time chat support
- Loan application processing workflow
- Insurance claim submission and processing
- Credit card application approval workflow
- Investment portfolio performance analytics dashboard
- Automated bill payment scheduling
- International wire transfer capabilities
- Currency exchange services
- ATM locator functionality
- Document e-signature integration
- Video KYC verification
- Push notifications
- Dark mode toggle
- Multi-language support
- Accessibility features beyond basic standards
- Advanced fraud detection systems
- Integration with external financial institutions
- Tax document generation
- Financial planning tools and calculators
- Rewards and loyalty program management