import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldAlert, Mail } from "lucide-react";

export default function Footer() {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    return (
        <footer dir={isRtl ? 'rtl' : 'ltr'} className="w-full bg-white dark:bg-[#18191a] pt-12 pb-12 transition-colors duration-300 mt-12 border-t border-gray-200 dark:border-[#2a2a2a]">
            <div className="container mx-auto px-4 max-w-5xl">
                
                {/* الأزرار الكبيرة */}
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-center items-center">
                    
                    {/* زر التواصل */}
                    <Link 
                        to={`/${i18n.language}/contact`} 
                        className="flex items-center justify-center gap-2 w-full md:w-auto min-w-[200px] bg-white dark:bg-[#242526] border border-black dark:border-[#4e4f50] text-black dark:text-white py-2 md:py-2.5 px-6 hover:bg-gray-100 dark:hover:bg-[#3a3b3c] transition-all duration-300 font-bold text-sm md:text-base rounded-xl shadow-sm"
                    >
                        <Mail className="w-4 h-4 md:w-5 md:h-5" />
                        <span>{isRtl ? 'تواصل معنا' : 'Contact Us'}</span>
                    </Link>

                    {/* زر DMCA */}
                    <Link 
                        to={`/${i18n.language}/dmca`} 
                        className="flex items-center justify-center gap-2 w-full md:w-auto min-w-[200px] bg-black dark:bg-red-600 text-white py-2 md:py-2.5 px-6 hover:bg-gray-900 dark:hover:bg-red-700 transition-all duration-300 font-bold text-sm md:text-base rounded-xl shadow-lg"
                    >
                        <ShieldAlert className="w-4 h-4 md:w-5 md:h-5" />
                        <span>DMCA PROTECTED</span>
                    </Link>

                </div>
                
            </div>
        </footer>
    );
}
