// frontend/src/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import App from './App';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load layouts
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AppLayout = lazy(() => import('./layouts/AppLayout'));

// Lazy load admin pages
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'));
const CreateEmployee = lazy(() => import('./pages/Admin/CreateEmployee'));
const EditEmployee = lazy(() => import('./pages/Admin/EditEmployee'));
const ManageRoles = lazy(() => import('./pages/Admin/ManageRoles'));

// Lazy load HR pages
const ManageLeaves = lazy(() => import('./pages/HR/ManageLeaves'));
const ManageAssets = lazy(() => import('./pages/HR/ManageAssets'));
const DailyStatusReport = lazy(() => import('./pages/HR/DailyStatusReport'));
const EmployeeAttendanceCalendar = lazy(() => import('./pages/HR/EmployeeAttendanceCalendar'));
const ManagePayroll = lazy(() => import('./pages/HR/ManagePayroll'));
const ManagePerformanceReviews = lazy(() => import('./pages/HR/ManagePerformanceReviews'));
const ManageEmployeeSkills = lazy(() => import('./pages/HR/ManageEmployeeSkills'));

// Lazy load employee pages
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const EmployeeProfile = lazy(() => import('./pages/Employee/MyProfile'));
const RequestLeave = lazy(() => import('./pages/Employee/RequestLeave'));
const MyLeaves = lazy(() => import('./pages/Employee/MyLeaves'));
const MyAssets = lazy(() => import('./pages/Employee/MyAssets'));
const MyAttendance = lazy(() => import('./pages/Employee/MyAttendance'));
const MyPayslips = lazy(() => import('./pages/Employee/MyPayslips'));
const MyPerformanceReviews = lazy(() => import('./pages/Employee/MyPerformanceReviews'));
const MySkills = lazy(() => import('./pages/Employee/MySkills'));

// Loading component
const PageLoader = () => (
  <Box sx={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #E3F2FD 0%, #FFFFFF 30%)',
  }}>
    <CircularProgress sx={{ color: '#5A3FFF' }} />
  </Box>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'unauthorized', element: <Unauthorized /> },
      
      // --- ADMIN ROUTE ---
      {
        element: <ProtectedRoute allowedPermissions={["role:manage"]} />,
        children: [
          {
            path: 'admin',
            element: <Suspense fallback={<PageLoader />}><AdminLayout /></Suspense>,
            children: [
              { index: true, element: <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense> },
              { path: 'dashboard', element: <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense> },
              { path: 'employees/new', element: <Suspense fallback={<PageLoader />}><CreateEmployee /></Suspense> },
              { path: 'employees/edit/:employeeId', element: <Suspense fallback={<PageLoader />}><EditEmployee /></Suspense> },
              { path: 'manage-roles', element: <Suspense fallback={<PageLoader />}><ManageRoles /></Suspense> },
              { path: 'manage-leaves', element: <Suspense fallback={<PageLoader />}><ManageLeaves /></Suspense> },
              { path: 'manage-assets', element: <Suspense fallback={<PageLoader />}><ManageAssets /></Suspense> },
              { path: 'attendance-report', element: <Suspense fallback={<PageLoader />}><DailyStatusReport /></Suspense> },
              { path: 'attendance-report/:employeeId', element: <Suspense fallback={<PageLoader />}><EmployeeAttendanceCalendar /></Suspense> },
              { path: 'manage-payroll', element: <Suspense fallback={<PageLoader />}><ManagePayroll /></Suspense> },
              { path: 'manage-performance-reviews', element: <Suspense fallback={<PageLoader />}><ManagePerformanceReviews /></Suspense> },
              { path: 'manage-employee-skills', element: <Suspense fallback={<PageLoader />}><ManageEmployeeSkills /></Suspense> },
              { path: 'profile', element: <Suspense fallback={<PageLoader />}><EmployeeProfile /></Suspense> },
            ],
          },
        ],
      },
      
      // --- UNIFIED APP ROUTE ---
      {
        path: 'app',
        element: <Suspense fallback={<PageLoader />}><AppLayout /></Suspense>,
        children: [
          { 
            element: <ProtectedRoute allowedPermissions={["employee:read_self"]} />,
            children: [
              { index: true, element: <Suspense fallback={<PageLoader />}><UserDashboard /></Suspense> }, 
              { path: 'dashboard', element: <Suspense fallback={<PageLoader />}><UserDashboard /></Suspense> }
            ]
          },
          // Employee Pages
          { 
            element: <ProtectedRoute allowedPermissions={["employee:read_self"]} />,
            children: [{ path: 'profile', element: <Suspense fallback={<PageLoader />}><EmployeeProfile /></Suspense> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["leave:create_self"]} />,
            children: [{ path: 'request-leave', element: <Suspense fallback={<PageLoader />}><RequestLeave /></Suspense> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["leave:read_self"]} />,
            children: [{ path: 'my-leaves', element: <Suspense fallback={<PageLoader />}><MyLeaves /></Suspense> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["asset:read_self"]} />,
            children: [{ path: 'my-assets', element: <Suspense fallback={<PageLoader />}><MyAssets /></Suspense> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["employee:read_self"]} />,
            children: [{ path: 'my-attendance', element: <Suspense fallback={<PageLoader />}><MyAttendance /></Suspense> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["payroll:read_self"]} />,
            children: [{ path: 'my-payslips', element: <Suspense fallback={<PageLoader />}><MyPayslips /></Suspense> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["performance:read_self"]} />,
            children: [{ path: 'my-performance-reviews', element: <Suspense fallback={<PageLoader />}><MyPerformanceReviews /></Suspense> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["skill:read_self"]} />,
            children: [{ path: 'my-skills', element: <Suspense fallback={<PageLoader />}><MySkills /></Suspense> }]
          },

          // Management Pages (HR / Manager)
          { 
            element: <ProtectedRoute allowedPermissions={["leave:approve", "leave:read_all"]} />,
            children: [{ path: 'manage-leaves', element: <Suspense fallback={<PageLoader />}><ManageLeaves /></Suspense> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["asset:allot", "asset:read_all"]} />,
            children: [{ path: 'manage-assets', element: <Suspense fallback={<PageLoader />}><ManageAssets /></Suspense> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["employee:read_all"]} />,
            children: [
                { path: 'attendance-report', element: <Suspense fallback={<PageLoader />}><DailyStatusReport /></Suspense> },
                { path: 'attendance-report/:employeeId', element: <Suspense fallback={<PageLoader />}><EmployeeAttendanceCalendar /></Suspense> }
            ]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["payroll:read_all"]} />,
            children: [{ path: 'manage-payroll', element: <Suspense fallback={<PageLoader />}><ManagePayroll /></Suspense> }]
          },
           { 
            element: <ProtectedRoute allowedPermissions={["performance:read_all"]} />,
            children: [{ path: 'manage-performance-reviews', element: <Suspense fallback={<PageLoader />}><ManagePerformanceReviews /></Suspense> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["skill:read_all"]} />,
            children: [{ path: 'manage-employee-skills', element: <Suspense fallback={<PageLoader />}><ManageEmployeeSkills /></Suspense> }]
          },
        ]
      },

      // --- 4. ROOT REDIRECT ---
      {
        path: '/',
        element: <ProtectedRoute allowedPermissions={["employee:read_self"]} />, // Just needs a basic permission to redirect
        children: [{ index: true, element: <div>Redirecting...</div> }], // This will be handled by ProtectedRoute's logic
      },
    ],
  },
]);