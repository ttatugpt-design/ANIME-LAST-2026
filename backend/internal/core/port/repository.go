package port

import "backend/internal/core/domain"

type UserRepository interface {
	CreateUser(user *domain.User) error
	GetByEmail(email string) (*domain.User, error)
	GetUserByName(name string) (*domain.User, error)
	GetUserByID(id uint) (*domain.User, error)
	GetAllUsers(limit int) ([]domain.User, error)
	UpdateUser(user *domain.User) error
	DeleteUser(id uint) error
	SearchUsers(query string) ([]domain.User, error)
	CountComments(userID uint) (int64, error)
	CountReplies(userID uint) (int64, error)
	CountLikes(userID uint) (int64, error)
	GetCommentsByUserID(userID uint) ([]domain.Comment, error)
	GetLikedCommentsByUserID(userID uint) ([]domain.Comment, error)
	GetCommentsPaginated(userID uint, limit, offset int) ([]domain.Comment, error)
	GetRepliesPaginated(userID uint, limit, offset int) ([]domain.Comment, error)
	GetLikedCommentsPaginated(userID uint, limit, offset int) ([]domain.Comment, error)

	// Friendship
	CreateFriendship(f *domain.Friendship) error
	UpdateFriendship(f *domain.Friendship) error
	DeleteFriendship(id uint) error
	GetFriendship(user1, user2 uint) (*domain.Friendship, error)
	GetFriends(userID uint) ([]domain.User, error)
	GetPendingRequests(userID uint) ([]domain.Friendship, error)

	// Blocking
	CreateBlock(b *domain.Block) error
	DeleteBlock(blockerID, blockedID uint) error
	IsBlocked(user1, user2 uint) (bool, error)
	GetBlock(blockerID, blockedID uint) (*domain.Block, error)
}

type RoleRepository interface {
	GetRoleByName(name string) (*domain.Role, error)
	GetRoleByID(id uint) (*domain.Role, error)
	GetAllRoles() ([]domain.Role, error)
	CreateRole(role *domain.Role) error
	UpdateRole(role *domain.Role) error
	DeleteRole(id uint) error
	SearchRoles(query string) ([]domain.Role, error)
}

type PermissionRepository interface {
	GetPermissionByID(id uint) (*domain.Permission, error)
	GetAllPermissions() ([]domain.Permission, error)
	CreatePermission(perm *domain.Permission) error
	UpdatePermission(perm *domain.Permission) error
	DeletePermission(id uint) error
	SearchPermissions(query string) ([]domain.Permission, error)
}

type ModelRepository interface {
	CreateModel(model *domain.Model) error
	GetAllModels() ([]domain.Model, error)
	GetModelByID(id uint) (*domain.Model, error)
	UpdateModel(model *domain.Model) error
	DeleteModel(id uint) error
}

type CategoryRepository interface {
	CreateCategory(category *domain.Category) error
	GetAllCategories() ([]domain.Category, error)
	GetCategoryByID(id uint) (*domain.Category, error)
	UpdateCategory(category *domain.Category) error
	DeleteCategory(id uint) error
}

type AnimeRepository interface {
	CreateAnime(anime *domain.Anime) error
	GetAnimeByID(id uint) (*domain.Anime, error)
	GetAnimeBySlug(slug string) (*domain.Anime, error)
	GetAllAnimes(categoryID uint, letter string, search string, animeType string, order string, limit int, offset int) ([]domain.Anime, error)
	GetLatestAnimes(limit int) ([]domain.Anime, error)
	GetAnimesByType(animeType string, limit int) ([]domain.Anime, error)
	UpdateAnime(anime *domain.Anime) error
	DeleteAnime(id uint) error
	SearchAnimes(query string) ([]domain.Anime, error)
	CountAnimes(categoryID uint, letter string, search string, animeType string) (int64, error)
}

type TypeRepository interface {
	CreateType(t *domain.Type) error
	GetTypeByID(id uint) (*domain.Type, error)
	GetAllTypes() ([]domain.Type, error)
	UpdateType(t *domain.Type) error
	DeleteType(id uint) error
}

type SeasonRepository interface {
	CreateSeason(s *domain.Season) error
	GetSeasonByID(id uint) (*domain.Season, error)
	GetAllSeasons() ([]domain.Season, error)
	UpdateSeason(s *domain.Season) error
	DeleteSeason(id uint) error
}

type StudioRepository interface {
	CreateStudio(s *domain.Studio) error
	GetStudioByID(id uint) (*domain.Studio, error)
	GetAllStudios() ([]domain.Studio, error)
	UpdateStudio(s *domain.Studio) error
	DeleteStudio(id uint) error
}

type LanguageRepository interface {
	CreateLanguage(l *domain.Language) error
	GetLanguageByID(id uint) (*domain.Language, error)
	GetAllLanguages() ([]domain.Language, error)
	UpdateLanguage(l *domain.Language) error
	DeleteLanguage(id uint) error
}

type HistoryRepository interface {
	CreateHistory(history *domain.History) error
	GetUserHistory(userID uint, limit int, offset int) ([]domain.History, error)
	GetUserHistoryByType(userID uint, activityType domain.ActivityType, limit int) ([]domain.History, error)
	DeleteUserHistory(userID uint) error
	DeleteOldHistory(days int) error
	CountHistory(userID uint) (int64, error)
}

type WatchLaterRepository interface {
	AddToWatchLater(entry *domain.WatchLater) error
	RemoveFromWatchLater(userID uint, animeID *uint, episodeID *uint) error
	GetWatchLaterByUser(userID uint) ([]domain.WatchLater, error)
	IsWatchLater(userID uint, animeID *uint, episodeID *uint) (bool, error)
	CountWatchLater(userID uint) (int64, error)
}

type EpisodeRepository interface {
	CreateEpisode(episode *domain.Episode) error
	GetEpisodeByID(id uint) (*domain.Episode, error)
	GetAllEpisodes(categoryID uint, letter string, search string, animeType string, order string, limit int, offset int) ([]domain.Episode, error)
	CountEpisodes(categoryID uint, letter string, search string, animeType string) (int64, error)
	UpdateEpisode(episode *domain.Episode) error
	DeleteEpisode(id uint) error
	GetEpisodesByAnimeID(animeID uint) ([]domain.Episode, error)
	GetLatestEpisodes(limit, offset int) ([]domain.Episode, error)
	SearchEpisodes(query string) ([]domain.Episode, error)
	IncrementEpisodeViews(episodeID uint) error
	UpdateEpisodesStatusByAnimeID(animeID uint, isPublished bool) error
}

type QuickNewsRepository interface {
	Create(news *domain.QuickNews) error
	GetByID(id uint) (*domain.QuickNews, error)
	GetAll() ([]domain.QuickNews, error)
	Update(news *domain.QuickNews) error
	Delete(id uint) error
}

type NotificationRepository interface {
	Create(notification *domain.Notification) error
	GetUserNotifications(userID uint, limit int) ([]domain.Notification, error)
	MarkRead(id uint, userID uint) error
	MarkAllRead(userID uint) error
	Delete(id uint, userID uint) error
	DeleteAll(userID uint) error
	DeleteSelected(userID uint, ids []uint) error
	CountUnread(userID uint) (int64, error)
	DeleteMutualFriendNotifications(user1, user2 uint) error
}

type MessageRepository interface {
	SaveMessage(msg *domain.Message) error
	GetMessageByID(id uint) (*domain.Message, error)
	GetChatHistory(user1, user2 uint, limit, offset int) ([]domain.Message, error)
	GetRecentConversations(userID uint) ([]domain.Message, error)
	MarkAsRead(senderID, receiverID uint) error
	CountUnreadBetweenUsers(senderID, receiverID uint) (int64, error)
	UpdateMessage(msg *domain.Message) error
	DeleteMessage(id uint) error
	SaveReaction(reaction *domain.MessageReaction) error
	DeleteReaction(messageID, userID uint) error
	DeleteAllMessagesBetweenUsers(user1, user2 uint) error
}
type CountryRepository interface {
	CreateCountry(country *domain.Country) error
	GetCountryByID(id uint) (*domain.Country, error)
	GetAllCountries(search string) ([]domain.Country, error)
	UpdateCountry(country *domain.Country) error
	DeleteCountry(id uint) error
	SearchCountries(query string) ([]domain.Country, error)
}

type ServerRepository interface {
	CreateServer(server *domain.Server) error
	GetServerByID(id uint) (*domain.Server, error)
	GetAllServers(search string) ([]domain.Server, error)
	UpdateServer(server *domain.Server) error
	DeleteServer(id uint) error
}

type ChapterRepository interface {
	CreateChapter(chapter *domain.Chapter) error
	GetChapterByID(id uint) (*domain.Chapter, error)
	GetAllChapters(animeID uint, search string, limit int, offset int) ([]domain.Chapter, error)
	CountChapters(animeID uint, search string) (int64, error)
	UpdateChapter(chapter *domain.Chapter) error
	DeleteChapter(id uint) error
	GetChaptersByAnimeID(animeID uint) ([]domain.Chapter, error)
	IncrementChapterViews(chapterID uint) error
}

type EmbedAccountRepository interface {
	CreateEmbedAccount(acc *domain.EmbedAccount) error
	GetEmbedAccountByID(id uint) (*domain.EmbedAccount, error)
	GetAllEmbedAccounts() ([]domain.EmbedAccount, error)
	UpdateEmbedAccount(acc *domain.EmbedAccount) error
	DeleteEmbedAccount(id uint) error
}
