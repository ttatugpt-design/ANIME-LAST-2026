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
    Ghost,
    Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useMessagingStore } from '@/stores/messaging-store';
import { cn } from '@/lib/utils';
import Footer from '@/components/common/Footer';
import { getImageUrl } from '@/utils/image-utils';
import FavoriteAnimesModal from '@/components/modals/FavoriteAnimesModal';
import { PostFeed } from '@/components/social/PostFeed';
import { CreatePostModal } from '@/components/social/CreatePostModal';
import { Post } from '@/types/models';

export default function ProfilePage() {
    const { userId } = useParams();
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const { user: currentUser } = useAuthStore();
    const { openMessagingModal } = useMessagingStore();

    // State
    const [profileUser, setProfileUser] = useState<any>(null);
    const [friendStatus, setFriendStatus] = useState<string>('none'); // none, friends, pending_sent, pending_received, blocked
    const [friends, setFriends] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('posts'); 
    const [isUpdating, setIsUpdating] = useState(false);
    const [isFavoriteModalOpen, setIsFavoriteModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Refs for file inputs
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const isOwnProfile = currentUser?.id === Number(userId);

    // Fetch User Data & Status
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get(`/users/${userId}`);
                setProfileUser(response.data);

                if (currentUser && currentUser.id !== Number(userId)) {
                    try {
                        const statusRes = await api.get(`/friends/status/${userId}`);
                        setFriendStatus(statusRes.data.status);
                    } catch (e) {
                        console.error("Failed to fetch status", e);
                    }
                }

                try {
                    const friendsRes = await api.get(`/friends/list/${userId}`);
                    setFriends(friendsRes.data.friends || []);
                } catch (e) {
                    console.error("Failed to fetch friends", e);
                }

            } catch (error) {
                console.error('Failed to fetch profile', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            fetchProfile();
        }
    }, [userId, currentUser]);

    // WebSocket Listener
    useEffect(() => {
        const handleRealtimeStatus = (event: any) => {
            const notif = event.detail;
            if (!notif || !userId) return;
            const targetUserId = Number(userId);

            if (notif.type === 'friend_request_accepted') {
                if (notif.data.accepter_id === targetUserId) setFriendStatus('friends');
            } else if (notif.type === 'friend_request_rejected') {
                if (notif.data.rejecter_id === targetUserId) setFriendStatus('none');
            } else if (notif.type === 'friend_request') {
                if (notif.data.requester_id === targetUserId) setFriendStatus('pending_received');
            }
        };

        const handleSilentBlock = (event: any) => {
            const data = event.detail;
            if (data?.blocker_id === Number(userId)) setFriendStatus('blocked_me');
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
            } else if (action === 'unblock') {
                await api.delete(`/users/block/${userId}`);
                setFriendStatus('none');
            }
        } catch (error: any) {
            console.error(`Failed to ${action}`, error);
            alert(`Failed to ${action}`);
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
        if (currentUser?.name) {
            formData.append('name', currentUser.name);
        }

        try {
            const response = await api.post('/user/profile/update', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.user) {
                setProfileUser(response.data.user);
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
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#18191a]">
                <div className="w-10 h-10 border-4 border-gray-100 dark:border-[#333] border-t-black dark:border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#18191a]">
                <p className="text-xl text-gray-500">المستخدم غير موجود</p>
            </div>
        );
    }

    if (friendStatus === 'blocked_me' && !isOwnProfile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#18191a] gap-4">
                <p className="text-xl font-bold">عذراً، لا يمكنك دخول هذه الصفحة</p>
                <Link to={`/${i18n.language}`} className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-md font-semibold">
                    العودة للرئيسية
                </Link>
            </div>
        );
    }

    if (friendStatus === 'blocked_by_me' && !isOwnProfile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#18191a] gap-4 text-center px-4">
                <p className="text-xl text-gray-500 font-semibold mb-2">لقد قمت بحظر هذا المستخدم</p>
                <div className="flex gap-4">
                    <button onClick={() => handleAction('unblock')} className="bg-[#1877f2] text-white px-6 py-2 rounded-md font-semibold hover:bg-[#166fe5] transition-colors">
                        إلغاء الحظر
                    </button>
                    <Link to={`/${i18n.language}`} className="bg-gray-200 dark:bg-[#3a3b3c] text-black dark:text-white px-6 py-2 rounded-md font-semibold">
                        العودة للرئيسية
                    </Link>
                </div>
            </div>
        );
    }

    let actionButton = null;
    if (!isOwnProfile) {
        if (friendStatus === 'friends') {
            actionButton = (
                <button onClick={() => handleAction('remove')} className="bg-gray-200 dark:bg-[#3a3b3c] hover:bg-gray-300 dark:hover:bg-[#4e4f50] text-black dark:text-white px-3 py-1.5 rounded-md text-xs md:text-sm font-semibold flex items-center gap-2">
                    <UserPlus className="w-4 h-4 rotate-45" />
                    <span>أصدقاء</span>
                </button>
            );
        } else if (friendStatus === 'pending_sent') {
            actionButton = (
                <button onClick={() => handleAction('cancel')} className="bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-md text-xs md:text-sm font-semibold">
                    <span>إلغاء الطلب</span>
                </button>
            );
        } else if (friendStatus === 'pending_received') {
            actionButton = (
                <button onClick={() => handleAction('accept')} className="bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-md text-xs md:text-sm font-semibold flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    <span>قبول الطلب</span>
                </button>
            );
        } else {
            actionButton = (
                <button onClick={() => handleAction('add')} className="bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-md text-xs md:text-sm font-semibold flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    <span>إضافة صديق</span>
                </button>
            );
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#18191a] text-gray-900 dark:text-white font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>{profileUser.name} | AnimeLast</title>
            </Helmet>

            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover_image')} />

            <div className="bg-white dark:bg-[#242526] shadow-sm pb-4">
                <div className="relative w-full aspect-[2.7/1] md:aspect-[3.5/1] lg:h-[400px] bg-gray-200 dark:bg-[#3a3b3c] overflow-hidden group">
                    {profileUser.cover_image ? (
                        <img src={getImageUrl(profileUser.cover_image)} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-b from-gray-300 to-gray-400 dark:from-[#3a3b3c] dark:to-[#18191a]"></div>
                    )}
                    {isOwnProfile && (
                        <button 
                            onClick={() => coverInputRef.current?.click()} 
                            disabled={isUpdating} 
                            className="absolute bottom-4 start-4 md:bottom-5 md:start-8 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 z-20 text-xs md:text-sm backdrop-blur-sm transition-all border border-white/20"
                        >
                            <Camera className="w-4 h-4 md:w-5 md:h-5" />
                            <span>{isUpdating ? (isRtl ? 'جاري التحديث...' : 'Updating...') : (isRtl ? 'تغيير الغلاف' : 'Change Cover')}</span>
                        </button>
                    )}
                </div>

                <div className="max-w-[1095px] mx-auto">
                    <div className="px-4 md:px-8 pb-4 relative">
                        <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-10 gap-4">
                            <div className="relative group">
                                <div className="w-[168px] h-[168px] rounded-full p-1 bg-white dark:bg-[#242526] relative z-10 shadow-md">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-[#3a3b3c] relative">
                                        {profileUser.avatar ? (
                                            <img src={getImageUrl(profileUser.avatar)} alt={profileUser.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-[#333] font-bold text-4xl">
                                                {profileUser.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {isOwnProfile && (
                                            <div onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity z-20 backdrop-blur-[2px]">
                                                <Camera className="w-10 h-10 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {isOwnProfile && (
                                    <button 
                                        onClick={() => avatarInputRef.current?.click()} 
                                        className="absolute bottom-4 end-2 bg-gray-100 dark:bg-[#3a3b3c] hover:bg-gray-200 dark:hover:bg-[#4e4f50] w-10 h-10 rounded-full flex items-center justify-center z-30 shadow-lg border-2 border-white dark:border-[#242526] transition-transform hover:scale-110"
                                        title={isRtl ? "تغيير الصورة الشخصية" : "Change Profile Picture"}
                                    >
                                        <Camera className="w-5 h-5 text-black dark:text-white" />
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-right mb-4 md:mb-8">
                                <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2 mb-1">
                                    <h1 className="text-3xl font-bold">{profileUser.name}</h1>
                                    <span className="text-gray-500 dark:text-gray-400 font-bold text-sm">
                                        ({friends.length > 0 ? `${friends.length} صديق` : '0 أصدقاء'})
                                    </span>
                                </div>
                                <div className="flex items-center -space-x-2 rtl:space-x-reverse mb-2">
                                    {friends.slice(0, 8).map(friend => (
                                        <Link key={friend.id} to={`/u/${friend.id}/profile`} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#242526] bg-gray-300 overflow-hidden transition-transform hover:scale-110 z-[1]">
                                            <img src={getImageUrl(friend.avatar)} alt={friend.name} className="w-full h-full object-cover" />
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile Only Posts Section */}
                            <div className="block md:hidden flex-1 w-full space-y-4 mb-8">
                                {isOwnProfile && (
                                    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-[#2a2a2a]">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 overflow-hidden border border-gray-100 dark:border-[#333]">
                                                {currentUser?.avatar ? (
                                                    <img src={getImageUrl(currentUser.avatar)} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                                        {currentUser?.name?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setIsCreateModalOpen(true)}
                                                className="flex-1 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 text-start px-4 py-2.5 rounded-full transition-colors font-medium border-none outline-none cursor-pointer shadow-sm"
                                            >
                                                {isRtl ? `بماذا تفكر، ${currentUser?.name}؟` : `What's on your mind, ${currentUser?.name}?`}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <PostFeed userId={Number(userId)} refreshKey={refreshKey} />
                            </div>

                            <div className="flex flex-row items-center gap-2 mb-8 w-full md:w-auto px-4 md:px-0">
                                {!isOwnProfile && (
                                    <div className="flex flex-row items-center gap-2 w-full md:w-auto">
                                        <div className="flex-1 md:flex-initial">
                                            {actionButton}
                                        </div>
                                        <button 
                                            onClick={() => openMessagingModal(profileUser, isRtl ? 'مرحبا' : 'Hello')}
                                            className="bg-gray-200 dark:bg-[#3a3b3c] text-black dark:text-white px-4 py-2.5 rounded-lg text-sm md:text-base font-bold flex items-center justify-center gap-2 flex-1 md:flex-initial transition-colors hover:bg-gray-300 dark:hover:bg-[#4e4f50]"
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                            <span>مراسلة</span>
                                        </button>
                                        <button 
                                            onClick={() => handleAction('block')} 
                                            className="bg-gray-200 dark:bg-[#3a3b3c] hover:bg-red-500 hover:text-white text-black dark:text-white px-4 py-2.5 rounded-lg text-sm md:text-base font-bold flex items-center justify-center transition-colors gap-2 flex-1 md:flex-initial"
                                        >
                                            <span>حظر</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1095px] mx-auto px-4 md:px-0 py-8 space-y-8">
                {/* Desktop Only Posts Section */}
                <div className="hidden md:block space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-6 h-6 text-blue-500" />
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                            {isRtl ? 'المنشورات' : 'Posts'}
                        </h2>
                    </div>

                    <div className="max-w-[680px] mx-auto space-y-4">
                        {isOwnProfile && (
                            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-[#2a2a2a]">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 overflow-hidden border border-gray-100 dark:border-[#333]">
                                        {currentUser?.avatar ? (
                                            <img src={getImageUrl(currentUser.avatar)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                                {currentUser?.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="flex-1 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 text-start px-4 py-2.5 rounded-full transition-colors font-medium border-none outline-none cursor-pointer shadow-sm"
                                    >
                                        {isRtl ? `بماذا تفكر، ${currentUser?.name}؟` : `What's on your mind, ${currentUser?.name}?`}
                                    </button>
                                </div>
                            </div>
                        )}

                        <PostFeed userId={Number(userId)} refreshKey={refreshKey} />
                    </div>
                </div>
                <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 dark:border-[#2a2a2a]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-yellow-500" />
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">الأنميات المفضلة</h2>
                        </div>
                        {isOwnProfile && (
                            <button onClick={() => setIsFavoriteModalOpen(true)} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline text-sm md:text-base">
                                إدارة المفضلة
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                        {(profileUser.favorite_animes || []).length > 0 ? (
                            profileUser.favorite_animes.map((anime: any) => (
                                <Link key={anime.id} to={`/${i18n.language}/animes/${anime.id}`} className="group relative rounded-xl overflow-hidden aspect-[2/3] bg-gray-200 dark:bg-[#3a3b3c] shadow-sm block">
                                    <img src={getImageUrl(anime.image || anime.cover)} alt={anime.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-2 md:p-3">
                                        <h3 className="text-white font-bold text-[10px] md:text-sm line-clamp-2 text-center">
                                            {isRtl ? (anime.title || anime.title_en) : (anime.title_en || anime.title)}
                                        </h3>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-gray-500">
                                <Ghost className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>{isRtl ? 'لا يوجد أنميات مفضلة حالياً' : 'No favorite animes yet'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isOwnProfile && (
                <FavoriteAnimesModal
                    isOpen={isFavoriteModalOpen}
                    onClose={() => setIsFavoriteModalOpen(false)}
                    userId={Number(userId)}
                    currentFavorites={profileUser.favorite_animes || []}
                    onSaved={(newFavorites: any[]) => setProfileUser({ ...profileUser, favorite_animes: newFavorites })}
                />
            )}

            <CreatePostModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    setRefreshKey(prev => prev + 1);
                }}
            />

            <Footer />
        </div>
    );
}
