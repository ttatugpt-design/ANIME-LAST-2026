import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import Footer from '@/components/common/Footer';

export default function DmcaPage() {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 font-sans">
            <Helmet>
                <title>{isRtl ? 'محمي بواسطة DMCA - AnimeLast' : 'DMCA Protected - AnimeLast'}</title>
            </Helmet>

            {/* Main Content - Centered */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full text-center">

                {/* Main Title */}
                <h1 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-wider text-black dark:text-white">
                    DMCA PROTECTED
                </h1>

                {/* Subtitle */}
                <p className="text-xl md:text-2xl font-bold mb-12 text-gray-700 dark:text-gray-300">
                    {isRtl
                        ? 'هذا الموقع محمي بموجب قانون الألفية للملكية الرقمية.'
                        : 'This site is protected by the Digital Millennium Copyright Act.'}
                </p>

                {/* Detailed Text */}
                <div className="space-y-8 text-lg leading-relaxed text-start w-full border-t border-gray-200 dark:border-gray-800 pt-8">

                    {/* Section 1 */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-black dark:text-white text-3xl">•</span>
                            {isRtl ? 'سياسة حقوق الطبع والنشر' : 'Copyright Policy'}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            {isRtl
                                ? 'نحن نحترم حقوق الملكية الفكرية للآخرين ونطلب من مستخدمينا القيام بذلك أيضًا. نحن نلتزم بالاستجابة لإشعارات انتهاك حقوق الطبع والنشر المزعومة التي تمت بشكل صحيح.'
                                : 'We respect the intellectual property rights of others and require that our users do the same. It is our policy to respond to any claim that Content posted on the Service infringes on the copyright or other intellectual property rights of any person or entity.'}
                        </p>
                    </div>

                    {/* Section 2 */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-black dark:text-white text-3xl">•</span>
                            {isRtl ? 'إشعار الانتهاك' : 'Infringement Notification'}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            {isRtl
                                ? 'إذا كنت مالكًا لحقوق الطبع والنشر، أو مفوضًا نيابة عن أحدهم، وتعتقد أن العمل المحمي بحقوق الطبع والنشر قد تم نسخه بطريقة تشكل انتهاكًا لحقوق الطبع والنشر، يرجى إرسال إشعارك عبر نموذج الاتصال الخاص بنا.'
                                : 'If you are a copyright owner, or authorized on behalf of one, and you believe that the copyrighted work has been copied in a way that constitutes copyright infringement, please submit your claim via our contact form.'}
                        </p>
                    </div>

                    {/* Section 3 */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-black dark:text-white text-3xl">•</span>
                            {isRtl ? 'الإجراءات المتخذة' : 'Actions Taken'}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            {isRtl
                                ? 'عند استلام إشعار سليم، سنقوم بإزالة أو تعطيل الوصول إلى المحتوى المخالف، وسننهي حسابات المخالفين المتكررين وفقًا لتقديرنا الخاص.'
                                : 'Upon receipt of a valid notification, we will remove or disable access to the infringing content and terminate the accounts of repeat infringers at our sole discretion.'}
                        </p>
                    </div>

                </div>

                {/* Footer Note */}
                <div className="mt-16 text-sm text-gray-400 dark:text-gray-600 font-mono">
                    ID: {Math.random().toString(36).substr(2, 9).toUpperCase()} | SECURE CONNECTION
                </div>

            </div>

            <Footer />
        </div>
    );
}
