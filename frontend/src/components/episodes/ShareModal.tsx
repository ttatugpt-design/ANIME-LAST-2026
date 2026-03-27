import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Clock, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getImageUrl } from '@/utils/image-utils';

interface ShareModalProps {
    episode: any;
    anime: any;
    isOpen: boolean;
    onClose: () => void;
}

export function ShareModal({ episode, anime, isOpen, onClose }: ShareModalProps) {
    const { i18n } = useTranslation();
    const lang = i18n.language;

    const title = (lang === 'ar' ? episode.title : episode.title_en) || `Episode ${episode.episode_number}`;
    const animeTitle = anime.title;
    const thumbnail = episode.thumbnail || episode.banner || anime.cover || anime.banner;


    const shareUrl = window.location.href;
    const shareText = `${title} - ${animeTitle}`;

    const socialMediaLinks = [
        {
            name: 'Facebook',
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            ),
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            color: 'hover:bg-blue-600',
            bgColor: 'bg-blue-500'
        },
        {
            name: 'Twitter',
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
            ),
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
            color: 'hover:bg-sky-500',
            bgColor: 'bg-sky-400'
        },
        {
            name: 'WhatsApp',
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
            ),
            url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
            color: 'hover:bg-green-600',
            bgColor: 'bg-green-500'
        },
        {
            name: 'Telegram',
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
            ),
            url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
            color: 'hover:bg-blue-500',
            bgColor: 'bg-blue-400'
        },
        {
            name: 'Copy Link',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            ),
            onClick: () => {
                navigator.clipboard.writeText(shareUrl);
                // You could add a toast notification here
            },
            color: 'hover:bg-gray-600',
            bgColor: 'bg-gray-500'
        }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl w-full h-full md:h-auto md:max-h-[90vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-0 gap-0 rounded-none md:rounded-xl overflow-hidden">
                <div className="h-full md:max-h-[600px] overflow-y-auto custom-scrollbar">
                    {/* Header with Image and Title */}
                    <div className="relative h-64 w-full bg-gray-900 group shrink-0">
                        <img
                            src={getImageUrl(thumbnail)}
                            alt={title}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-500"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1a1c22/FFF?text=No+Image';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1c22] via-black/50 to-transparent p-6 flex flex-col justify-end">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 border border-purple-500/20 backdrop-blur-sm">
                                    {lang === 'ar' ? 'أنمي' : 'ANIME'}
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 border border-green-500/20 backdrop-blur-sm">
                                    {lang === 'ar' ? `حلقة ${episode.episode_number}` : `EP ${episode.episode_number}`}
                                </span>
                                {episode.quality && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 bg-white/10 px-2 py-0.5 border border-white/20 backdrop-blur-sm">
                                        {episode.quality}
                                    </span>
                                )}
                            </div>

                            <h4 className="text-white font-black text-3xl leading-tight line-clamp-2 drop-shadow-md mb-2">{title}</h4>

                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="w-full bg-transparent border-0 focus:ring-0 text-sm font-medium text-gray-900 dark:text-white"
                            />
                            <div className="flex items-center justify-between text-gray-300 text-sm font-medium opacity-90">
                                <span className="truncate max-w-[65%] text-gray-200">{animeTitle}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-sm backdrop-blur-sm border border-white/5">
                                        <Clock className="w-3 h-3 text-white" />
                                        {episode.duration}m
                                    </span>
                                    {episode.release_date && (
                                        <span className="bg-black/40 px-2 py-1 rounded-sm backdrop-blur-sm border border-white/5">
                                            {new Date(episode.release_date).getFullYear()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Social Media Share Buttons */}
                    <div className="p-8">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                            <Share2 className="w-6 h-6" />
                            {lang === 'ar' ? 'مشاركة على' : 'Share on'}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {socialMediaLinks.map((social) => (
                                social.url ? (
                                    <a
                                        key={social.name}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${social.bgColor} ${social.color} text-white font-medium py-4 px-6 transition-all duration-200 flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-700 group`}
                                    >
                                        <span className="text-white">{social.icon}</span>
                                        <span className="text-base">{social.name}</span>
                                    </a>
                                ) : (
                                    <button
                                        key={social.name}
                                        onClick={social.onClick}
                                        className={`${social.bgColor} ${social.color} text-white font-medium py-4 px-6 transition-all duration-200 flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-700 group`}
                                    >
                                        <span className="text-white">{social.icon}</span>
                                        <span className="text-base">{social.name}</span>
                                    </button>
                                )
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
