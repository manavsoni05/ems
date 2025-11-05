// frontend/src/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/Admin/Dashboard';
import CreateEmployee from './pages/Admin/CreateEmployee';
import EditEmployee from './pages/Admin/EditEmployee';
import ManageLeaves from './pages/HR/ManageLeaves';
import ManageAssets from './pages/HR/ManageAssets';
import EmployeeProfile from './pages/Employee/MyProfile';
import RequestLeave from './pages/Employee/RequestLeave';
import MyLeaves from './pages/Employee/MyLeaves';
import Unauthorized from './pages/Unauthorized';
import MyAssets from './pages/Employee/MyAssets';
import MyAttendance from './pages/Employee/MyAttendance';
import DailyStatusReport from './pages/HR/DailyStatusReport';
import EmployeeAttendanceCalendar from './pages/HR/EmployeeAttendanceCalendar';
import ManagePayroll from './pages/HR/ManagePayroll';
import MyPayslips from './pages/Employee/MyPayslips';
import ManagePerformanceReviews from './pages/HR/ManagePerformanceReviews';
import MyPerformanceReviews from './pages/Employee/MyPerformanceReviews';
import ManageEmployeeSkills from './pages/HR/ManageEmployeeSkills';
import MySkills from './pages/Employee/MySkills';
import ManageRoles from './pages/Admin/ManageRoles'; 

// --- 1. IMPORT THE NEW LAYOUT AND DASHBOARD ---
import AppLayout from './layouts/AppLayout';
import UserDashboard from './pages/UserDashboard';
// --- We no longer need EmployeeDashboard or HRDashboard ---
// import EmployeeDashboard from './pages/Employee/EmployeeDashboard';
// import HRDashboard from './pages/HR/Dashboard';
// import HRLayout from './layouts/HRLayout';
// import EmployeeLayout from './layouts/EmployeeLayout';


export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'unauthorized', element: <Unauthorized /> },
      
      // --- 2. ADMIN ROUTE (Stays the same) ---
      {
        element: <ProtectedRoute allowedPermissions={["role:manage"]} />, // Admin-only area
        children: [
          {
            path: 'admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboard /> },
              { path: 'dashboard', element: <AdminDashboard /> },
              { path: 'employees/new', element: <CreateEmployee /> },
              { path: 'employees/edit/:employeeId', element: <EditEmployee /> },
              { path: 'manage-roles', element: <ManageRoles /> },
              
              // Admin can also access these pages (they will be redirected here)
              { path: 'manage-leaves', element: <ManageLeaves /> },
              { path: 'manage-assets', element: <ManageAssets /> },
              { path: 'attendance-report', element: <DailyStatusReport /> },
              { path: 'attendance-report/:employeeId', element: <EmployeeAttendanceCalendar /> },
              { path: 'manage-payroll', element: <ManagePayroll /> },
              { path: 'manage-performance-reviews', element: <ManagePerformanceReviews /> },
              { path: 'manage-employee-skills', element: <ManageEmployeeSkills /> },
            ],
          },
        ],
      },
      
      // --- 3. NEW UNIFIED APP ROUTE (for HR, Employee, xyz, etc.) ---
      {
        path: 'app',
        element: <AppLayout />, // Use the single new layout
        children: [
          // Dashboard
          { 
            element: <ProtectedRoute allowedPermissions={["employee:read_self"]} />, // All users have this
            children: [{ index: true, element: <UserDashboard /> }, { path: 'dashboard', element: <UserDashboard /> }]
          },
          // Employee Pages
          { 
            element: <ProtectedRoute allowedPermissions={["employee:read_self"]} />,
            children: [{ path: 'profile', element: <EmployeeProfile /> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["leave:create_self"]} />,
            children: [{ path: 'request-leave', element: <RequestLeave /> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["leave:read_self"]} />,
            children: [{ path: 'my-leaves', element: <MyLeaves /> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["asset:read_self"]} />,
            children: [{ path: 'my-assets', element: <MyAssets /> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["employee:read_self"]} />, // Assuming attendance is part of read_self
            children: [{ path: 'my-attendance', element: <MyAttendance /> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["payroll:read_self"]} />,
            children: [{ path: 'my-payslips', element: <MyPayslips /> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["performance:read_self"]} />,
            children: [{ path: 'my-performance-reviews', element: <MyPerformanceReviews /> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["skill:read_self"]} />,
            children: [{ path: 'my-skills', element: <MySkills /> }]
          },

          // Management Pages (HR / Manager / xyz)
          { 
            element: <ProtectedRoute allowedPermissions={["leave:approve", "leave:read_all"]} />,
            children: [{ path: 'manage-leaves', element: <ManageLeaves /> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["asset:allot", "asset:read_all"]} />,
            children: [{ path: 'manage-assets', element: <ManageAssets /> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["employee:read_all"]} />, // Use a relevant permission
            children: [
                { path: 'attendance-report', element: <DailyStatusReport /> },
                { path: 'attendance-report/:employeeId', element: <EmployeeAttendanceCalendar /> }
            ]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["payroll:read_all"]} />,
            children: [{ path: 'manage-payroll', element: <ManagePayroll /> }]
          },
           { 
            element: <ProtectedRoute allowedPermissions={["performance:read_all"]} />,
            children: [{ path: 'manage-performance-reviews', element: <ManagePerformanceReviews /> }]
          },
          { 
            element: <ProtectedRoute allowedPermissions={["skill:read_all"]} />,
            children: [{ path: 'manage-employee-skills', element: <ManageEmployeeSkills /> }]
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