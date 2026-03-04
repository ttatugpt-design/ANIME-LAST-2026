import { useTranslation } from 'react-i18next';
import { UserInteractionsList } from '@/components/user-dashboard/UserInteractionsList';

export default function UserInteractionsPage() {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    return (
        <div className="space-y-8 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="text-right">
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">{isRtl ? 'سجل التفاعلات' : 'Interaction History'}</h1>
                <p className="text-gray-500 font-bold">{isRtl ? 'تتبع جميع تعليقاتك وردودك وتفاعلاتك في مكان واحد' : 'Track all your comments, replies, and likes in one place'}</p>
            </div>

            <UserInteractionsList />
        </div>
    );
}
