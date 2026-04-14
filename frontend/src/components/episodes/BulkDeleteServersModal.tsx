import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Loader2, CheckSquare, Square } from 'lucide-react';
import api from '@/lib/api';

interface BulkDeleteServersModalProps {
    isOpen: boolean;
    onClose: () => void;
    animeId: number;
    animeTitle: string;
    onSuccess: () => void;
}

const BulkDeleteServersModal: React.FC<BulkDeleteServersModalProps> = ({
    isOpen,
    onClose,
    animeId,
    animeTitle,
    onSuccess,
}) => {
    const [servers, setServers] = useState<string[]>([]);
    const [selectedServers, setSelectedServers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && animeId) {
            fetchServers();
        }
    }, [isOpen, animeId]);

    const fetchServers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get(`/animes/${animeId}/servers`);
            setServers(response.data);
        } catch (err) {
            console.error('Failed to fetch servers:', err);
            setError('فشل في تحميل السيرفرات');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleServer = (name: string) => {
        if (selectedServers.includes(name)) {
            setSelectedServers(selectedServers.filter((s) => s !== name));
        } else {
            setSelectedServers([...selectedServers, name]);
        }
    };

    const handleDelete = async () => {
        if (selectedServers.length === 0) return;
        
        const confirmDelete = window.confirm(
            `هل أنت متأكد من حذف ${selectedServers.length} سيرفر من جميع حلقات "${animeTitle}"؟ لا يمكن التراجع عن هذا الإجراء.`
        );
        
        if (!confirmDelete) return;

        setIsDeleting(true);
        setError(null);
        try {
            await api.delete(`/animes/${animeId}/servers`, {
                data: { names: selectedServers }
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to delete servers:', err);
            setError('حدث خطأ أثناء الحذف');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-[#1a1c23] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                >
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500" />
                            <h2 className="text-xl font-bold text-white">حذف السيرفرات بالجملة</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/5 rounded-full text-white/50 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6">
                        <p className="text-white/70 text-sm mb-4">
                            سيتم حذف السيرفرات المحددة من جميع حلقات <span className="text-blue-400 font-semibold">{animeTitle}</span>.
                        </p>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                <p className="text-white/50 animate-pulse">جاري جلب السيرفرات...</p>
                            </div>
                        ) : error ? (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-center">
                                {error}
                            </div>
                        ) : servers.length === 0 ? (
                                <div className="text-center py-10 text-white/30 italic">
                                    لا توجد سيرفرات متاحة لهذا الأنمي.
                                </div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {servers.map((server) => (
                                    <button
                                        key={server}
                                        onClick={() => toggleServer(server)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                                            selectedServers.includes(server)
                                                ? 'bg-blue-500/10 border-blue-500/50 text-white'
                                                : 'bg-white/5 border-transparent text-white/70 hover:bg-white/10'
                                        }`}
                                    >
                                        <span className="font-medium">{server}</span>
                                        {selectedServers.includes(server) ? (
                                            <CheckSquare className="w-5 h-5 text-blue-500" />
                                        ) : (
                                            <Square className="w-5 h-5 text-white/20" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/5 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-all border border-white/5"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={selectedServers.length === 0 || isDeleting}
                            className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    جاري الحذف...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    حذف المختار ({selectedServers.length})
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BulkDeleteServersModal;
