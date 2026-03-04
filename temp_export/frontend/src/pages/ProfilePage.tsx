import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import {
    Camera,
    MessageCircle,
    UserPlus,
    Pen,
    MoreHorizontal,
    MapPin,
    Calendar,
    Briefcase,
    Ghost
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import Footer from '@/components/common/Footer';

import { getImageUrl } from '@/utils/image-utils';

export default function ProfilePage() {
    const { userId } = useParams();
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const { user: currentUser } = useAuthStore();

    // State
    const [profileUser, setProfileUser] = useState<any>(null);
    const [friendStatus, setFriendStatus] = useState<string>('none'); // none, friends, pending_sent, pending_received, blocked
    const [friends, setFriends] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('posts'); // posts, about, friends, photos...
    const [isUpdating, setIsUpdating] = useState(false);

    // Refs for file inputs
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const isOwnProfile = currentUser?.id === Number(userId);

    // Fetch User Data & Status
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Assuming we have an endpoint for public user profile
                // If not, we might need to use existing /users/{id} or similar
                // For now, let's assume we can fetch basic user info
                // If the backend endpoint doesn't exist yet, we might fallback to mocking or minimal data
                const response = await api.get(`/users/${userId}`);
                setProfileUser(response.data);

                // Fetch friendship status if logged in and not own profile
                if (currentUser && currentUser.id !== Number(userId)) {
                    try {
                        const statusRes = await api.get(`/friends/status/${userId}`);
                        setFriendStatus(statusRes.data.status);
                    } catch (e) {
                        console.error("Failed to fetch status", e);
                    }
                }

                // Fetch friends list for this profile
                try {
                    const friendsRes = await api.get(`/friends/list/${userId}`);
                    setFriends(friendsRes.data.friends || []);
                } catch (e) {
                    console.error("Failed to fetch friends", e);
                }

            } catch (error) {
                console.error('Failed to fetch profile', error);
                // Fallback for demo if endpoint fails
                // setProfileUser({ id: userId, name: 'User Name', avatar: '', cover_image: '' });
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            fetchProfile();
        }
    }, [userId, currentUser]);

    // WebSocket Listener for real-time friend status updates
    useEffect(() => {
        const handleRealtimeStatus = (event: any) => {
            const notif = event.detail;
            if (!notif || !userId) return;

            const targetUserId = Number(userId);

            if (notif.type === 'friend_request_accepted') {
                if (notif.data.accepter_id === targetUserId) {
                    setFriendStatus('friends');
                }
            } else if (notif.type === 'friend_request_rejected') {
                if (notif.data.rejecter_id === targetUserId) {
                    setFriendStatus('none');
                }
            } else if (notif.type === 'friend_request') {
                if (notif.data.requester_id === targetUserId) {
                    setFriendStatus('pending_received');
                }
            }
        };

        const handleSilentBlock = (event: any) => {
            const data = event.detail;
            if (!data || !userId) return;
            if (data.blocker_id === Number(userId)) {
                setFriendStatus('blocked_me');
            }
        };

        window.addEventListener('app:notification', handleRealtimeStatus);
        window.addEventListener('app:user_blocked', handleSilentBlock);
        return () => {
            window.removeEventListener('app:notification', handleRealtimeStatus);
            window.removeEventListener('app:user_blocked', handleSilentBlock);
        };
    }, [userId]);

    const handleAction = async (action: string) => {
        if (!currentUser) return;
        setIsUpdating(true);
        try {
            if (action === 'add') {
                await api.post(`/friends/request/${userId}`);
                setFriendStatus('pending_sent');
            } else if (action === 'accept') {
                await api.post(`/friends/accept/${userId}`);
                setFriendStatus('friends');
            } else if (action === 'remove' || action === 'cancel') {
                await api.delete(`/friends/${userId}`);
                setFriendStatus('none');
            } else if (action === 'block') {
                await api.post(`/users/block/${userId}`);
                setFriendStatus('blocked_by_me');
                // alert("User blocked");
            } else if (action === 'unblock') {
                await api.delete(`/users/block/${userId}`);
                setFriendStatus('none'); // Reset to none after unblock
            }
        } catch (error: any) {
            console.error(`Failed to ${action}`, error);
            const serverMessage = error.response?.data?.error || error.response?.data?.message || "Unknown error";
            alert(`Failed to ${action}: ${serverMessage}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover_image') => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUpdating(true);
        const formData = new FormData();
        formData.append(type, file);
        // We must append 'name' as it's required by the backend handler currently, even if we don't change it.
        // Ideally backend should allow partial updates, but for now we send current name.
        if (currentUser?.name) {
            formData.append('name', currentUser.name);
        }

        try {
            const response = await api.post('/user/profile/update', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // Update local state to reflect change immediately
            if (response.data.user) {
                setProfileUser(response.data.user);
                // Also update global auth store if it's the current user
                if (isOwnProfile) {
                    useAuthStore.getState().setUser(response.data.user);
                }
            }
        } catch (error) {
            console.error(`Failed to update ${type}`, error);
            alert(`Failed to update ${type}`);
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] dark:bg-[#18191a]">
                <div className="relative w-10 h-10">
                    <div className="absolute inset-0 border-4 border-gray-100 dark:border-[#333] rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] dark:bg-[#18191a]">
                <p className="text-xl text-gray-500">للمستخدم غير موجود</p>
            </div>
        );
    }

    if (friendStatus === 'blocked_me' && !isOwnProfile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#18191a] gap-4">
                <p className="text-xl text-gray-700 dark:text-gray-300 font-bold">عذراً، لا يمكنك دخول هذه الصفحة</p>
                <Link to={`/${i18n.language}`} className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-md font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                    العودة للرئيسية
                </Link>
            </div>
        );
    }

    if (friendStatus === 'blocked_by_me' && !isOwnProfile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#18191a] gap-4 text-center px-4">
                <p className="text-xl text-gray-500 font-semibold mb-2">لقد قمت بحظر هذا المستخدم</p>
                <div className="flex gap-4">
                    <button onClick={() => handleAction('unblock')} className="bg-[#1877f2] text-white px-6 py-2 rounded-md font-semibold hover:bg-[#166fe5] transition-colors flex items-center gap-2">
                        <span>إلغاء الحظر</span>
                    </button>
                    <Link to={`/${i18n.language}`} className="bg-gray-200 dark:bg-[#3a3b3c] text-black dark:text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-300 dark:hover:bg-[#4e4f50] transition-colors">
                        العودة للرئيسية
                    </Link>
                </div>
            </div>
        );
    }

    // Determine Action Button
    let actionButton = null;
    if (!isOwnProfile) {
        if (friendStatus === 'friends') {
            actionButton = (
                <button onClick={() => handleAction('remove')} className="bg-gray-200 dark:bg-[#3a3b3c] hover:bg-gray-300 dark:hover:bg-[#4e4f50] text-black dark:text-white px-4 py-2 rounded-md font-semibold flex items-center justify-center gap-2 flex-1 md:flex-initial w-full md:w-auto transition-colors">
                    <UserPlus className="w-5 h-5 rotate-45" /> {/* Use Check or similar if available */}
                    <span>أصدقاء</span>
                </button>
            );
        } else if (friendStatus === 'pending_sent') {
            actionButton = (
                <button onClick={() => handleAction('cancel')} className="bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-4 py-2 rounded-md font-semibold flex items-center justify-center gap-2 flex-1 md:flex-initial w-full md:w-auto transition-colors">
                    <span>إلغاء الطلب</span>
                </button>
            );
        } else if (friendStatus === 'pending_received') {
            actionButton = (
                <button onClick={() => handleAction('accept')} className="bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-4 py-2 rounded-md font-semibold flex items-center justify-center gap-2 flex-1 md:flex-initial w-full md:w-auto transition-colors">
                    <UserPlus className="w-5 h-5" />
                    <span>قبول الطلب</span>
                </button>
            );
        } else {
            actionButton = (
                <button onClick={() => handleAction('add')} className="bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-4 py-2 rounded-md font-semibold flex items-center justify-center gap-2 flex-1 md:flex-initial w-full md:w-auto transition-colors">
                    <UserPlus className="w-5 h-5" />
                    <span>إضافة صديق</span>
                </button>
            );
        }
    }

    return (
        <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#18191a] text-gray-900 dark:text-white font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>{profileUser.name} | AnimeLast</title>
            </Helmet>

            {/* Hidden File Inputs */}
            <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'avatar')}
            />
            <input
                type="file"
                ref={coverInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'cover_image')}
            />

            {/* Top Section: Cover & Profile Info (White/Dark Background) */}
            <div className="bg-white dark:bg-[#242526] shadow-sm pb-4">
                <div className="max-w-[1095px] mx-auto">

                    {/* Cover Image Area */}
                    <div className="relative w-full aspect-[2.7/1] md:aspect-[2.7/1] lg:h-[400px] bg-gray-200 dark:bg-[#3a3b3c] overflow-hidden rounded-b-none group">
                        {profileUser.cover_image ? (
                            <img
                                src={getImageUrl(profileUser.cover_image)}
                                alt="Cover"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-b from-gray-300 to-gray-400 dark:from-[#3a3b3c] dark:to-[#18191a]"></div>
                        )}

                        {/* Edit Cover Button (Owner Only) */}
                        {isOwnProfile && (
                            <button
                                onClick={() => coverInputRef.current?.click()}
                                disabled={isUpdating}
                                className="absolute bottom-4 left-4 md:bottom-5 md:left-8 bg-white dark:bg-[#3a3b3c] hover:bg-gray-100 dark:hover:bg-[#4e4f50] text-black dark:text-white px-3 py-1.5 md:px-4 md:py-2 rounded-md font-semibold text-sm md:text-base shadow-sm flex items-center gap-2 transition-colors z-20"
                            >
                                <Camera className="w-5 h-5 fill-current" />
                                <span className="hidden md:inline">{isUpdating ? 'جاري التحديث...' : 'تعديل صورة الغلاف'}</span>
                            </button>
                        )}
                    </div>

                    {/* Profile Info Area */}
                    <div className="px-4 md:px-8 pb-4 relative">
                        <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-10 gap-4">

                            {/* Profile Picture */}
                            <div className="relative group">
                                <div className="w-[168px] h-[168px] rounded-full p-1 bg-white dark:bg-[#242526] relative z-10">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-[#3a3b3c] relative">
                                        {profileUser.avatar ? (
                                            <img
                                                src={getImageUrl(profileUser.avatar)}
                                                alt={profileUser.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-[#333] text-black dark:text-white font-bold text-4xl">
                                                {profileUser.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        {/* Overlay for hover effect */}
                                        {isOwnProfile && (
                                            <div onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity z-20">
                                                <Camera className="w-8 h-8 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Camera Icon for Profile Pic (Owner Only) */}
                                {isOwnProfile && (
                                    <button
                                        onClick={() => avatarInputRef.current?.click()}
                                        className="absolute bottom-4 right-2 bg-gray-100 dark:bg-[#3a3b3c] hover:bg-gray-200 dark:hover:bg-[#4e4f50] w-9 h-9 rounded-full flex items-center justify-center z-30 border border-transparent shadow-sm transition-colors"
                                    >
                                        <Camera className="w-5 h-5 text-black dark:text-white" />
                                    </button>
                                )}
                            </div>

                            {/* Name & Details */}
                            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-right mb-4 md:mb-8">
                                <h1 className="text-3xl font-bold mb-1">{profileUser.name}</h1>
                                <p className="text-gray-500 dark:text-gray-400 font-semibold mb-1">
                                    {friends.length > 0 ? `${friends.length} صديق` : '0 أصدقاء'}
                                </p>

                                {/* Friends Avatars overlap (Mock) */}
                                <div className="flex items-center justify-center md:justify-start -space-x-2 rtl:space-x-reverse">
                                    {friends.slice(0, 8).map(friend => (
                                        <Link key={friend.id} to={`/u/${friend.id}/profile`} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#242526] bg-gray-300 overflow-hidden" title={friend.name}>
                                            <img src={getImageUrl(friend.avatar)} alt={friend.name} className="w-full h-full object-cover" />
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col md:flex-row items-center gap-3 mb-8 w-full md:w-auto px-4 md:px-0">
                                {isOwnProfile ? (
                                    <>
                                        <button className="bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-4 py-2 rounded-md font-semibold flex items-center justify-center gap-2 flex-1 md:flex-initial w-full md:w-auto transition-colors">
                                            <Pen className="w-5 h-5" />
                                            <span>تعديل الملف الشخصي</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {actionButton}
                                        <button className="bg-gray-200 dark:bg-[#3a3b3c] hover:bg-gray-300 dark:hover:bg-[#4e4f50] text-black dark:text-white px-4 py-2 rounded-md font-semibold flex items-center justify-center gap-2 flex-1 md:flex-initial w-full md:w-auto transition-colors">
                                            <MessageCircle className="w-5 h-5" />
                                            <span>مراسلة</span>
                                        </button>
                                    </>
                                )}
                                {!isOwnProfile && (
                                    <button
                                        onClick={() => handleAction('block')}
                                        className="bg-gray-200 dark:bg-[#3a3b3c] hover:bg-red-500 hover:text-white dark:hover:bg-red-500 text-black dark:text-white px-4 py-2 rounded-md font-semibold flex items-center justify-center transition-colors gap-2"
                                        title="حظر المستخدم"
                                    >
                                        <MoreHorizontal className="w-5 h-5 md:hidden" />
                                        <span>حظر المستخدم</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Divider Line */}
                        <div className="h-[1px] bg-gray-300 dark:bg-[#3e4042] w-full my-1"></div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
                            {['posts', 'about', 'friends', 'photos', 'videos'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-md transition-colors whitespace-nowrap",
                                        activeTab === tab && "text-black dark:text-white border-b-[3px] border-black dark:border-white rounded-b-none"
                                    )}
                                >
                                    {t(`profile.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
                                    {/* Fallback translation key needs to be handled if not exists */}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Areas (Grid) */}
            <div className="max-w-[1095px] mx-auto px-0 md:px-0 py-4 grid grid-cols-1 md:grid-cols-12 gap-4">

                {/* Left Sidebar (Intro, Photos, Friends) - Right in RTL */}
                <div className="md:col-span-5 flex flex-col gap-4 order-2 md:order-1 px-4 md:px-0">

                    {/* Intro Card */}
                    <div className="bg-white dark:bg-[#242526] rounded-md shadow-sm p-4">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">نبذة مختصرة</h2>
                        <div className="space-y-4">
                            {/* Bio */}
                            <div className="text-center">
                                <p className="text-gray-900 dark:text-white mb-3">
                                    "عاشق للأنمي ومطور برمجيات."
                                </p>
                                {isOwnProfile && (
                                    <button className="w-full bg-gray-100 dark:bg-[#3a3b3c] hover:bg-gray-200 dark:hover:bg-[#4e4f50] py-1.5 rounded-md font-semibold text-sm transition-colors">
                                        تعديل السيرة الذاتية
                                    </button>
                                )}
                            </div>

                            {/* Details List */}
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                    <Briefcase className="w-5 h-5 text-gray-400" />
                                    <span>يعمل لدى <strong className="text-black dark:text-white">AnimeLast</strong></span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                    <MapPin className="w-5 h-5 text-gray-400" />
                                    <span>يعيش في <strong className="text-black dark:text-white">القاهرة، مصر</strong></span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <span>انضم في {new Date().getFullYear()}</span>
                                </div>
                            </div>

                            {isOwnProfile && (
                                <button className="w-full bg-gray-100 dark:bg-[#3a3b3c] hover:bg-gray-200 dark:hover:bg-[#4e4f50] py-1.5 rounded-md font-semibold text-sm transition-colors">
                                    تعديل التفاصيل
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Photos Card */}
                    <div className="bg-white dark:bg-[#242526] rounded-md shadow-sm p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold dark:text-white">الصور</h2>
                            <button className="text-black dark:text-white font-bold text-sm hover:underline">عرض الكل</button>
                        </div>
                        <div className="grid grid-cols-3 gap-1 rounded-md overflow-hidden">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                                <div key={i} className="aspect-square bg-gray-200 dark:bg-[#3a3b3c]"></div>
                            ))}
                        </div>
                    </div>

                    {/* Friends Card */}
                    <div className="bg-white dark:bg-[#242526] rounded-md shadow-sm p-4">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-xl font-bold dark:text-white">الأصدقاء</h2>
                            <Link to="#" onClick={() => setActiveTab('friends')} className="text-black dark:text-white font-bold text-sm hover:underline">عرض الكل</Link>
                        </div>
                        <p className="text-gray-500 text-sm mb-4">{friends.length} صديق</p>

                        <div className="grid grid-cols-3 gap-3">
                            {friends.slice(0, 9).map(friend => (
                                <Link key={friend.id} to={`/u/${friend.id}/profile`} className="flex flex-col gap-1">
                                    <div className="aspect-square bg-gray-200 dark:bg-[#3a3b3c] rounded-md overflow-hidden">
                                        <img src={getImageUrl(friend.avatar)} alt={friend.name} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-xs font-semibold truncate dark:text-gray-200">{friend.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Content (Posts/Friends/etc) - Left in RTL */}
                <div className="md:col-span-7 order-1 md:order-2 px-4 md:px-0">

                    {activeTab === 'posts' && (
                        <>
                            {/* Create Post Box */}
                            {isOwnProfile && (
                                <div className="bg-white dark:bg-[#242526] rounded-md shadow-sm p-4 mb-4">
                                    <div className="flex gap-2 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                            {currentUser?.avatar ? (
                                                <img src={getImageUrl(currentUser.avatar)} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 dark:bg-[#333]"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 bg-gray-100 dark:bg-[#3a3b3c] rounded-full px-4 flex items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-[#4e4f50] transition-colors">
                                            <span className="text-gray-500 dark:text-gray-400">بم تفكر يا {currentUser.name}؟</span>
                                        </div>
                                    </div>
                                    <div className="h-[1px] bg-gray-200 dark:bg-[#3e4042] mb-2"></div>
                                    <div className="flex items-center justify-between">
                                        <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-md transition-colors text-gray-600 dark:text-gray-300 font-semibold">
                                            <Camera className="w-6 h-6 text-red-500" />
                                            <span>فيديو مباشر</span>
                                        </button>
                                        <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-md transition-colors text-gray-600 dark:text-gray-300 font-semibold">
                                            <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white text-xs">IMG</div>
                                            <span>صورة/فيديو</span>
                                        </button>
                                        <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-md transition-colors text-gray-600 dark:text-gray-300 font-semibold">
                                            <Ghost className="w-6 h-6 text-yellow-500" />
                                            <span>شعور/نشاط</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Empty Posts State */}
                            <div className="bg-white dark:bg-[#242526] rounded-md shadow-sm p-8 text-center">
                                <h3 className="text-xl font-bold dark:text-white mb-2">لا توجد منشورات حتى الآن</h3>
                                <p className="text-gray-500">عندما يقوم {profileUser.name} بنشر شيء ما، سيظهر هنا.</p>
                            </div>
                        </>
                    )}

                    {activeTab === 'friends' && (
                        <div className="bg-white dark:bg-[#242526] rounded-md shadow-sm p-4">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold dark:text-white">الأصدقاء</h2>
                                <div className="flex gap-2">
                                    <button className="text-black dark:text-white font-bold hover:bg-gray-100 dark:hover:bg-[#3a3b3c] px-3 py-1.5 rounded-md transition-colors">طلبات الصداقة</button>
                                    <button className="text-black dark:text-white font-bold hover:bg-gray-100 dark:hover:bg-[#3a3b3c] px-3 py-1.5 rounded-md transition-colors">البحث عن أصدقاء</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {friends.length > 0 ? (
                                    friends.map(friend => (
                                        <div key={friend.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-[#3a3b3c] transition-colors group">
                                            <Link to={`/u/${friend.id}/profile`} className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                                                <img src={getImageUrl(friend.avatar)} alt={friend.name} className="w-full h-full object-cover" />
                                            </Link>
                                            <div className="flex-1 min-w-0">
                                                <Link to={`/u/${friend.id}/profile`} className="font-bold text-lg hover:underline truncate block">{friend.name}</Link>
                                                <p className="text-sm text-gray-500">{friend.mutual_friends_count || 0} صديق مشترك</p>
                                            </div>
                                            <button className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-[#4e4f50] rounded-full transition-all">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 text-center text-gray-500">
                                        لا يوجد أصدقاء لعرضهم
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab !== 'posts' && activeTab !== 'friends' && (
                        <div className="bg-white dark:bg-[#242526] rounded-md shadow-sm p-8 text-center">
                            <h3 className="text-xl font-bold dark:text-white mb-2">قريباً</h3>
                            <p className="text-gray-500">سيتم إضافة محتوى تبويب {activeTab} قريباً.</p>
                        </div>
                    )}

                </div>
            </div>

            <Footer />
        </div>
    );
}
