import { useState, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Pen } from 'lucide-react';
import api from '@/lib/api';

export default function UserInfoPage() {
    const { user, setUser } = useAuthStore();
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [isLoading, setIsLoading] = useState(false);

    // Form States
    const [name, setName] = useState(user?.name || '');
    // const [username, setUsername] = useState(user?.username || ''); // Assuming user has username field, if not, use name or add it. The image shows "Username (Optional)"
    const [bio, setBio] = useState(''); // The image shows a bio/description field "This appears on your profile..."
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null); // Placeholder for banner

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('name', name);
            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            const response = await api.post('/user/profile/update', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setUser({ ...user, ...response.data.user });
            toast.success(isRtl ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully');

        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || (isRtl ? 'حدث خطأ ما' : 'Something went wrong'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-20">
            {/* Header Title */}
            <h1 className="text-3xl font-bold text-center text-white mb-8">
                {isRtl ? 'تعديل الملف الشخصي' : 'Edit Profile'}
            </h1>

            {/* Profile Card Container */}
            <div className="bg-[#111] overflow-hidden rounded-none relative">

                {/* Banner Section */}
                <div className="relative h-48 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-[#333] dark:to-[#1a1a1a] overflow-hidden group">
                    {/* decorative circles/pattern overlay */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
                    <div className="absolute top-[-50%] left-[-10%] w-[500px] h-[500px] border border-white/10 rounded-full"></div>
                    <div className="absolute top-[20%] right-[-5%] w-[300px] h-[300px] border border-white/10 rounded-full"></div>

                    {/* Banner Edit Button */}
                    <button
                        onClick={() => bannerInputRef.current?.click()}
                        className="absolute top-4 left-4 p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
                    >
                        <Pen className="w-5 h-5 text-white" />
                    </button>
                    <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" />
                </div>

                {/* Avatar Section - Overlapping Banner */}
                <div className="relative -mt-16 text-center">
                    <div className="relative inline-block">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#111] bg-[#222] relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                            {avatarPreview ? (
                                <img src={avatarPreview} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-500">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Pen className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        {/* Edit Icon Bubble */}
                        <div
                            className="absolute bottom-2 right-0 bg-[#333] hover:bg-[#444] text-white p-2 rounded-full border-4 border-[#111] cursor-pointer transition-colors"
                            onClick={() => avatarInputRef.current?.click()}
                        >
                            <Pen className="w-4 h-4" />
                        </div>
                        <input
                            type="file"
                            ref={avatarInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarChange}
                        />
                    </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleUpdateProfile} className="px-8 py-8 space-y-8">

                    {/* Name Display / Info */}
                    <div className="text-center space-y-1">
                        <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                        {/* <p className="text-gray-400 text-sm">@{user.username || 'username'}</p> */}
                    </div>

                    <div className="border-t border-[#222] my-6"></div>

                    {/* Inputs */}
                    <div className="space-y-6 max-w-2xl mx-auto">

                        {/* Display Name */}
                        <div className="space-y-2 text-right">
                            <Label className="text-gray-400 text-sm font-normal">{isRtl ? 'اسم الملف الشخصي' : 'Profile Name'}</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-transparent border-none text-white text-2xl font-medium text-right focus-visible:ring-0 px-0 placeholder:text-gray-600"
                                placeholder={isRtl ? 'الاسم' : 'Name'}
                            />
                            <p className="text-gray-500 text-xs text-right">
                                {isRtl ? 'هذا يظهر داخل منزلك ويمكن تغييره في أي وقت.' : 'This appears inside your home and can be changed at any time.'}
                            </p>
                        </div>

                        {/* Username (Optional/Placeholder based on image) */}
                        <div className="space-y-2 text-right pt-6">
                            <div className="flex justify-between items-center flex-row-reverse">
                                <Label className="text-white text-xl font-bold text-right w-full">{isRtl ? 'اسم المستخدم (اختياري)' : 'Username (Optional)'}</Label>
                                <span className="text-gray-500 text-xs whitespace-nowrap">{isRtl ? 'عشوائي' : 'Random'}</span>
                            </div>

                            <p className="text-gray-500 text-sm leading-relaxed text-right">
                                {isRtl ? 'أنشئ اسم مستخدم لتكون جاهزاً للتجارب المستقبلية التي ستشارك فيها حبك للأنمي! اختر واحداً تحبه، لا يمكن تغييره لاحقاً!' : 'Create a username to be ready for future experiences where you share your love for anime! Choose one you love, it cannot be changed later!'}
                            </p>
                            {/* Assuming username is not editable or distinct from name in current backend, keeping as static text or future feature */}
                        </div>

                    </div>

                </form>
            </div>

            {/* Footer Buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-[#222] z-50 flex justify-center gap-4">
                <Button
                    variant="outline"
                    className="bg-transparent border border-[#333] text-gray-400 hover:bg-[#222] hover:text-white px-8 h-12 text-lg font-bold min-w-[150px]"
                >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                    onClick={handleUpdateProfile}
                    disabled={isLoading}
                    className="bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black border border-black dark:border-white px-8 h-12 text-lg font-bold min-w-[150px]"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {isRtl ? 'جاري الحفظ...' : 'Saving...'}
                        </>
                    ) : (
                        isRtl ? 'حفظ' : 'Save'
                    )}
                </Button>
            </div>
        </div>
    );
}
