import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { getImageUrl } from '@/utils/image-utils';
import { getDetailsUrl } from "@/utils/navigation";
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { HomeLayout } from '@/layouts/HomeLayout';
import { LanguageWrapper } from '@/components/LanguageWrapper';
import { RedirectToDefaultLang } from '@/components/RedirectToDefaultLang';
import { RootRedirect } from '@/components/RootRedirect';
import ScrollToTop from '@/components/ScrollToTop';
import { UserControlPanelLayout } from '@/layouts/UserControlPanelLayout';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const UsersPage = lazy(() => import('@/pages/users/UsersPage'));
const RolesPage = lazy(() => import('@/pages/roles/RolesPage'));
const PermissionsPage = lazy(() => import('@/pages/permissions/PermissionsPage'));
const ModelsPage = lazy(() => import('@/pages/models/ModelsPage'));
const ModelViewerPage = lazy(() => import('@/pages/models/ModelViewerPage'));
const ThreeDAILabPage = lazy(() => import('@/pages/ai/ThreeDAILabPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const CategoriesPage = lazy(() => import('@/pages/categories/CategoriesPage'));
const TypesPage = lazy(() => import('@/pages/types/TypesPage'));
const SeasonsPage = lazy(() => import('@/pages/seasons/SeasonsPage'));
const StudiosPage = lazy(() => import('@/pages/studios/StudiosPage'));
const LanguagesPage = lazy(() => import('@/pages/languages/LanguagesPage'));
const AnimesPage = lazy(() => import('@/pages/animes/AnimesPage'));
const MangasPage = lazy(() => import('@/pages/animes/MangasPage'));
const ChaptersPage = lazy(() => import('@/pages/animes/ChaptersPage'));
const ForeignAnimesPage = lazy(() => import('@/pages/animes/ForeignAnimesPage'));
const WatchPage = lazy(() => import('@/pages/animes/WatchPage'));
const EpisodesPage = lazy(() => import('@/pages/episodes/EpisodesPage'));
const ForeignEpisodesPage = lazy(() => import('@/pages/episodes/ForeignEpisodesPage'));
const HomePage = lazy(() => import('@/pages/home/HomePage'));
const AnimeBrowsePage = lazy(() => import('@/pages/animes/AnimeBrowsePage'));
const PublicMangasPage = lazy(() => import('@/pages/animes/PublicMangasPage'));
const AnimeDetailsPage = lazy(() => import('@/pages/animes/AnimeDetailsPage'));
const MangaDetailsPage = lazy(() => import('@/pages/animes/MangaDetailsPage'));
const ChapterPage = lazy(() => import('@/pages/animes/ChapterPage'));
const UserLibraryPage = lazy(() => import('@/pages/UserLibraryPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const HistoryBrowsePage = lazy(() => import('@/pages/HistoryBrowsePage'));
const WatchlistBrowsePage = lazy(() => import('@/pages/WatchlistBrowsePage'));
const NotificationsBrowsePage = lazy(() => import('@/pages/NotificationsBrowsePage'));
const UserInfoPage = lazy(() => import('@/pages/user-dashboard/UserInfoPage'));
const EditProfilePage = lazy(() => import('@/pages/user-dashboard/EditProfilePage'));
const UserSettingsPage = lazy(() => import('@/pages/user-dashboard/UserSettingsPage'));
const DashboardReportsPage = lazy(() => import('@/pages/dashboard/DashboardReportsPage'));
const DashboardAnalyticsPage = lazy(() => import('@/pages/dashboard/DashboardAnalyticsPage'));
const DashboardCommentsPage = lazy(() => import('@/pages/dashboard/DashboardCommentsPage'));
const QuickNewsPage = lazy(() => import('@/pages/dashboard/QuickNewsPage'));
const PublicCategoriesPage = lazy(() => import('@/pages/animes/PublicCategoriesPage'));
const BrowseAllAnimesPage = lazy(() => import('@/pages/animes/BrowseAllAnimesPage'));
const DmcaPage = lazy(() => import('@/pages/animes/DmcaPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const FriendsPage = lazy(() => import('@/pages/dashboard/FriendsPage'));
const CommunityPage = lazy(() => import('@/pages/social/CommunityPage'));
const PostDetailPage = lazy(() => import('@/pages/social/PostDetailPage'));
const ForeignMediaPage = lazy(() => import('@/pages/animes/ForeignMediaPage'));
const BackupPage = lazy(() => import('@/pages/dashboard/BackupPage'));
const BatchAnimeSelectionPage = lazy(() => import('@/pages/dashboard/BatchAnimeSelectionPage'));
const BatchUploadPage = lazy(() => import('@/pages/dashboard/BatchUploadPage'));
const EmbedAccountsPage = lazy(() => import('@/pages/dashboard/EmbedAccountsPage'));
const MirroredAccountsPage = lazy(() => import('@/pages/dashboard/MirroredAccountsPage'));
const ServerFileSelectionPage = lazy(() => import('@/pages/dashboard/ServerFileSelectionPage'));
const ServerFileBrowserPage = lazy(() => import('@/pages/dashboard/ServerFileBrowserPage'));
const FakeNumbersPage = lazy(() => import('@/pages/dashboard/FakeNumbersPage'));
const FetchLinksPage = lazy(() => import('@/pages/dashboard/FetchLinksPage'));
const EgyDeadScraperPage = lazy(() => import('@/pages/dashboard/EgyDeadScraperPage'));
const Anime4UpScraperPage = lazy(() => import('@/pages/dashboard/Anime4UpScraperPage'));
const RistoAnimeScraperPage = lazy(() => import('@/pages/dashboard/RistoAnimeScraperPage'));
const WitAnimeScraperPage = lazy(() => import('@/pages/dashboard/WitAnimeScraperPage'));
const Anime3rbScraperPage = lazy(() => import('@/pages/dashboard/Anime3rbScraperPage'));
const ImageScraperPage = lazy(() => import('@/pages/dashboard/ImageScraperPage'));
const AnimercoScraperPage = lazy(() => import('@/pages/dashboard/AnimercoScraperPage'));
const PCloudBrowserPage = lazy(() => import('@/pages/dashboard/PCloudBrowserPage'));
const Anime3rbDirectLinksPage = lazy(() => import('@/pages/dashboard/Anime3rbDirectLinksPage'));
const CrunchyrollImporterPage = lazy(() => import('@/pages/dashboard/CrunchyrollImporterPage'));
const VPSDownloaderPage = lazy(() => import('@/pages/dashboard/VPSDownloaderPage'));
const VPSManagerPage = lazy(() => import('@/pages/dashboard/VPSManagerPage'));
const AnimeCollectionsPage = lazy(() => import('@/pages/dashboard/AnimeCollectionsPage'));

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<div />}>
        {children}
    </Suspense>
);

const UserStatsPage = lazy(() => import('@/pages/user-dashboard/UserStatsPage'));
const UserInteractionsPage = lazy(() => import('@/pages/user-dashboard/UserInteractionsPage'));
const ChatPage = lazy(() => import('@/pages/social/ChatPage'));
const CountriesPage = lazy(() => import('@/pages/dashboard/CountriesPage'));
const ServersPage = lazy(() => import('@/pages/dashboard/ServersPage'));

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
            <SuspenseWrapper>
                <ScrollToTop />
                <LanguageWrapper />
            </SuspenseWrapper>
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
                    {
                        path: 'register',
                        element: <RegisterPage />,
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
                        path: 'mangas',
                        element: <PublicMangasPage />,
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
                        path: 'mangas/:id/:slug?',
                        element: <MangaDetailsPage />,
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
                        path: 'read/:id/:chapterNum/:slug?',
                        element: <ChapterPage />,
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
                        path: 'community/post/:postId',
                        element: <PostDetailPage />,
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
                        element: (
                            <AdminRoute>
                                <DashboardLayout />
                            </AdminRoute>
                        ),
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
                                path: 'countries',
                                element: <CountriesPage />,
                            },
                            {
                                path: 'servers',
                                element: <ServersPage />,
                            },
                            {
                                path: 'animes',
                                element: <AnimesPage />,
                            },
                            {
                                path: 'anime-collections',
                                element: <AnimeCollectionsPage />,
                            },
                            {
                                path: 'mangas',
                                element: <MangasPage />,
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
                                path: 'chapters',
                                element: <ChaptersPage />,
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
                                path: 'backups',
                                element: <BackupPage />,
                            },
                            {
                                path: 'ai-lab',
                                element: <ThreeDAILabPage />,
                            },
                            {
                                path: 'batch-upload',
                                element: <BatchAnimeSelectionPage />,
                            },
                            {
                                path: 'batch-upload/:id',
                                element: <BatchUploadPage />,
                            },
                            {
                                path: 'embed-accounts',
                                element: <EmbedAccountsPage />,
                            },
                            {
                                path: 'mirrored-accounts',
                                element: <MirroredAccountsPage />,
                            },
                            {
                                path: 'server-files',
                                element: <ServerFileSelectionPage />,
                            },
                            {
                                path: 'server-files/:id',
                                element: <ServerFileBrowserPage />,
                            },
                            {
                                path: 'fake-numbers',
                                element: <FakeNumbersPage />,
                            },
                            {
                                path: 'fetch-links',
                                element: <FetchLinksPage />,
                            },
                            {
                                path: 'egydead-scraper',
                                element: <EgyDeadScraperPage />,
                            },
                            {
                                path: 'anime4up-scraper',
                                element: <Anime4UpScraperPage />,
                            },
                            {
                                path: 'ristoanime-scraper',
                                element: <RistoAnimeScraperPage />,
                            },
                            {
                                path: 'image-scraper',
                                element: <ImageScraperPage />,
                            },
                            {
                                path: 'animerco-scraper',
                                element: <AnimercoScraperPage />,
                            },
                            {
                                path: 'egydead-images',
                                element: <EgyDeadScraperPage />,
                            },
                            {
                                path: 'anime3rb-images',
                                element: <Anime3rbScraperPage />,
                            },
                            {
                                path: 'anime3rb-direct-links',
                                element: <Anime3rbDirectLinksPage />,
                            },
                            {
                                path: 'my-pcloud',
                                element: <PCloudBrowserPage />,
                            },
                            {
                                path: 'crunchyroll-importer',
                                element: <CrunchyrollImporterPage />,
                            },
                            {
                                path: 'vps-manager',
                                element: <VPSManagerPage />,
                            },
                            {
                                path: 'vps-downloader',
                                element: <VPSDownloaderPage />,
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
