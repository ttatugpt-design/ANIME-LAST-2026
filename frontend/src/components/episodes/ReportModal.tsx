import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronDown, Clock, Flag, X } from 'lucide-react';
import { submitReport, ReportData } from '@/lib/report-api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface ReportModalProps {
    isOpen: boolean;
    closeModal: () => void;
    episodeNumber: string;
    episodeLink: string;
    serverName: string;
    episode?: any;
    anime?: any;
    getImageUrl?: (path?: string) => string;
}

export function ReportModal({
    isOpen,
    closeModal,
    episodeNumber,
    episodeLink,
    serverName,
    episode,
    anime,
    getImageUrl,
}: ReportModalProps) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const [problemType, setProblemType] = useState('Audio Issue');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            toast.error(t('Please describe the problem'));
            return;
        }

        setIsSubmitting(true);
        try {
            const reportData: ReportData = {
                problem_type: problemType,
                description,
                episode_number: String(episodeNumber),
                episode_link: episodeLink,
                server_name: serverName,
                page_type: i18n.language,
            };

            await submitReport(reportData);

            // Rich Toast Notification
            toast.custom((t) => (
                <div className="flex w-full items-start gap-3 rounded-lg bg-white dark:bg-[#1a1a1a] p-4 shadow-lg border border-gray-100 dark:border-[#333] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                        <button onClick={() => toast.dismiss(t)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                        {/* Use episode thumbnail if available, else show Flag icon */}
                        {thumbnail ? (
                            <img
                                src={getImageUrl?.(thumbnail) || getImageUrlHelper(thumbnail)}
                                alt="Episode"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Flag className="w-6 h-6 text-black dark:text-white" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                            {lang === 'ar' ? 'تم إرسال البلاغ بنجاح!' : 'Report Submitted Successfully!'}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {lang === 'ar' ? 'شكراً لك، سنقوم بمراجعة البلاغ قريباً.' : 'Thank you, we will review your report shortly.'}
                        </p>
                    </div>
                </div>
            ), { position: 'top-center', duration: 4000 });

            closeModal();
            setDescription('');
            setProblemType('Audio Issue');
        } catch (error) {
            console.error(error);
            toast.error(t('Failed to submit report'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const problemTypes = [
        { value: 'Audio Issue', label: lang === 'ar' ? 'مشكلة في الصوت' : 'Audio Issue' },
        { value: 'Video Issue', label: lang === 'ar' ? 'مشكلة في الفيديو' : 'Video Issue' },
        { value: 'Subtitle Issue', label: lang === 'ar' ? 'مشكلة في الترجمة' : 'Subtitle Issue' },
        { value: 'Broken Link', label: lang === 'ar' ? 'رابط معطل' : 'Broken Link' },
        { value: 'Other', label: lang === 'ar' ? 'أخرى' : 'Other' },
    ];

    const title = (lang === 'ar' ? episode?.title : episode?.title_en) || `Episode ${episode?.episode_number}`;
    const animeTitle = anime?.title;
    const thumbnail = episode?.thumbnail || episode?.banner || anime?.cover || anime?.banner;

    const getImageUrlHelper = (url: string) => {
        if (!url) return '/placeholder-episode.jpg';
        if (url.startsWith('http')) return url;
        return url.startsWith('/') ? url : `/${url}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={closeModal}>
            <DialogContent className="max-w-2xl w-full h-full md:h-auto md:max-h-[90vh] bg-white dark:bg-gray-900 border-2 border-gray-900 dark:border-white p-0 gap-0 rounded-none md:rounded-xl overflow-hidden">
                <div className="h-full md:max-h-[600px] overflow-y-auto custom-scrollbar">
                    {/* Header with Image and Title */}
                    {episode && (
                        <div className="relative h-64 w-full bg-gray-900 group shrink-0">
                            <img
                                src={getImageUrl?.(thumbnail) || getImageUrlHelper(thumbnail)}
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
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-black dark:text-white bg-black/10 dark:bg-white/10 px-2 py-0.5 border border-black/20 dark:border-white/20 backdrop-blur-sm">
                                        {lang === 'ar' ? `حلقة ${episode.episode_number}` : `EP ${episode.episode_number}`}
                                    </span>
                                    {episode.quality && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 bg-white/10 px-2 py-0.5 border border-white/20 backdrop-blur-sm">
                                            {episode.quality}
                                        </span>
                                    )}
                                </div>

                                <h4 className="text-white font-black text-3xl leading-tight line-clamp-2 drop-shadow-md mb-2">{title}</h4>

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
                    )}

                    {/* Report Form */}
                    <div className="p-8">
                        <h3 className="text-xl font-bold border-r-4 border-black dark:border-white pr-4 dark:text-white mb-6 flex items-center gap-3">
                            <Flag className="w-6 h-6 text-black dark:text-white" />
                            {lang === 'ar' ? 'الإبلاغ عن مشكلة' : 'Report Issue'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Problem Type - Custom Dropdown */}
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
                                    {lang === 'ar' ? 'نوع المشكلة' : 'Problem Type'}
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="w-full bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white text-left font-medium text-base focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-between"
                                    >
                                        <span>{problemTypes.find(p => p.value === problemType)?.label}</span>
                                        <ChevronDown className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-lg max-h-64 overflow-auto">
                                            {problemTypes.map((type) => (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setProblemType(type.value);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 text-base font-medium transition-colors border-b border-gray-200 dark:border-gray-800 last:border-0 ${problemType === type.value
                                                        ? 'bg-black dark:bg-white text-white dark:text-black'
                                                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
                                    {lang === 'ar' ? 'وصف المشكلة' : 'Description'}
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={5}
                                    className="w-full bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-600 px-4 py-3 text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                    placeholder={lang === 'ar' ? 'اشرح المشكلة بالتفصيل...' : 'Describe the issue in detail...'}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeModal}
                                    className="flex-1 border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a1a] font-medium py-3 rounded-none text-base"
                                >
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-black dark:bg-white border-2 border-black dark:border-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 hover:border-neutral-800 dark:hover:border-neutral-200 font-bold py-3 rounded-none text-base"
                                >
                                    {isSubmitting ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (lang === 'ar' ? 'إرسال البلاغ' : 'Send Report')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
