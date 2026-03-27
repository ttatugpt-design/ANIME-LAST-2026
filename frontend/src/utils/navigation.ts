import { slugify } from "./slug";

export const getDetailsUrl = (item: any, lang: string): string => {
    if (!item) return `/${lang}/animes`;

    const animeObj = item.anime || item.series || item;
    const title = lang === 'ar' 
        ? (animeObj.title || item.title) 
        : (animeObj.title_en || item.title_en || item.title || animeObj.title);
    
    const slug = slugify(title);
    const id = item.id || animeObj.id;

    if (item.type?.toLowerCase() === 'manga' || animeObj.type?.toLowerCase() === 'manga') {
        return `/${lang}/mangas/${id}/${slug}`;
    }

    return `/${lang}/animes/${id}/${slug}`;
};
