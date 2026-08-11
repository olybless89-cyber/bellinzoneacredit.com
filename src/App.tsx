import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { RouteGuard } from '@/components/common/RouteGuard';

// Layouts
import PublicLayout from '@/components/layouts/PublicLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Public pages
import HomePage from '@/pages/Home';
import LoginPage from '@/pages/Login';
import RegisterPage from '@/pages/Register';
import InvestmentPage from '@/pages/Investment';
import ContactPage from '@/pages/Contact';

// Service pages
import DigitalBankingPage from '@/pages/services/DigitalBanking';
import MobileWebBankingPage from '@/pages/services/MobileWebBanking';
import InsurancePoliciesPage from '@/pages/services/InsurancePolicies';
import HomePropertyLoanPage from '@/pages/services/HomePropertyLoan';
import AllBankAccountsPage from '@/pages/services/AllBankAccounts';
import BorrowingAccountPage from '@/pages/services/BorrowingAccount';
import PrivateBankingPage from '@/pages/services/PrivateBanking';
import FixedTermAccountPage from '@/pages/services/FixedTermAccount';
import CreditCardsPage from '@/pages/services/CreditCards';

// Dashboard pages
import DashboardOverview from '@/pages/dashboard/Overview';
import TransactionsPage from '@/pages/dashboard/Transactions';
import TransferPage from '@/pages/dashboard/Transfer';
import MoneyPage from '@/pages/dashboard/Money';
import DebitCardPage from '@/pages/dashboard/DebitCard';
import InvestmentsPage from '@/pages/dashboard/Investments';
import ProfilePage from '@/pages/dashboard/Profile';

// Admin pages
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminOverview from '@/pages/admin/AdminOverview';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminKYC from '@/pages/admin/AdminKYC';
import AdminTransactions from '@/pages/admin/AdminTransactions';
import AdminCardRequests from '@/pages/admin/AdminCardRequests';

// 404
import NotFound from '@/pages/NotFound';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <RouteGuard>
          <IntersectObserver />
          <Routes>
            {/* Public layout routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/investment" element={<InvestmentPage />} />
              <Route path="/credit-cards" element={<CreditCardsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/digital-banking" element={<DigitalBankingPage />} />
              <Route path="/mobile-web-banking" element={<MobileWebBankingPage />} />
              <Route path="/insurance-policies" element={<InsurancePoliciesPage />} />
              <Route path="/home-property-loan" element={<HomePropertyLoanPage />} />
              <Route path="/all-bank-accounts" element={<AllBankAccountsPage />} />
              <Route path="/borrowing-account" element={<BorrowingAccountPage />} />
              <Route path="/private-banking" element={<PrivateBankingPage />} />
              <Route path="/fixed-term-account" element={<FixedTermAccountPage />} />
            </Route>

            {/* Auth pages (no layout) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Dashboard (protected) */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="transfer" element={<TransferPage />} />
              <Route path="money" element={<MoneyPage />} />
              <Route path="debit-card" element={<DebitCardPage />} />
              <Route path="investments" element={<InvestmentsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Admin portal (role=admin check inside AdminLayout) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="kyc" element={<AdminKYC />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="card-requests" element={<AdminCardRequests />} />
            </Route>

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster richColors position="top-right" />
        </RouteGuard>
      </AuthProvider>
    </Router>
  );
};

export default App;
