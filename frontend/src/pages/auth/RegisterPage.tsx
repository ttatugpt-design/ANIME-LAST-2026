import { RegisterForm } from "@/features/auth/components/register-form";
import { Header } from "@/components/header/Header";
import { useTranslation } from "react-i18next";

export default function RegisterPage() {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const isRtl = lang === 'ar';

    return (
        <div className="min-h-screen bg-background font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
            <Header />
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] py-12 px-4 animate-in fade-in duration-500">
                <div className="w-full max-w-[600px] grid gap-8">
                    <div className="grid gap-2 text-center">
                        <h1 className="text-4xl font-bold tracking-tight">
                            {lang === 'ar' ? 'إنشاء حساب جديد' : 'Create an Account'}
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            {lang === 'ar'
                                ? 'أدخل بياناتك أدناه لإنشاء حساب جديد'
                                : 'Enter your details below to create your account'}
                        </p>
                    </div>
                    <RegisterForm />
                </div>
            </div>
        </div>
    );
}
