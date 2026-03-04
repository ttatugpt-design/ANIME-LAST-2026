export const slugify = (text: string | null | undefined): string => {
    if (!text) return "";

    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(/[^\w\u0600-\u06FF-]+/g, "") // Remove all non-word chars (except - and Arabic chars)
        .replace(/--+/g, "-") // Replace multiple - with single -
        .replace(/^-+/, "") // Trim - from start of text
        .replace(/-+$/, ""); // Trim - from end of text
};
