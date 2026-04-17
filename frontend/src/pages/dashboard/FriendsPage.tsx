import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, UserPlus, UserMinus, X, Check, MessageCircle, MoreHorizontal } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Link, useParams } from 'react-router-dom';
import { getImageUrl } from '@/utils/image-utils';
import Footer from '@/components/common/Footer';

export default function FriendsPage() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuthStore();
    const { userId, id } = useParams();
    const effectiveUserId = id || userId;
    const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');
    const [friends, setFriends] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isOwnProfile = currentUser?.id === Number(effectiveUserId);

    useEffect(() => {
        if (effectiveUserId) {
            fetchFriends();
            if (isOwnProfile) {
                fetchRequests();
            }
        }
    }, [effectiveUserId, isOwnProfile]);

    const fetchFriends = async () => {
        try {
            const response = await api.get(`/friends/list/${effectiveUserId}`);
            setFriends(response.data.friends || []);
        } catch (error) {
            console.error("Failed to fetch friends", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            const response = await api.get('/friends/requests/pending');
            setRequests(response.data.requests || []);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    };

    const handleAccept = async (requesterId: number) => {
        try {
            await api.post(`/friends/accept/${requesterId}`);
            // Move from requests to friends
            const req = requests.find(r => r.requester.id === requesterId);
            if (req) {
                setFriends(prev => [...prev, req.requester]);
                setRequests(prev => prev.filter(r => r.requester.id !== requesterId));
            }
        } catch (error) {
            alert('Failed to accept');
        }
    };

    const handleReject = async (requesterId: number) => {
        try {
            await api.delete(`/friends/${requesterId}`);
            setRequests(prev => prev.filter(r => r.requester.id !== requesterId));
        } catch (error) {
            alert('Failed to reject');
        }
    };

    const handleUnfriend = async (friendId: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/friends/${friendId}`);
            setFriends(prev => prev.filter(f => f.id !== friendId));
        } catch (error) {
            alert('Failed to unfriend');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#18191a]">
            <div className="flex-1 p-6">
                <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">الأصدقاء</h1>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'all'
                            ? 'text-black dark:text-white'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        كل الأصدقاء ({friends.length})
                        {activeTab === 'all' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-t-full" />
                        )}
                    </button>
                    {isOwnProfile && (
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'requests'
                                ? 'text-black dark:text-white'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            طلبات الصداقة ({requests.length})
                            {activeTab === 'requests' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-t-full" />
                            )}
                        </button>
                    )}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <div className="relative w-8 h-8">
                            <div className="absolute inset-0 border-4 border-gray-100 dark:border-[#333] rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeTab === 'all' && friends.map((friend) => (
                            <div key={friend.id} className="bg-white dark:bg-[#242526] p-4 rounded-lg shadow-sm flex items-center gap-4">
                                <Link to={`/u/${friend.id}/profile`} className="shrink-0">
                                    <img
                                        src={getImageUrl(friend.avatar)}
                                        alt={friend.name}
                                        className="w-16 h-16 rounded-full object-cover bg-gray-200 dark:bg-[#3a3b3c]"
                                    />
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/u/${friend.id}/profile`} className="font-semibold text-gray-900 dark:text-white truncate block hover:underline">
                                        {friend.name}
                                    </Link>
                                    <p className="text-sm text-gray-500 truncate">Friend</p>
                                </div>
                                {isOwnProfile && (
                                    <button
                                        onClick={() => handleUnfriend(friend.id)}
                                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] rounded-full"
                                        title="Unfriend"
                                    >
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {activeTab === 'requests' && requests.map((req) => (
                            <div key={req.id} className="bg-white dark:bg-[#242526] p-4 rounded-lg shadow-sm flex items-center gap-4">
                                <Link to={`/u/${req.requester.id}/profile`} className="shrink-0">
                                    <img
                                        src={getImageUrl(req.requester.avatar)}
                                        alt={req.requester.name}
                                        className="w-16 h-16 rounded-full object-cover bg-gray-200 dark:bg-[#3a3b3c]"
                                    />
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/u/${req.requester.id}/profile`} className="font-semibold text-gray-900 dark:text-white truncate block hover:underline">
                                        {req.requester.name}
                                    </Link>
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => handleAccept(req.requester.id)}
                                            className="bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-3 py-1 rounded text-sm font-medium transition-colors"
                                        >
                                            تأكيد
                                        </button>
                                        <button
                                            onClick={() => handleReject(req.requester.id)}
                                            className="bg-gray-200 dark:bg-[#3a3b3c] hover:bg-gray-300 dark:hover:bg-[#4e4f50] text-gray-700 dark:text-gray-300 px-3 py-1 rounded text-sm font-medium transition-colors"
                                        >
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'all' && friends.length === 0 && (
                            <div className="col-span-full text-center py-8 text-gray-500">
                                لا يوجد أصدقاء حتى الآن
                            </div>
                        )}

                        {activeTab === 'requests' && requests.length === 0 && (
                            <div className="col-span-full text-center py-8 text-gray-500">
                                لا توجد طلبات صداقة جديدة
                            </div>
                        )}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
