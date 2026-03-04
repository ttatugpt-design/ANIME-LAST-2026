import { createBrowserRouter } from 'react-router-dom';

import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import UsersPage from '@/pages/users/UsersPage';
import RolesPage from '@/pages/roles/RolesPage';
import PermissionsPage from '@/pages/permissions/PermissionsPage';
import ModelsPage from '@/pages/models/ModelsPage';
import ModelViewerPage from '@/pages/models/ModelViewerPage';
import ThreeDAILabPage from '@/pages/ai/ThreeDAILabPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import CategoriesPage from '@/pages/categories/CategoriesPage';
import TypesPage from '@/pages/types/TypesPage';
import SeasonsPage from '@/pages/seasons/SeasonsPage';
import StudiosPage from '@/pages/studios/StudiosPage';
import LanguagesPage from '@/pages/languages/LanguagesPage';
import AnimesPage from '@/pages/animes/AnimesPage';
import ForeignAnimesPage from '@/pages/animes/ForeignAnimesPage';
import WatchPage from '@/pages/animes/WatchPage';
import EpisodesPage from '@/pages/episodes/EpisodesPage';
import ForeignEpisodesPage from '@/pages/episodes/ForeignEpisodesPage';
import { HomeLayout } from '@/layouts/HomeLayout';
import HomePage from '@/pages/home/HomePage';
import AnimeBrowsePage from '@/pages/animes/AnimeBrowsePage';
import AnimeDetailsPage from '@/pages/animes/AnimeDetailsPage';
import UserLibraryPage from '@/pages/UserLibraryPage';
import NotificationsPage from '@/pages/NotificationsPage';
import SearchPage from '@/pages/SearchPage';
import HistoryBrowsePage from '@/pages/HistoryBrowsePage';
import WatchlistBrowsePage from '@/pages/WatchlistBrowsePage';
import NotificationsBrowsePage from '@/pages/NotificationsBrowsePage';
import { LanguageWrapper } from '@/components/LanguageWrapper';
import { RedirectToDefaultLang } from '@/components/RedirectToDefaultLang';
import { RootRedirect } from '@/components/RootRedirect';
import ScrollToTop from '@/components/ScrollToTop';
import { UserControlPanelLayout } from '@/layouts/UserControlPanelLayout';
import UserInfoPage from '@/pages/user-dashboard/UserInfoPage';
import EditProfilePage from '@/pages/user-dashboard/EditProfilePage';
import UserSettingsPage from '@/pages/user-dashboard/UserSettingsPage';
import DashboardReportsPage from '@/pages/dashboard/DashboardReportsPage';
import DashboardAnalyticsPage from '@/pages/dashboard/DashboardAnalyticsPage';
import DashboardCommentsPage from '@/pages/dashboard/DashboardCommentsPage';
import QuickNewsPage from '@/pages/dashboard/QuickNewsPage';
import PublicCategoriesPage from '@/pages/animes/PublicCategoriesPage';
import BrowseAllAnimesPage from '@/pages/animes/BrowseAllAnimesPage';
import DmcaPage from '@/pages/animes/DmcaPage';
import ProfilePage from '@/pages/ProfilePage';
import FriendsPage from '@/pages/dashboard/FriendsPage';
import CommunityPage from '@/pages/social/CommunityPage';
import ForeignMediaPage from '@/pages/animes/ForeignMediaPage';
import { lazy } from 'react';

const UserStatsPage = lazy(() => import('@/pages/user-dashboard/UserStatsPage'));
const UserInteractionsPage = lazy(() => import('@/pages/user-dashboard/UserInteractionsPage'));
const ChatPage = lazy(() => import('@/pages/social/ChatPage'));

export const routes = [
    {
        path: '/',
        element: (
            <>
                <ScrollToTop />
                <RootRedirect />
            </>
        ),
    },
    // Explicitly catch un-prefixed routes to redirect them to /en/...
    {
        path: '/dashboard/*',
        element: <RedirectToDefaultLang />,
    },
    {
        path: '/auth/*',
        element: <RedirectToDefaultLang />,
    },
    {
        path: '/watch/*',
        element: <RedirectToDefaultLang />,
    },
    {
        path: '/:lang',
        element: (
            <>
                <ScrollToTop />
                <LanguageWrapper />
            </>
        ),
        children: [
            {
                path: 'auth',
                element: <AuthLayout />,
                children: [
                    {
                        path: 'login',
                        element: <LoginPage />,
                    },
                ],
            },
            // Public Home Routes
            {
                element: <HomeLayout />,
                children: [
                    {
                        index: true,
                        element: <HomePage />,
                    },
                    {
                        path: 'animes',
                        element: <AnimeBrowsePage />,
                    },
                    {
                        path: 'browse',
                        element: <BrowseAllAnimesPage />,
                    },
                    {
                        path: 'dmca',
                        element: <DmcaPage />,
                    },
                    {
                        path: 'categories',
                        element: <PublicCategoriesPage />,
                    },
                    {
                        path: 'animes/:id/:slug?',
                        element: <AnimeDetailsPage />,
                    },
                    {
                        path: 'models/:id',
                        element: <ModelViewerPage />,
                    },
                    {
                        path: 'watch/:id/:episodeNum/:slug?',
                        element: <WatchPage />,
                    },
                    {
                        path: 'search',
                        element: <SearchPage />,
                    },
                    {
                        path: 'history',
                        element: <HistoryBrowsePage />,
                    },
                    {
                        path: 'watchlist',
                        element: <WatchlistBrowsePage />,
                    },
                    {
                        path: 'notifications',
                        element: <NotificationsBrowsePage />,
                    },
                    {
                        path: 'u/:userId/profile',
                        element: <ProfilePage />,
                    },
                    {
                        path: 'community',
                        element: <CommunityPage />,
                    },
                    {
                        path: 'movies-series',
                        element: <ForeignMediaPage />,
                    },
                ],
            },
            // Protected Dashboard Routes
            {
                element: <ProtectedRoute />,
                children: [
                    // User Dashboard Route (Control Panel) - Primary with ID
                    {
                        path: 'u/:id/dashboard',
                        element: <UserControlPanelLayout />,
                        children: [
                            {
                                index: true,
                                element: <UserInfoPage />,
                            },
                            {
                                path: 'edit',
                                element: <EditProfilePage />,
                            },
                            {
                                path: 'settings',
                                element: <UserSettingsPage />,
                            },
                            {
                                path: 'library',
                                element: <WatchlistBrowsePage />,
                            },
                            {
                                path: 'history',
                                element: <HistoryBrowsePage />,
                            },
                            {
                                path: 'notifications',
                                element: <NotificationsBrowsePage />,
                            },
                            {
                                path: 'stats',
                                element: <UserStatsPage />,
                            },
                            {
                                path: 'interactions',
                                element: <UserInteractionsPage />,
                            },
                            {
                                path: 'friends',
                                element: <FriendsPage />,
                            },
                            {
                                path: 'messages',
                                element: <ChatPage />,
                            },
                        ]
                    },

                    // Admin Dashboard Route
                    {
                        path: 'dashboard',
                        element: <DashboardLayout />,
                        children: [
                            {
                                index: true,
                                element: <DashboardPage />,
                            },
                            {
                                path: 'users',
                                element: <UsersPage />,
                            },
                            {
                                path: 'roles',
                                element: <RolesPage />,
                            },
                            {
                                path: 'permissions',
                                element: <PermissionsPage />,
                            },
                            {
                                path: 'models',
                                element: <ModelsPage />,
                            },
                            {
                                path: 'categories',
                                element: <CategoriesPage />,
                            },
                            {
                                path: 'types',
                                element: <TypesPage />,
                            },
                            {
                                path: 'seasons',
                                element: <SeasonsPage />,
                            },
                            {
                                path: 'studios',
                                element: <StudiosPage />,
                            },
                            {
                                path: 'languages',
                                element: <LanguagesPage />,
                            },
                            {
                                path: 'animes',
                                element: <AnimesPage />,
                            },
                            {
                                path: 'foreign-animes',
                                element: <ForeignAnimesPage />,
                            },
                            {
                                path: 'episodes',
                                element: <EpisodesPage />,
                            },
                            {
                                path: 'foreign-episodes',
                                element: <ForeignEpisodesPage />,
                            },
                            {
                                path: 'reports',
                                element: <DashboardReportsPage />,
                            },
                            {
                                path: 'analytics',
                                element: <DashboardAnalyticsPage />,
                            },
                            {
                                path: 'comments',
                                element: <DashboardCommentsPage />,
                            },
                            {
                                path: 'quick-news',
                                element: <QuickNewsPage />,
                            },
                            {
                                path: 'settings',
                                element: <SettingsPage />,
                            },
                            {
                                path: 'ai-lab',
                                element: <ThreeDAILabPage />,
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        path: '*',
        element: <div>404 Not Found</div>,
    },
];
