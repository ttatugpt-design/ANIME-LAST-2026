import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useNavigate, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import api from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function RegisterForm() {
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const lang = i18n.language
    const isRtl = lang === 'ar'

    // Schema with validation
    const formSchema = z.object({
        name: z.string().min(2, {
            message: lang === 'ar' ? "الاسم يجب أن يكون حرفين على الأقل" : "Name must be at least 2 characters.",
        }),
        email: z.string().email({
            message: lang === 'ar' ? "بريد إلكتروني غير صالح" : "Invalid email address.",
        }),
        password: z.string().min(6, {
            message: lang === 'ar' ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters.",
        }),
        confirmPassword: z.string()
    }).refine((data) => data.password === data.confirmPassword, {
        message: lang === 'ar' ? "كلمات المرور غير متطابقة" : "Passwords do not match",
        path: ["confirmPassword"],
    })

    const setAccessToken = useAuthStore((state) => state.setAccessToken)
    const setUser = useAuthStore((state) => state.setUser)
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            // Adjust endpoint if different for your backend
            const response = await api.post("/auth/register", {
                name: values.name,
                email: values.email,
                password: values.password
            })

            // Assume register returns token/user similar to login, or auto-logins
            if (response.data.access_token) {
                setAccessToken(response.data.access_token)
                setUser(response.data.user)
                toast.success(lang === 'ar' ? "تم التسجيل بنجاح" : "Registered successfully")

                const targetLang = i18n.language || 'en';
                window.location.assign(`/${targetLang}`);
            } else {
                // If registration requires email verification or manual login
                toast.success(lang === 'ar' ? "تم إنشاء الحساب بنجاح، يرجى تسجيل الدخول" : "Account created successfully, please login")
                navigate(`/${lang}/auth/login`)
            }

        } catch (error: any) {
            const errorMessage = error.response?.data?.error || (lang === 'ar' ? "فشل التسجيل. يرجى المحاولة مرة أخرى." : "Registration failed. Please try again.");
            toast.error(errorMessage);
            console.error(error);
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg">
                                        {lang === 'ar' ? 'الاسم' : 'Name'}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={lang === 'ar' ? "الاسم الكامل" : "Full Name"}
                                            {...field}
                                            disabled={isLoading}
                                            className="rounded-none h-14 text-lg border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-red-500" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg">
                                        {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="m@example.com"
                                            {...field}
                                            disabled={isLoading}
                                            className="rounded-none h-14 text-lg border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-red-500" />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-lg">
                                            {lang === 'ar' ? 'كلمة المرور' : 'Password'}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                {...field}
                                                disabled={isLoading}
                                                className="rounded-none h-14 text-lg border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-red-500" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-lg">
                                            {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                {...field}
                                                disabled={isLoading}
                                                className="rounded-none h-14 text-lg border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-red-500" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button
                            className="w-full h-14 rounded-none text-xl font-bold mt-4 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-lg"
                            type="submit"
                            disabled={isLoading}
                        >
                            <Loader2 className="w-10 h-10 animate-spin text-white" />
                            {lang === 'ar' ? 'إنشاء حساب' : 'Create Account'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 mt-6 p-0 text-center">
                <div className="text-muted-foreground text-lg">
                    {lang === 'ar' ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
                    <Link
                        to={`/${lang}/auth/login`}
                        className="text-primary hover:underline font-bold"
                    >
                        {lang === 'ar' ? "سجل دخول" : "Login"}
                    </Link>
                </div>
            </CardFooter>
        </Card>
    )
}
