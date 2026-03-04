import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Share2, X, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderEmojiContent } from '@/utils/render-content';

interface AnimeShareModalProps {
    anime: any;
    isOpen: boolean;
    onClose: () => void;
}

export function AnimeShareModal({ anime, isOpen, onClose }: AnimeShareModalProps) {
    const { i18n } = useTranslation();
    const lang = i18n.language;

    if (!anime) return null;

    const title = lang === 'ar' ? anime.title : (anime.title_en || anime.title);
    const description = lang === 'ar' ? (anime.description || anime.description_en) : (anime.description_en || anime.description);
    const image = anime.cover || anime.image || anime.banner;

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return url.startsWith('/') ? url : `/${url}`;
    };

    const shareUrl = window.location.href;
    const shareText = `${title} - AnimeLast`;

    const socialMediaLinks = [
        {
            name: 'Facebook',
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            ),
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            bgColor: 'bg-[#1877f2]',
            hoverColor: 'hover:bg-[#166fe5]'
        },
        {
            name: 'X',
            icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            ),
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
            bgColor: 'bg-black',
            hoverColor: 'hover:bg-neutral-900'
        },
        {
            name: 'WhatsApp',
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
            ),
            url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
            bgColor: 'bg-[#25d366]',
            hoverColor: 'hover:bg-[#20bd5a]'
        },
        {
            name: 'Telegram',
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
            ),
            url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
            bgColor: 'bg-[#54a9eb]',
            hoverColor: 'hover:bg-[#4b96d1]'
        }
    ];

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        // Toast logic could go here
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-neutral-800 p-0 overflow-hidden rounded-none gap-0">
                <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto custom-scrollbar">
                    {/* Left: Image and Meta */}
                    <div className="w-full md:w-2/5 relative min-h-[300px] md:min-h-full bg-black shrink-0">
                        <img
                            src={getImageUrl(image)}
                            alt={title}
                            className="absolute inset-0 w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-6 flex flex-col justify-end">
                            <h2 className="text-white font-black text-2xl leading-tight mb-2 uppercase tracking-wide">
                                {renderEmojiContent(title)}
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase rounded">
                                    {anime.type}
                                </span>
                                <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase rounded">
                                    {anime.status}
                                </span>
                                {anime.release_date && (
                                    <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase rounded">
                                        {new Date(anime.release_date).getFullYear()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="md:hidden absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Right: Story and Socials */}
                    <div className="flex-1 p-6 md:p-8 space-y-8">
                        <div className="hidden md:flex justify-end">
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Story Section */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-wider text-black dark:text-white">
                                <Info className="w-6 h-6" />
                                {lang === 'ar' ? 'قصة الأنمي' : 'Anime Story'}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar text-pretty">
                                {renderEmojiContent(description || (lang === 'ar' ? 'لا يوجد وصف متاح.' : 'No description available.'))}
                            </p>
                        </div>

                        {/* Social Share Section */}
                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
                            <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-wider text-black dark:text-white">
                                <Share2 className="w-6 h-6" />
                                {lang === 'ar' ? 'مشاركة الأنمي' : 'Share Anime'}
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                {socialMediaLinks.map((social) => (
                                    <a
                                        key={social.name}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${social.bgColor} ${social.hoverColor} text-white py-4 flex items-center justify-center gap-3 transition-all duration-300 group skew-x-[-10deg] shadow-lg`}
                                    >
                                        <div className="skew-x-[10deg] flex items-center gap-3">
                                            {social.icon}
                                            <span className="font-bold uppercase tracking-tighter text-sm">
                                                {social.name}
                                            </span>
                                        </div>
                                    </a>
                                ))}
                            </div>

                            {/* Copy Link Button */}
                            <button
                                onClick={copyToClipboard}
                                className="w-full mt-4 py-4 bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-white font-bold uppercase tracking-widest text-xs hover:bg-gray-200 dark:hover:bg-neutral-800 transition-all skew-x-[-10deg] border border-gray-200 dark:border-neutral-800"
                            >
                                <div className="skew-x-[10deg]">
                                    {lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
