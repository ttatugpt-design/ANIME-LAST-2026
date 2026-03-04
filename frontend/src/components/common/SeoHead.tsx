import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface SeoHeadProps {
    title: string;
    description: string;
    image?: string;
    type?: "website" | "article" | "video.movie" | "video.episode" | "video.tv_show";
    keywords?: string;
    lang: string;
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    authors?: string[];
    schema?: any; // JSON-LD Structured Data
    video?: {
        duration?: string;
        releaseDate?: string;
        writer?: string;
        director?: string;
        actor?: string;
    };
}

export default function SeoHead({
    title,
    description,
    image,
    type = "website",
    keywords,
    lang,
    publishedTime,
    modifiedTime,
    section,
    authors,
    schema,
    video
}: SeoHeadProps) {
    const location = useLocation();
    const origin = window.location.origin;

    // Remove language prefix from path to get the clean slug
    // e.g. /ar/watch/slug -> /watch/slug
    const cleanPath = location.pathname.replace(/^\/(ar|en)/, '');

    // Construct URLs
    const canonicalUrl = `${origin}/${lang}${cleanPath}`;
    const arUrl = `${origin}/ar${cleanPath}`;
    const enUrl = `${origin}/en${cleanPath}`;

    // x-default should point to a neutral version or the default language (using ar as default here)
    const xDefaultUrl = `${origin}/ar${cleanPath}`;

    // Locale Logic
    const locale = lang === 'ar' ? 'ar_AR' : 'en_US';
    const alternateLocale = lang === 'ar' ? 'en_US' : 'ar_AR';

    return (
        <Helmet htmlAttributes={{ lang: lang, dir: lang === 'ar' ? 'rtl' : 'ltr' }}>
            {/* Standard Metadata */}
            <title>{title}</title>
            <meta name="title" content={title} />
            <meta name="description" content={description?.slice(0, 160)} />
            {keywords && <meta name="keywords" content={keywords} />}
            <link rel="canonical" href={canonicalUrl} />

            {/* Hreflang Tags - CRITICAL for Multi-language SEO */}
            <link rel="alternate" hrefLang="ar" href={arUrl} />
            <link rel="alternate" hrefLang="en" href={enUrl} />
            <link rel="alternate" hrefLang="x-default" href={xDefaultUrl} />

            {/* Open Graph / Facebook / WhatsApp */}
            <meta property="og:site_name" content="AnimeLast" />
            <meta property="og:type" content={type} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description?.slice(0, 160)} />
            {image && <meta property="og:image" content={image} />}
            {image && <meta property="og:image:width" content="1200" />}
            {image && <meta property="og:image:height" content="630" />}
            <meta property="og:locale" content={locale} />
            <meta property="og:locale:alternate" content={alternateLocale} />

            {/* Article/Video Specific Meta */}
            {publishedTime && <meta property="article:published_time" content={publishedTime} />}
            {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
            {section && <meta property="article:section" content={section} />}
            {authors?.map((author, index) => (
                <meta key={index} property="article:author" content={author} />
            ))}

            {/* Video Specific Meta */}
            {type.startsWith('video') && video && (
                <>
                    {video.duration && <meta property="video:duration" content={video.duration} />}
                    {video.releaseDate && <meta property="video:release_date" content={video.releaseDate} />}
                    {video.writer && <meta property="video:writer" content={video.writer} />}
                    {video.director && <meta property="video:director" content={video.director} />}
                    {video.actor && <meta property="video:actor" content={video.actor} />}
                </>
            )}

            {/* Twitter Summary Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description?.slice(0, 160)} />
            {image && <meta name="twitter:image" content={image} />}

            {/* JSON-LD Structured Data */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
}
