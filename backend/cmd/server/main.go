package main

import (
	"backend/config"
	"backend/internal/adapters/handler"
	"backend/internal/adapters/repository"
	ws "backend/internal/adapters/ws"
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"backend/internal/middleware"
	"backend/internal/migration"
	"backend/internal/seeder"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Check if DB file exists to determine if we need to seed
	// We check BEFORE connecting because connecting might create the file (empty).
	_, err = os.Stat(cfg.DBUrl)
	isNewDB := os.IsNotExist(err)

	repo, err := repository.NewSQLiteRepository(cfg.DBUrl)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto-seed if it was a new DB OR if the DB is empty
	if isNewDB {
		log.Println("New database detected. Running auto-seeding...")
		seeder.SeedAll(repo.DB())
	} else {
		// Even if file existed, check if it has data. This protects against "mixed data" issues on Railway
		var animeCount int64
		repo.DB().Table("animes").Count(&animeCount)
		if animeCount == 0 {
			log.Println("Database existed but is empty. Running auto-seeding...")
			seeder.SeedAll(repo.DB())
		} else {
			// Ensure countries are seeded even if DB already existed
			log.Println("Seeding countries for existing database...")
			seeder.SeedCountries(repo.DB())
		}
	}

	// ALWAYS run localhost cleanup migration (safe to run multiple times)
	log.Println("Running localhost URL cleanup migration...")
	if err := migration.CleanLocalhostURLs(repo.DB()); err != nil {
		log.Printf("Warning: Failed to clean localhost URLs: %v", err)
	}

	// Create reports table migration (safe to run multiple times)
	log.Println("Running reports table migration...")
	if err := migration.CreateReportsTable(repo.DB()); err != nil {
		log.Printf("Warning: Failed to create reports table: %v", err)
	}

	// Auto-migrate
	repo.DB().AutoMigrate(&domain.Settings{}, &domain.Message{}, &domain.MessageReaction{}, &domain.EmbedAccount{})

	// Repositories (Special cases that need DB)
	notifRepo := repository.NewNotificationRepository(repo.DB())

	// WebSocket Hub
	wsHub := ws.NewHub()
	go wsHub.Run()

	// Determine root directory robustly. 
	// In production (Railway/Docker), we assume the app runs in the project root.
	// In dev, we might be in backend/cmd/server/.
	cwd, _ := os.Getwd()
	log.Printf("Current working directory: %s", cwd)

	// Determine if we are in the backend subdirectory or root
	baseDir := cwd
	if filepath.Base(cwd) == "server" && strings.Contains(cwd, filepath.Join("backend", "cmd", "server")) {
		// We are in backend/cmd/server, root is 3 levels up
		baseDir = filepath.Dir(filepath.Dir(filepath.Dir(cwd)))
	} else if filepath.Base(cwd) == "backend" {
		// We are in backend/, root is 1 level up
		baseDir = filepath.Dir(cwd)
	}

	log.Printf("Determined Base Project Directory: %s", baseDir)

	// Helper for absolute paths inside the project
	absPath := func(parts ...string) string {
		p := filepath.Join(append([]string{baseDir}, parts...)...)
		// Clean the path to handle ../ or ./
		p = filepath.Clean(p)
		if _, err := os.Stat(p); err == nil {
			log.Printf("Path Verified: %s", p)
		} else {
			log.Printf("Warning: Path missing: %s", p)
		}
		return p
	}

	// Services
	authService := service.NewAuthService(repo, repo, cfg)
	userService := service.NewUserService(repo, repo, notifRepo, repo, repo, wsHub)
	roleService := service.NewRoleService(repo, repo)
	permService := service.NewPermissionService(repo)
	typeService := service.NewTypeService(repo)
	seasonService := service.NewSeasonService(repo)
	studioService := service.NewStudioService(repo)
	languageService := service.NewLanguageService(repo)
	animeService := service.NewAnimeService(repo, repo)
	episodeService := service.NewEpisodeService(repo)
	chapterService := service.NewChapterService(repo)
	modelService := service.NewModelService(repo)
	categoryService := service.NewCategoryService(repo)
	quickNewsService := service.NewQuickNewsService(repo)
	countryService := service.NewCountryService(repo)
	serverService := service.NewServerService(repo)

	exportService := service.NewExportService(cfg.BlenderPath, cfg.ExportDir, cfg.ExportTimeout)
	watchLaterService := service.NewWatchLaterService(repo)
	historyService := service.NewHistoryService(repo)

	// Handlers
	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	roleHandler := handler.NewRoleHandler(roleService)
	permHandler := handler.NewPermissionHandler(permService)
	typeHandler := handler.NewTypeHandler(typeService)
	seasonHandler := handler.NewSeasonHandler(seasonService)
	studioHandler := handler.NewStudioHandler(studioService)
	languageHandler := handler.NewLanguageHandler(languageService)
	animeHandler := handler.NewAnimeHandler(animeService)
	// Create repositories first
	commentRepo := repository.NewCommentRepository(repo.DB())
	// notifRepo moved up
	episodeLikeRepo := repository.NewEpisodeLikeRepository(repo.DB())
	reportRepo := repository.NewReportRepository(repo.DB())
	messageRepo := repository.NewMessageRepository(repo.DB())

	// Then create handlers that depend on them
	episodeHandler := handler.NewEpisodeHandler(episodeService, repo, episodeLikeRepo, commentRepo)
	chapterHandler := handler.NewChapterHandler(chapterService)
	modelHandler := handler.NewModelHandler(modelService)
	categoryHandler := handler.NewCategoryHandler(categoryService)

	exportHandler := handler.NewExportHandler(exportService)
	uploadHandler := handler.NewUploadHandler()
	searchHandler := handler.NewSearchHandler(repo, repo, repo)
	watchLaterHandler := handler.NewWatchLaterHandler(watchLaterService)
	historyHandler := handler.NewHistoryHandler(historyService)

	// Community Posts Services & Handlers
	// Note: We use repo for port.PostRepository and uploadHandler/nil for file service depending on how uploads are handled
	postService := service.NewPostService(repo)
	postHandler := handler.NewPostHandler(postService, repo, notifRepo, wsHub) // Assuming file service logic will be integrated or ignored for MVP

	// Comments & Notifications Handlers
	commentHandler := handler.NewCommentHandler(commentRepo, notifRepo, repo, historyService, wsHub)
	notifHandler := handler.NewNotificationHandler(notifRepo)
	wsHandler := handler.NewWSHandler(wsHub)
	reportHandler := handler.NewReportHandler(reportRepo)
	analyticsHandler := handler.NewAnalyticsHandler(repo)
	settingsHandler := handler.NewSettingsHandler(repo.DB())
	quickNewsHandler := handler.NewQuickNewsHandler(quickNewsService)
	countryHandler := handler.NewCountryHandler(countryService)
	serverHandler := handler.NewServerHandler(serverService)
	sitemapHandler := handler.NewSitemapHandler(repo.DB())

	messageService := service.NewMessageService(messageRepo, notifRepo, repo, wsHub)
	messageHandler := handler.NewMessageHandler(messageService)

	embedAccountService := service.NewEmbedAccountService(repo)
	embedAccountHandler := handler.NewEmbedAccountHandler(embedAccountService)

	doodstreamHandler := handler.NewDoodstreamHandler(episodeService, serverService, embedAccountService)
	mirroredHandler := handler.NewMirroredHandler(episodeService, serverService, embedAccountService, repo.DB())
	resumableHandler := handler.NewResumableUploadHandler()
	scraperHandler := handler.NewScraperHandler(repo.DB(), baseDir)

	r := gin.Default()
	r.MaxMultipartMemory = 32 << 20 // 32MB instead of 1GB. Files larger than this will be cached into OS temporary disk space instead of RAM!

	// SEO Sitemap
	r.GET("/sitemap.xml", sitemapHandler.GetSitemap)

	// CORS Setup - PERMISSIVE MODE (Fix for network access)
	r.Use(cors.New(cors.Config{
		// AllowAllOrigins: true, // CANNOT use '*' with AllowCredentials: true
		AllowOriginFunc:  func(origin string) bool { return true }, // Echoes the exact origin back
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	/*
		// Specific CORS (Commented out for now)
		rawOrigins := strings.Split(cfg.AllowOrigins, ",")
		var allowOrigins []string
		for _, o := range rawOrigins {
			allowOrigins = append(allowOrigins, strings.TrimSpace(o))
		}
		log.Printf("CORS: Allowing origins: %v", allowOrigins)

		r.Use(cors.New(cors.Config{
			AllowOrigins:     allowOrigins,
			AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
			ExposeHeaders:    []string{"Content-Length"},
			AllowCredentials: true,
		}))
	*/

	// Register SVG mime type explicitly just in case Windows registry is broken
	mime.AddExtensionType(".svg", "image/svg+xml")

	backupHandler := handler.NewBackupHandler(repo, cfg)

	r.Static("/uploads", absPath("backend", "uploads"))
	r.Static("/flag-icons", absPath("backend", "uploads", "flag-icons"))
	r.Static("/assets", absPath("frontend", "dist", "client", "assets"))
	r.Static("/custom-emojis", absPath("emoji"))
	r.StaticFile("/favicon.ico", absPath("frontend", "dist", "client", "favicon.ico"))
	r.StaticFile("/vite.svg", absPath("frontend", "dist", "client", "vite.svg"))
	r.StaticFile("/favicon.png", absPath("frontend", "dist", "client", "favicon.png"))

	// SSR Setup
	ssrHandler := handler.NewSSRHandler()
	// Optional: Start Node server automatically (or rely on external process)
	ssrHandler.StartNodeServer()

	// SSR Handler: Serve SSR for unknown routes (except /api and static folders)
	r.NoRoute(func(c *gin.Context) {
		p := c.Request.URL.Path
		// Do not serve SSR for missing API, uploads, assets or image files
		if strings.HasPrefix(p, "/api") ||
			strings.HasPrefix(p, "/uploads") ||
			strings.HasPrefix(p, "/assets") ||
			strings.HasPrefix(p, "/custom-emojis") ||
			strings.HasSuffix(p, ".ico") ||
			strings.HasSuffix(p, ".svg") ||
			strings.HasSuffix(p, ".png") ||
			strings.HasSuffix(p, ".jpg") ||
			strings.HasSuffix(p, ".jpeg") ||
			strings.HasSuffix(p, ".webp") {
			c.JSON(404, gin.H{"error": "Resource not found"})
			return
		}
		ssrHandler.ServeSSR(c)
	})

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.Refresh)
		}

		// Health Check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// Root Health Check for Railway (Fast response)
		r.GET("/", func(c *gin.Context) {
			// If it's a browser requesting HTML, maybe they want SSR, 
			// but for health checks, we want a 200 OK.
			// Let's check headers or just return 200 if they don't explicitly want HTML.
			if strings.Contains(c.GetHeader("Accept"), "text/html") {
				ssrHandler.ServeSSR(c)
				return
			}
			c.JSON(200, gin.H{"status": "ok", "message": "AnimeLast API is running"})
		})

		// Version Check (for deployment verification)
		versionHandler := handler.NewVersionHandler()
		api.GET("/version", versionHandler.GetVersion)

		// --- Public Routes (No Auth Required) ---
		public := api.Group("/")
		{
			// General Search
			public.GET("/search", searchHandler.Search)

			// Anime Public (Read-Only)
			animes := public.Group("/animes")
			{
				animes.GET("", animeHandler.GetAll)
				animes.GET("/latest", animeHandler.GetLatest)
				animes.GET("/type/:type", animeHandler.GetByType)
				animes.GET("/search", animeHandler.Search)
				animes.GET("/slug/:slug", animeHandler.GetBySlug)
				animes.GET("/:id", animeHandler.GetByID)
				animes.GET("/:id/servers", animeHandler.GetUniqueServers)
				animes.PATCH("/:id/server-priority", animeHandler.UpdateServerPriority)
			}

			// Episode Public (Read-Only)
			episodes := public.Group("/episodes")
			{
				episodes.GET("", episodeHandler.GetAll)
				episodes.GET("/latest", episodeHandler.GetLatest)
				episodes.GET("/search", episodeHandler.Search)
				episodes.GET("/:id", episodeHandler.GetByID)
			}

			// Chapter Public (Read-Only)
			chapters := public.Group("/chapters")
			{
				chapters.GET("", chapterHandler.GetAll)
				chapters.GET("/:id", chapterHandler.GetByID)
				chapters.GET("/anime/:animeId", chapterHandler.GetByAnimeID)
			}

			// Models Public
			models := public.Group("/models")
			models.GET("", modelHandler.GetAll)
			models.GET("/:id/download", modelHandler.Download)

			// Other Public Read-Only
			public.Group("/categories").GET("", categoryHandler.GetAll)
			public.Group("/types").GET("", typeHandler.GetAll)
			public.Group("/seasons").GET("", seasonHandler.GetAll)
			public.Group("/studios").GET("", studioHandler.GetAll)
			public.Group("/languages").GET("", languageHandler.GetAll)

			// Public export download
			public.POST("/export/sprint", exportHandler.GenerateSprint)
			public.GET("/export/download/:filename", exportHandler.Download)

			// Public Comments (Read-only)
			public.GET("/episodes/:id/comments", commentHandler.GetAllByEpisode)
			public.GET("/chapters/:id/comments", commentHandler.GetAllByChapter)
			public.GET("/comments/:id/reactions", commentHandler.GetReactions)

			// Report Issue
			public.POST("/reports", reportHandler.CreateReport)

			// Settings (Read-Only Public)
			public.GET("/settings", settingsHandler.GetSettings)
			public.GET("/quick-news", quickNewsHandler.GetAll)
			public.GET("/countries", countryHandler.GetAll)
			public.GET("/servers", serverHandler.GetAll)
			
			// Public Scraper endpoints for viewing links
			public.POST("/scraper/anime3rb-refresh", scraperHandler.RefreshAnime3rbVideo)

			// NEW: Public Users and Comments for Sidebar
			public.GET("/users", userHandler.GetAll)
			public.GET("/users/:id", userHandler.GetByID)
			public.GET("/comments", commentHandler.GetAllComments)
			public.GET("/comments/:id", commentHandler.GetByID)

			// Community Posts (Read-Only but auth-aware)
			optionalAuth := public.Group("/")
			optionalAuth.Use(middleware.OptionalAuthMiddleware(cfg))
			{
				optionalAuth.GET("/posts", postHandler.GetFeed)
				optionalAuth.GET("/posts/:id", postHandler.GetPostByIDHandler)
				optionalAuth.GET("/posts/:id/reactions", postHandler.GetPostReactions)
				optionalAuth.GET("/posts/:id/comments", postHandler.GetPostComments)
				optionalAuth.GET("/posts/comments/:id", postHandler.GetPostCommentByID)
				optionalAuth.GET("/posts/comments/:id/reactions", postHandler.GetCommentReactions)
				optionalAuth.GET("/posts/comments/:id/replies", postHandler.GetPostCommentReplies)
			}
		}

		// --- Protected Routes (Auth Required) ---
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			protected.GET("/me", func(c *gin.Context) {
				userID, _ := c.Get("user_id")
				role, _ := c.Get("role")
				c.JSON(200, gin.H{"id": userID, "role": role})
			})

			// User Profile Update
			protected.POST("/user/profile/update", userHandler.UpdateProfile)
			protected.GET("/user/stats", userHandler.GetStats)
			protected.GET("/user/interactions", userHandler.GetInteractions)

			// Friendship Routes
			friends := protected.Group("/friends")
			{
				friends.POST("/request/:id", userHandler.SendFriendRequest)
				friends.POST("/accept/:id", userHandler.AcceptFriendRequest)
				friends.DELETE("/:id", userHandler.RemoveFriend)
				friends.GET("/status/:id", userHandler.GetFriendshipStatus)
				friends.GET("/list/:id", userHandler.GetUserFriends)
				friends.GET("/requests/pending", userHandler.GetPendingRequests)
			}

			// Message Routes
			messages := protected.Group("/messages")
			{
				messages.POST("/send", messageHandler.SendMessage)
				messages.PUT("/:id", messageHandler.EditMessage)
				messages.DELETE("/:id", messageHandler.DeleteMessage)
				messages.POST("/:id/react", messageHandler.ReactToMessage)
				messages.GET("/history/:userId", messageHandler.GetChatHistory)
				messages.GET("/conversations", messageHandler.GetRecentConversations)
				messages.DELETE("/conversation/:userId", messageHandler.DeleteConversation)
			}

			// Block Routes
			protected.POST("/users/block/:id", userHandler.BlockUser)
			protected.DELETE("/users/block/:id", userHandler.UnblockUser)

			// Dashboard Routes
			dashboard := protected.Group("/dashboard")
			{
				dashboard.GET("/reports", reportHandler.GetAllReports)
				dashboard.GET("/comments", commentHandler.GetAllComments)
				dashboard.GET("/analytics/stats", analyticsHandler.GetGlobalStats)
				dashboard.GET("/analytics/top", analyticsHandler.GetTopContent)
				
				// Backup Management
				dashboard.GET("/backups", backupHandler.ListBackups)
				dashboard.GET("/backup-stats", backupHandler.GetBackupStats)
				dashboard.POST("/backups", backupHandler.CreateBackup)
				dashboard.GET("/backups/download/:filename", backupHandler.DownloadBackup)
				dashboard.DELETE("/backups/:filename", backupHandler.DeleteBackup)
				dashboard.POST("/backups/restore/:filename", backupHandler.RestoreBackup)
				dashboard.POST("/backups/upload", backupHandler.UploadAndRestore)
			}

			// Settings Update
			protected.POST("/settings/update", settingsHandler.UpdateSettings)

			// Admin/Protected Routes
			protected.Group("/users").POST("", userHandler.Create).PUT("/:id", userHandler.Update).DELETE("/:id", userHandler.Delete)
			protected.Group("/roles").GET("", roleHandler.GetAll).POST("", roleHandler.Create).PUT("/:id", roleHandler.Update).DELETE("/:id", roleHandler.Delete)
			protected.Group("/permissions").GET("", permHandler.GetAll).POST("", permHandler.Create).PUT("/:id", permHandler.Update).DELETE("/:id", permHandler.Delete)
			// protected.GET("/search", searchHandler.Search) // Search is public now

			// Write/Delete Operations for Models
			models := protected.Group("/models")
			models.POST("", modelHandler.Upload).PUT("/:id", modelHandler.Update).DELETE("/:id", modelHandler.Delete)

			protected.POST("/upload", uploadHandler.UploadFile)

			// Write Operations for Metadata
			protected.Group("/categories").POST("", categoryHandler.Create).PUT("/:id", categoryHandler.Update).DELETE("/:id", categoryHandler.Delete)
			protected.Group("/types").POST("", typeHandler.Create).PUT("/:id", typeHandler.Update).DELETE("/:id", typeHandler.Delete)
			protected.Group("/seasons").POST("", seasonHandler.Create).PUT("/:id", seasonHandler.Update).DELETE("/:id", seasonHandler.Delete)
			protected.Group("/studios").POST("", studioHandler.Create).PUT("/:id", studioHandler.Update).DELETE("/:id", studioHandler.Delete)
			protected.Group("/languages").POST("", languageHandler.Create).PUT("/:id", languageHandler.Update).DELETE("/:id", languageHandler.Delete)

			// Write Operations for Anime
			animes := protected.Group("/animes")
			animes.POST("", animeHandler.Create).PUT("/:id", animeHandler.Update).DELETE("/:id", animeHandler.Delete)
			animes.DELETE("/:id/servers", animeHandler.DeleteServersBulk)

			// Write Operations for Episodes
			episodes := protected.Group("/episodes")
			episodes.POST("", episodeHandler.Create).PUT("/:id", episodeHandler.Update).DELETE("/:id", episodeHandler.Delete)

			// Write Operations for Chapters
			chapters := protected.Group("/chapters")
			chapters.POST("", chapterHandler.Create).PUT("/:id", chapterHandler.Update).DELETE("/:id", chapterHandler.Delete)
			chapters.POST("/:id/view", chapterHandler.TrackView)

			// Watch Later Routes (Personal)
			watchLater := protected.Group("/watch-later")
			{
				watchLater.POST("", watchLaterHandler.Toggle)
				watchLater.GET("", watchLaterHandler.GetByUser)
				watchLater.GET("/check", watchLaterHandler.CheckStatus)
			}

			// History Routes (Personal)
			history := protected.Group("/history")
			{
				history.GET("", historyHandler.GetHistory)
				history.DELETE("", historyHandler.ClearHistory)
				history.POST("/track-episode", historyHandler.TrackEpisodeView)
				history.POST("/track-anime", historyHandler.TrackAnimeView)
			}

			// Comment Write Operations
			protected.POST("/episodes/:id/comments", commentHandler.Create)
			protected.POST("/chapters/:id/comments", commentHandler.Create)
			protected.POST("/comments/:id/like", commentHandler.ToggleLike)
			protected.PUT("/comments/:id", commentHandler.Update)
			protected.DELETE("/comments/:id", commentHandler.Delete)

			// Community Posts Write Operations
			protected.POST("/posts", postHandler.CreatePost)
			protected.PUT("/posts/:id", postHandler.UpdatePost)
			protected.DELETE("/posts/:id", postHandler.DeletePost)
			protected.POST("/posts/:id/like", postHandler.TogglePostLike)

			// Community Posts Comment Write Operations
			protected.POST("/posts/:id/comments", postHandler.CreatePostComment)
			protected.PUT("/posts/comments/:id", postHandler.UpdatePostComment)
			protected.DELETE("/posts/comments/:id", postHandler.DeletePostComment)
			protected.POST("/posts/comments/:id/like", postHandler.ToggleCommentLike)

			// Notification Routes (Personal)
			protected.GET("/notifications", notifHandler.GetUserNotifications)
			protected.POST("/notifications/:id/read", notifHandler.MarkRead)
			protected.POST("/notifications/read-all", notifHandler.MarkAllRead)
			protected.DELETE("/notifications/:id", notifHandler.Delete)
			protected.DELETE("/notifications/clear-all", notifHandler.DeleteAll)
			protected.POST("/notifications/delete-selected", notifHandler.DeleteSelected)
			protected.GET("/ws", wsHandler.HandleWS)

			// Episode Stats Routes
			protected.POST("/episodes/:id/view", episodeHandler.TrackView)
			protected.POST("/episodes/:id/reactions", episodeHandler.ToggleReaction)
			protected.GET("/episodes/:id/stats", episodeHandler.GetStats)

			// Doodstream Routes
			protected.POST("/doodstream/upload/:episode_id", doodstreamHandler.HandleUpload)
			protected.POST("/doodstream/push/:episode_id", doodstreamHandler.PushMergedFile)
			protected.GET("/doodstream/folders", doodstreamHandler.GetFolders)
			protected.GET("/doodstream/files", doodstreamHandler.ListFiles)
			protected.GET("/doodstream/file/info", doodstreamHandler.GetFileInfo)
			protected.POST("/doodstream/file/rename", doodstreamHandler.RenameFile)
			protected.DELETE("/doodstream/file/delete", doodstreamHandler.DeleteFile)

			// Mirrored.to Routes
			protected.POST("/mirrored/push/:episode_id", mirroredHandler.PushMergedFile)

			// Resumable Upload Routes
			protected.POST("/upload/init", resumableHandler.InitUpload)
			protected.POST("/upload/chunk", resumableHandler.UploadChunk)
			protected.GET("/upload/status/:uploadId", resumableHandler.GetStatus)
			protected.POST("/upload/complete", resumableHandler.CompleteUpload)

			// Scraper Routes
			protected.POST("/scraper/test-fetch", scraperHandler.TestFetchLink)
			protected.POST("/scraper/egydead", scraperHandler.FetchEgyDead)
			protected.POST("/scraper/egydead-batch", scraperHandler.FetchEgyDeadBatch)
			protected.POST("/scraper/anime4up", scraperHandler.FetchAnime4Up)
			protected.POST("/scraper/anime4up-batch", scraperHandler.FetchAnime4UpBatch)
			protected.POST("/scraper/ristoanime", scraperHandler.FetchRistoAnime)
			protected.POST("/scraper/ristoanime-batch", scraperHandler.FetchRistoAnimeBatch)
			protected.POST("/scraper/witanime-batch", scraperHandler.FetchWitAnimeBatch)
			protected.POST("/scraper/anime3rb-batch", scraperHandler.FetchAnime3rbBatch)
			protected.POST("/scraper/images", scraperHandler.FetchPageImages)
			protected.POST("/scraper/images-download", scraperHandler.DownloadImagesZip)
			protected.POST("/scraper/import", scraperHandler.ImportScrapedAnime)
			protected.POST("/scraper/deep-import", scraperHandler.DeepImportAnime)

			// Quick News Admin Operations
			protected.Group("/quick-news").POST("", quickNewsHandler.Create).PUT("/:id", quickNewsHandler.Update).DELETE("/:id", quickNewsHandler.Delete)

			// Country Admin Operations
			protected.Group("/countries").POST("", countryHandler.Create).PUT("/:id", countryHandler.Update).DELETE("/:id", countryHandler.Delete)

			// Embed Accounts Admin Operations
			protected.Group("/embed-accounts").GET("", embedAccountHandler.GetAll).POST("", embedAccountHandler.Create).PUT("/:id", embedAccountHandler.Update).DELETE("/:id", embedAccountHandler.Delete).GET("/all/export", embedAccountHandler.Export).POST("/all/import", embedAccountHandler.Import)

			// Server Admin Operations
			protected.Group("/servers").POST("", serverHandler.Create).PUT("/:id", serverHandler.Update).DELETE("/:id", serverHandler.Delete)
		}
	}

	r.Use(func(c *gin.Context) {
		log.Printf("Incoming: %s %s | Len: %d", c.Request.Method, c.Request.URL.Path, c.Request.ContentLength)
		c.Next()
	})

	srv := &http.Server{
		Addr:        ":" + cfg.Port,
		Handler:     r,
		ReadTimeout: 0, WriteTimeout: 0, IdleTimeout: 0,
	}

	log.Printf("Server configuration complete. Listening on port %s", cfg.Port)
	log.Printf("Healthcheck path: /api/health (ready)")
	
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
