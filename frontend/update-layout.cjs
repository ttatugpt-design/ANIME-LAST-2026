const fs = require('fs');

const filePath = 'C:/Users/Abdo/Desktop/anime - last/ANIME-GOLANG/frontend/src/pages/animes/AnimeDetailsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// We are replacing lines 386 to 672 (inclusive, zero-indexed 385 to 671)
const lines = content.split('\n');

const newLayout = `            {/* Main Layout - Redesigned like a Post */}
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-0 lg:gap-4 max-w-[2000px] mx-auto w-full pt-[100px] pb-8 px-4 relative z-10">
                
                {isLoading ? (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-[3px] animate-fade-in">
                        <CentralSpinner />
                    </div>
                ) : (error || !anime) ? (
                    <div className="lg:col-span-12 min-h-screen flex flex-col items-center justify-center text-black dark:text-white p-4">
                        <h1 className="text-4xl font-bold mb-4">{lang === 'ar' ? 'عفواً، لم يتم العثور على الأنمي' : 'Oops, Anime Not Found'}</h1>
                        <Link to="/animes" className="text-blue-500 hover:text-blue-600 transition-all font-bold">
                            {lang === 'ar' ? 'العودة لتصفح الأنمي' : 'Back to Browse'}
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* MAIN CONTENT (Post-like structure) */}
                        <div className="lg:col-span-9 flex flex-col min-w-0 pb-10">
                            <div className="w-full max-w-4xl mx-auto bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-sm">
                                
                                {/* DVD Cover Image */}
                                <div className="w-[160px] md:w-[220px] aspect-[2/3] mx-auto rounded-xl overflow-hidden shadow-2xl shadow-black/20 dark:shadow-white/5 mb-6 relative group">
                                    <img 
                                        src={getImageUrl(anime.cover || anime.banner || anime.image)} 
                                        alt={animeTitle}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-xl pointer-events-none"></div>
                                </div>

                                {/* Metadata & Title */}
                                <div className="text-center space-y-4">
                                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight font-cairo">
                                        {renderEmojiContent(animeTitle)}
                                    </h1>
                                    
                                    <div className="flex flex-wrap items-center justify-center gap-3 text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-white/10">14+</span>
                                        {anime.type && <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-white/10">{anime.type}</span>}
                                        {anime.status && <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-white/10">{anime.status}</span>}
                                        <div className="flex items-center gap-1 text-yellow-500 px-2 py-1 bg-yellow-50 dark:bg-yellow-500/10 rounded border border-yellow-200 dark:border-yellow-500/20">
                                            <Star className="w-4 h-4 fill-current" />
                                            <span>{anime.rating || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
                                        {renderEmojiContent(animeDescription || 'No description available.')}
                                    </p>
                                </div>

                                {/* Actions Row */}
                                <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-white/5">
                                    <button
                                        onClick={handleWatchLaterToggle}
                                        disabled={isWatchLaterLoading}
                                        className={cn(
                                            "flex items-center justify-center px-6 py-2.5 rounded-full transition-all duration-300 shadow-sm border font-bold text-sm gap-2 active:scale-95",
                                            isSaved(Number(anime?.id), null)
                                                ? "bg-black border-black text-white dark:bg-white dark:border-white dark:text-black"
                                                : "bg-white border-gray-200 text-black dark:bg-black dark:border-white/20 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                                        )}
                                    >
                                        {isWatchLaterLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : isSaved(Number(anime?.id), null) ? (
                                            <>
                                                <BookmarkCheck className="w-5 h-5 fill-current" />
                                                {lang === 'ar' ? 'محفوظة' : 'Saved'}
                                            </>
                                        ) : (
                                            <>
                                                <Bookmark className="w-5 h-5" />
                                                {lang === 'ar' ? 'للمشاهدة لاحقاً' : 'Watch Later'}
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => {
                                            setSharingEpisode(null);
                                            setIsShareModalOpen(true);
                                        }}
                                        className="flex items-center justify-center px-6 py-2.5 rounded-full transition-all duration-300 shadow-sm border font-bold text-sm gap-2 active:scale-95 bg-white border-gray-200 text-black dark:bg-black dark:border-white/20 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                                    >
                                        <Share2 className="w-5 h-5" />
                                        {lang === 'ar' ? 'مشاركة' : 'Share'}
                                    </button>
                                </div>

                                {/* Sub Tabs (Seasons / Comments) */}
                                <div className="flex justify-center gap-4 mt-8">
                                    {[
                                        { id: 'seasons', label: lang === 'ar' ? 'المواسم' : 'Seasons', icon: <Library className="w-4 h-4" /> },
                                        { id: 'comments', label: lang === 'ar' ? 'التعليقات' : 'Comments', icon: <MessageCircle className="w-4 h-4" /> },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={cn(
                                                "flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all",
                                                activeTab === tab.id
                                                    ? "bg-gray-100 dark:bg-white/10 text-black dark:text-white"
                                                    : "bg-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                                            )}
                                        >
                                            {tab.icon}
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Active Tab Content */}
                                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5 min-h-[400px]">
                                    {activeTab === 'seasons' && (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            {animeCollections && animeCollections.length > 0 ? (
                                                <div className="flex flex-col gap-10">
                                                    {animeCollections.map((col: any) => (
                                                        <div key={col.id || col.ID} className="space-y-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-6 w-1.5 bg-black dark:bg-white rounded-full"></div>
                                                                <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                                    {lang === 'ar' ? col.title_ar : col.title_en}
                                                                </h3>
                                                            </div>
                                                            <div className="flex flex-col gap-4">
                                                                {col.animes?.map((relatedAnime: any) => (
                                                                    <SeasonListItem 
                                                                        key={relatedAnime.id}
                                                                        anime={relatedAnime}
                                                                        lang={lang}
                                                                        currentId={Number(id)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-20 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                                                    <Library className="w-10 h-10 text-gray-300 mx-auto mb-4 opacity-50" />
                                                    <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-sm">
                                                        {lang === 'ar' ? 'لا توجد مواسم مرتبطة حالياً' : 'No related seasons found'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'comments' && (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <CommentsSection 
                                                itemId={Number(anime.id)} 
                                                type="anime" 
                                                inputPosition="top"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDEBAR (Episodes Strip) */}
                        <div className="lg:col-span-3 w-full lg:sticky top-[100px] h-auto lg:h-[calc(100vh-100px)] lg:overflow-y-auto custom-scrollbar z-30 lg:px-2 pb-4">
                            <div className="flex items-center justify-between px-2 pb-2 mb-2 bg-white dark:bg-black lg:bg-transparent rounded-xl p-4 lg:p-0">
                                <h3 className="font-black text-gray-900 dark:text-gray-400 text-lg md:text-xl">
                                    {lang === 'ar' ? 'حلقات الأنمي' : 'Anime Episodes'}
                                </h3>
                                <div className="flex items-center gap-2 relative group">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
                                            className="w-32 md:w-48 pl-9 pr-3 py-1.5 bg-gray-100 dark:bg-white/5 border border-transparent rounded-lg text-sm font-bold text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#111] shadow-sm rounded-xl overflow-hidden p-1 space-y-1 border border-gray-100 dark:border-white/5">
                                {displayedEpisodes.length > 0 ? (
                                    <>
                                        {displayedEpisodes.map((ep: any) => {
                                            const epItemTitle = lang === 'ar' ? (ep.title || \`الحلقة \${ep.episode_number}\`) : (ep.title_en || \`Episode \${ep.episode_number}\`);
                                            const epUrl = \`/\${lang}/watch/\${anime?.id || ep.anime_id}/\${ep.episode_number}/\${slugify(lang === 'ar' ? anime?.title : (anime?.title_en || anime?.title))}\`;

                                            return (
                                                <div
                                                    key={ep.id}
                                                    className="group relative flex items-start gap-3 p-3 transition-all rounded-xl hover:bg-gray-50 dark:hover:bg-white/5"
                                                >
                                                    {/* Large Number + Hashtag */}
                                                    <div className="text-2xl md:text-3xl font-black italic tracking-tighter transition-colors shrink-0 w-10 text-center pt-1 text-gray-300 dark:text-[#333] group-hover:text-gray-400 dark:group-hover:text-[#444]">
                                                        #{ep.episode_number}
                                                    </div>

                                                    {/* Right side wrapper: Image + Title */}
                                                    <div className="flex-1 flex flex-col min-w-0 relative">
                                                        <Link
                                                            to={epUrl}
                                                            className="flex flex-col gap-2 w-full group/link"
                                                        >
                                                            {/* Image Section */}
                                                            <div className="w-full aspect-video relative overflow-hidden shadow-sm rounded-xl bg-neutral-800">
                                                                <img
                                                                    src={getImageUrl(ep.thumbnail || ep.banner || anime?.cover)}
                                                                    alt={epItemTitle}
                                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/link:scale-105"
                                                                    loading="lazy"
                                                                />
                                                                <div className="absolute inset-0 bg-black/20 group-hover/link:bg-black/40 transition-colors flex items-center justify-center">
                                                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/link:opacity-100 transition-all duration-300 transform scale-75 group-hover/link:scale-100">
                                                                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                                                    </div>
                                                                </div>
                                                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-black px-1.5 py-0.5 rounded border border-white/10 uppercase">
                                                                    {ep.duration ? \`\${ep.duration}m\` : '24m'}
                                                                </div>
                                                            </div>

                                                            {/* Content Section (Title Under Image) */}
                                                            <div className="w-full px-1">
                                                                <h4 className="text-[13px] md:text-sm font-black line-clamp-2 transition-colors leading-tight text-gray-900 dark:text-gray-100 group-hover/link:text-blue-500">
                                                                    {epItemTitle}
                                                                </h4>
                                                                <p className="text-[11px] mt-1 line-clamp-1 font-bold text-gray-500">
                                                                    {lang === 'ar' ? \`حلقة \${ep.episode_number}\` : \`Episode \${ep.episode_number}\`}
                                                                </p>
                                                            </div>
                                                        </Link>

                                                        {/* Hover Actions */}
                                                        <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            <WatchLaterButton
                                                                animeId={Number(anime?.id)}
                                                                episodeId={Number(ep.id)}
                                                                episodeTitle={epItemTitle}
                                                                episodeNumber={ep.episode_number}
                                                                episodeImage={getImageUrl(ep.thumbnail || ep.banner || anime?.cover)}
                                                                variant="default"
                                                                className="p-1.5 h-8 w-8 rounded-full hover:bg-white dark:hover:bg-black/80 text-white hover:text-gray-900 dark:hover:text-white bg-black/50 border border-white/10 backdrop-blur-sm transition-all"
                                                                showLabel={false}
                                                            />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setSharingEpisode(ep);
                                                                    setIsShareModalOpen(true);
                                                                }}
                                                                className="p-1.5 h-8 w-8 rounded-full hover:bg-white dark:hover:bg-black/80 text-white hover:text-gray-900 dark:hover:text-white bg-black/50 border border-white/10 backdrop-blur-sm transition-all flex items-center justify-center"
                                                                title={lang === 'ar' ? 'مشاركة' : 'Share'}
                                                            >
                                                                <Share2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        <AnimatePresence>
                                            {(isFetchingNextPage || hasNextPage) && (
                                                <motion.div 
                                                    ref={loadMoreRef} 
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="py-6 flex flex-col items-center justify-center bg-transparent overflow-hidden rounded-xl mt-2 mx-1"
                                                >
                                                    <CentralSpinner size="large" className="min-h-0 !w-auto !h-auto" color="#FF3D00" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                ) : (
                                    <p className="text-center text-gray-500 py-6 text-sm">
                                        {lang === 'ar' ? 'لا توجد حلقات مطابقة.' : 'No episodes found.'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>`;

// Replace lines 385 to 671 inclusive
lines.splice(385, 287, newLayout);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Successfully updated the layout!');
