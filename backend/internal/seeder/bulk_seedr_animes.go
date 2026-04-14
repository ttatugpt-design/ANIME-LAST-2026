package seeder

import (
	"backend/internal/core/domain"
	"gorm.io/gorm"
)

func SeedBulkSEEDRAnimes(db *gorm.DB) {
	// 1. 86 (Eighty Six)
	anime86 := domain.Anime{
		Title:         "86 - Eighty Six الموسم الأول والثاني",
		TitleEn:       "86 Eighty Six",
		Slug:          "eighty-six-86",
		SlugEn:        "eighty-six-86",
		Description:   "تتبع القصة شين ولينا في حرب طاحنة بين جمهورية سان ماجنوليا وإمبراطورية جياديان. في عالم حيث يُجبر الـ '86' على القتال في آليات آلية ضد جحافل الـ 'ليجيون' المدمرة، تحاول لينا قيادتهم عن بُعد بينما يواجه شين ورفاقه الموت كل يوم. قصة عن العنصرية والحرب والأمل المفقود في واقع مرير.",
		DescriptionEn: "The story follows Shin and Lena in a brutal war between the Republic of San Magnolia and the Giadian Empire. In a world where the '86' are forced to fight in mechanical suits against the destructive 'Legion' hordes, Lena attempts to lead them from afar while Shin and his comrades face death daily. A story of racism, war, and lost hope in a bitter reality.",
		Seasons:       2,
		Status:        "Completed",
		Rating:        8.8,
		Image:         "/uploads/animes/86.jpg",
		Cover:         "/uploads/animes/86.jpg",
		StudioName:    "A-1 Pictures",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime86.ReleaseDate = toDatePtr("2006-01-02", "2021-04-11")
	createAnimeWithEpisodes(db, anime86, 25, []string{"action", "drama", "sci-fi", "mecha"}, 2021,
		"الحلقة الجديدة من 86 - قتال مرير ضد الليجيون واستراتيجيات لينا العسكرية.",
		"The new episode of 86 - Bitter combat against the Legion and Lena's military strategies.")

	// 2. Ajin S2
	animeAjin2 := domain.Anime{
		Title:         "Ajin: Demi-Human Season 2 موسم 2",
		TitleEn:       "Ajin: Demi-Human Season 2",
		Slug:          "ajin-s2",
		SlugEn:        "ajin-s2",
		Description:   "يستمر الصراع بين كاي وساتو في معركة البقاء للأجين. ساتو يخطط لهجمات أكثر دموية ضد الحكومة اليابانية، بينما يحاول كاي التعاون مع وكالة مكافحة الأجين لوقف جنون ساتو. هل سينتصر البشر أم يسيطر الأجين على العالم؟",
		DescriptionEn: "The conflict continues between Kei and Sato in the struggle for Ajin survival. Sato plans bloodier attacks against the Japanese government, while Kei attempts to cooperate with the Anti-Ajin agency to stop Sato's madness. Will humans prevail, or will the Ajin take over the world?",
		Seasons:       2,
		Status:        "Completed",
		Rating:        8.0,
		Image:         "/uploads/animes/ajin_s2.jpg",
		Cover:         "/uploads/animes/ajin_s2.jpg",
		StudioName:    "Polygon Pictures",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeAjin2.ReleaseDate = toDatePtr("2006-01-02", "2016-10-08")
	createAnimeWithEpisodes(db, animeAjin2, 25, []string{"action", "horror", "mystery", "supernatural"}, 2016,
		"الحلقة الجديدة من أجين - خطط ساتو الإرهابية ومحاولات كاي لإيقافه.",
		"The new episode of Ajin - Sato's terrorist plans and Kei's attempts to stop him.")

	// 3. Dorohedoro S2
	animeDoro2 := domain.Anime{
		Title:         "Dorohedoro Season 2 موسم الثاني",
		TitleEn:       "Dorohedoro Season 2",
		Slug:          "dorohedoro-s2",
		SlugEn:        "dorohedoro-s2",
		Description:   "عودة كايمان ونيكايدو في عالم السحر والغموض. يستمر كايمان في البحث عن الساحر الذي حول رأسه إلى رأس سحلية، بينما تتعقد الأمور في مدينة 'هول' مع تدخل كاي من عائلة 'إن'. هل سيصل كايمان أخيراً إلى الحقيقة خلف ذاكرته المفقودة؟",
		DescriptionEn: "Kaiman and Nikaido return in a world of magic and mystery. Kaiman continues searching for the sorcerer who turned his head into a lizard's, while things get complicated in the city of 'Hole' with Kai's intervention from the 'En' family. Will Kaiman finally reach the truth behind his lost memory?",
		Seasons:       2,
		Status:        "Upcoming",
		Rating:        8.5,
		Image:         "/uploads/animes/dorohedoro_s2.jpg",
		Cover:         "/uploads/animes/dorohedoro_s2.jpg",
		StudioName:    "MAPPA",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeDoro2.ReleaseDate = toDatePtr("2006-01-02", "2025-01-01")
	createAnimeWithEpisodes(db, animeDoro2, 25, []string{"action", "comedy", "fantasy", "horror"}, 2025,
		"الحلقة الجديدة من دوروهيدورو - صراع السحرة والبحث عن الحقيقة في هول.",
		"The new episode of Dorohedoro - Sorcerer conflict and searching for the truth in Hole.")

	// 4. Dr. Stone S3 (New World)
	animeStone3 := domain.Anime{
		Title:         "Dr. Stone Season 3 New World د. ستون عالم جديد",
		TitleEn:       "Dr. Stone Season 3 New World",
		Slug:          "dr-stone-s3",
		SlugEn:        "dr-stone-s3",
		Description:   "يبدأ سينكو وطاقمه رحلتهم عبر المحيط لاكتشاف مصدر التحجر. بعد بناء السفينة 'بيرسيوس'، يبحر أبطال مملكة العلم نحو جزيرة الكنز ليجدوا أنفسهم أمام عدو جديد يستخدم سلاح التحجر بفعالية. هل سينجح سينكو في فك شفرة هذا العلم القديم؟",
		DescriptionEn: "Senku and his crew begin their journey across the ocean to discover the source of petrification. After building the ship 'Perseus', the heroes of the Kingdom of Science sail towards Treasure Island find themselves facing a new enemy using the petrification weapon effectively. Will Senku succeed in decoding this ancient science?",
		Seasons:       3,
		Status:        "Completed",
		Rating:        8.6,
		Image:         "/uploads/animes/dr_stone_s3.jpg",
		Cover:         "/uploads/animes/dr_stone_s3.jpg",
		StudioName:    "TMS Entertainment",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeStone3.ReleaseDate = toDatePtr("2006-01-02", "2023-04-06")
	createAnimeWithEpisodes(db, animeStone3, 25, []string{"adventure", "sci-fi", "shounen", "comedy"}, 2023,
		"الحلقة الجديدة من دكتور ستون - اكتشافات علمية مذهلة في الجزيرة المجهولة.",
		"The new episode of Dr. Stone - Amazing scientific discoveries on the unknown island.")

	// 5. MHA Vigilantes S2
	animeVig2 := domain.Anime{
		Title:         "Boku no Hero Academia: Vigilantes Season 2 فيجيلانتي",
		TitleEn:       "My Hero Academia: Vigilantes Season 2",
		Slug:          "mha-vigilantes-s2",
		SlugEn:        "mha-vigilantes-s2",
		Description:   "قصة الأبطال غير المرخصين الذين يحمون الشوارع من خارج النظام. كويتشي وأصدقاؤه يستمرون في مواجهة الجرائم التي تغفل عنها الوكالات الرسمية، بينما تتكشف معلومات سرية عن تجارب تقوية الـ 'كويرك' غير القانونية.",
		DescriptionEn: "The story of unlicensed heroes who protect the streets from outside the system. Koichi and his friends continue to face crimes neglected by official agencies, while secret information about illegal 'Quirk' enhancement experiments is revealed.",
		Seasons:       2,
		Status:        "Upcoming",
		Rating:        8.2,
		Image:         "/uploads/animes/mha_vigilantes_s2.jpg",
		Cover:         "/uploads/animes/mha_vigilantes_s2.jpg",
		StudioName:    "Bones",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeVig2.ReleaseDate = toDatePtr("2006-01-02", "2025-06-01")
	createAnimeWithEpisodes(db, animeVig2, 25, []string{"action", "sci-fi", "shounen", "supernatural"}, 2025,
		"الحلقة الجديدة من فيجيلانتي - أبطال الشوارع يواجهون عدواً غامضاً.",
		"The new episode of Vigilantes - Street heroes face a mysterious enemy.")

	// 6. Yuusha Party
	animeYuusha := domain.Anime{
		Title:         "Yuusha Party wo Oidasareta Kiyoubinbou الحرفي الماهر",
		TitleEn:       "Yuusha Party wo Oidasareta Kiyoubinbou",
		Slug:          "yuusha-party",
		SlugEn:        "yuusha-party",
		Description:   "قصة الحرفي الماهر الذي تم طرده من فريق البطل ليبدأ رحلته الخاصة. بعد سنوات من الدعم التقني للفريق، يدرك البطل لاحقاً قيمة مهارات كايل، بينما يبني كايل معقله الخاص ويجمع أصدقاء جدد يقدرون مواهبه الحقيقية.",
		DescriptionEn: "The story of a skilled craftsman who was kicked out of the Hero's party to start his own journey. After years of technical support for the team, the Hero later realizes the value of Kyle's skills, while Kyle builds his own fortress and gathers new friends who appreciate his true talents.",
		Seasons:       1,
		Status:        "Running",
		Rating:        7.5,
		Image:         "/uploads/animes/yuusha_party.jpg",
		Cover:         "/uploads/animes/yuusha_party.jpg",
		StudioName:    "Seven Arcs",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeYuusha.ReleaseDate = toDatePtr("2006-01-02", "2024-10-01")
	createAnimeWithEpisodes(db, animeYuusha, 25, []string{"fantasy", "adventure", "shounen"}, 2024,
		"الحلقة الجديدة من الحرفي الماهر - بناء المعقل الجديد وتطوير الأدوات القتالية.",
		"The new episode of Yuusha Party - Building the new fortress and developing combat tools.")

	// 7. Black Clover
	animeClover := domain.Anime{
		Title:         "Black Clover بلاك كلوفر",
		TitleEn:       "Black Clover",
		Slug:          "black-clover",
		SlugEn:        "black-clover",
		Description:   "أستا ويونيو في رحلتهما ليصبح أحدهما إمبراطور السحر. في عالم يعتمد على السحر، يحلم أستا الذي ولد بلا سحر بأنه سيصبح الأقوى، بينما يمتلك يونو موهبة فطرية هائلة. يكتشف أستا لاحقاً كتاب تعاويذ 'البرسيم الخماسي' والسيوف التي تبطل السحر.",
		DescriptionEn: "Asta and Yuno on their journey for one of them to become the Wizard King. In a world dependent on magic, Asta, born without magic, dreams of becoming the strongest, while Yuno possesses immense innate talent. Asta later discovers the 'five-leaf clover' grimoire and anti-magic swords.",
		Seasons:       1,
		Status:        "Running",
		Rating:        8.7,
		Image:         "/uploads/animes/black_clover.jpg",
		Cover:         "/uploads/animes/black_clover.jpg",
		StudioName:    "Pierrot",
		Duration:      23,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeClover.ReleaseDate = toDatePtr("2006-01-02", "2017-10-03")
	createAnimeWithEpisodes(db, animeClover, 170, []string{"action", "fantasy", "comedy", "shounen"}, 2017,
		"الحلقة الجديدة من بلاك كلوفر - تدريبات أستا الشاقة ومعارك فرسان السحر.",
		"The new episode of Black Clover - Asta's intense training and Magic Knight battles.")

	// 8. Dr. Stone S2
	animeStone2 := domain.Anime{
		Title:         "Dr. Stone: Stone Wars دكتور ستون حروب التحجر",
		TitleEn:       "Dr. Stone: Stone Wars",
		Slug:          "dr-stone-s2",
		SlugEn:        "dr-stone-s2",
		Description:   "المواجهة الكبرى بين مملكة العلم وإمبراطورية تسوكاسا. يستخدم سينكو اختراعاته الحديثة مثل 'الهاتف المحمول' و'الدبابة' لشن هجوم استراتيجي يهدف لتحرير كهف التحجر دون اللجوء للقتل المباشر.",
		DescriptionEn: "The major confrontation between the Kingdom of Science and Tsukasa's Empire. Senku uses his modern inventions like the 'mobile phone' and 'tank' to launch a strategic attack aimed at liberating the petrification cave without direct killing.",
		Seasons:       2,
		Status:        "Completed",
		Rating:        8.5,
		Image:         "/uploads/animes/dr_stone_s2.jpg",
		Cover:         "/uploads/animes/dr_stone_s2.jpg",
		StudioName:    "TMS Entertainment",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeStone2.ReleaseDate = toDatePtr("2006-01-02", "2021-01-14")
	createAnimeWithEpisodes(db, animeStone2, 25, []string{"adventure", "sci-fi", "shounen", "comedy"}, 2021,
		"الحلقة الجديدة من حروب التحجر - تكتيكات سينكو العبقرية ومواجهة تسوكاسا.",
		"The new episode of Stone Wars - Senku's genius tactics and meeting Tsukasa.")

	// 9. Dr. Stone S4
	animeStone4 := domain.Anime{
		Title:         "Dr. Stone: Science Future دكتور ستون مستقبل العلم",
		TitleEn:       "Dr. Stone: Science Future",
		Slug:          "dr-stone-s4",
		SlugEn:        "dr-stone-s4",
		Description:   "الفصل الأخير من مغامرة سينكو لإعادة بناء الحضارة. يتجه أبطالنا نحو القمر لمواجهة التهديد النهائي 'واي مان' وكشف سر التحجر الذي دمر البشرية لآلاف السنين. هل سينجح العلم في استعادة المستقبل؟",
		DescriptionEn: "The final chapter of Senku's adventure to rebuild civilization. Our heroes head towards the moon to face the ultimate 'Why-man' threat and reveal the secret of petrification that destroyed humanity for thousands of years. Will science succeed in restoring the future?",
		Seasons:       4,
		Status:        "Upcoming",
		Rating:        8.9,
		Image:         "/uploads/animes/dr_stone_s4.jpg",
		Cover:         "/uploads/animes/dr_stone_s4.jpg",
		StudioName:    "TMS Entertainment",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeStone4.ReleaseDate = toDatePtr("2006-01-02", "2025-10-01")
	createAnimeWithEpisodes(db, animeStone4, 25, []string{"adventure", "sci-fi", "shounen", "drama"}, 2025,
		"الحلقة الجديدة من مستقبل العلم - التحضيرات النهائية للرحلة القمرية.",
		"The new episode of Science Future - Final preparations for the lunar journey.")

	// 10. Kaiju No. 8 S2
	animeKaiju2 := domain.Anime{
		Title:         "Kaiju No. 8 Season 2 كايجو رقم 8 الموسم الثاني",
		TitleEn:       "Kaiju No. 8 Season 2",
		Slug:          "kaiju-no-8-s2",
		SlugEn:        "kaiju-no-8-s2",
		Description:   "كافكا هيبينو يستمر في صراعه ضد الكايجو بينما يحاول إخفاء حقيقته. بعد انضمامه لفيلق الدفاع، يواجه تهديدات جديدة من كايجو مرقمة تمتلك ذكاءً بشرياً، بينما تزداد الشكوك حول طبيعة قوته الغامضة.",
		DescriptionEn: "Kafka Hibino continues his struggle against Kaiju while trying to hide his true identity. After joining the Defense Force, he faces new threats from numbered Kaiju with human intelligence, while suspicions grow regarding the nature of his mysterious power.",
		Seasons:       2,
		Status:        "Upcoming",
		Rating:        8.4,
		Image:         "/uploads/animes/kaiju_no_8_s2.jpg",
		Cover:         "/uploads/animes/kaiju_no_8_s2.jpg",
		StudioName:    "Production I.G",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeKaiju2.ReleaseDate = toDatePtr("2006-01-02", "2025-04-01")
	createAnimeWithEpisodes(db, animeKaiju2, 25, []string{"action", "sci-fi", "shounen", "comedy"}, 2025,
		"الحلقة الجديدة من كايجو رقم 8 - عمليات فيلق الدفاع والوحوش الجديدة.",
		"The new episode of Kaiju No. 8 - Defense Force operations and new beasts.")


	// My Hero Academia Seasons (2-7)
	// 11. MHA S2
	animeMha2 := domain.Anime{
		Title:         "Boku no Hero Academia Season 2 أكاديمية بطلي الموسم الثاني",
		TitleEn:       "My Hero Academia Season 2",
		Slug:          "mha-s2",
		SlugEn:        "mha-s2",
		Description:   "تتواصل رحلة إيزوكو مع المهرجان الرياضي لمدرسة يو أي، حيث يعرض الطلاب قدراتهم أمام العالم. يواجه ميدوريا تحديات صعبة من تودوروكي وباكوغو، بينما يتربص قاتل الأبطال 'ستين' في الظلال.",
		DescriptionEn: "Izuku's journey continues with the U.A. Sports Festival, where students showcase their abilities to the world. Midoriya faces tough challenges from Todoroki and Bakugo, while the Hero Killer 'Stain' lurks in the shadows.",
		Seasons:       2,
		Status:        "Completed",
		Rating:        8.5,
		Image:         "/uploads/animes/mha_s2.jpg",
		Cover:         "/uploads/animes/mha_s2.jpg",
		StudioName:    "Bones",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeMha2.ReleaseDate = toDatePtr("2006-01-02", "2017-04-01")
	createAnimeWithEpisodes(db, animeMha2, 25, []string{"action", "sci-fi", "shounen", "supernatural"}, 2017,
		"الحلقة الجديدة من أكاديمية بطلي - المعارك المشتعلة في المهرجان الرياضي.",
		"The new episode of MHA - Burning battles in the Sports Festival.")

	// 12. MHA S3
	animeMha3 := domain.Anime{
		Title:         "Boku no Hero Academia Season 3 أكاديمية بطلي الموسم الثالث",
		TitleEn:       "My Hero Academia Season 3",
		Slug:          "mha-s3",
		SlugEn:        "mha-s3",
		Description:   "مواجهة مصيرية بين رمز السلام أول مايت وخصمه اللدود أول فور ون. يذهب الطلاب في مخيم تدريبي غابوي، لكن هجوم عصبة الأشرار يحول التدريب إلى معركة من أجل اليقاء والاختطاف الصادم.",
		DescriptionEn: "A fateful confrontation between the Symbol of Peace All Might and his arch-rival All For One. The students go on a forest training camp, but a League of Villains attack turns training into a battle for survival and a shocking kidnapping.",
		Seasons:       3,
		Status:        "Completed",
		Rating:        8.6,
		Image:         "/uploads/animes/mha_s3.jpg",
		Cover:         "/uploads/animes/mha_s3.jpg",
		StudioName:    "Bones",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeMha3.ReleaseDate = toDatePtr("2006-01-02", "2018-04-07")
	createAnimeWithEpisodes(db, animeMha3, 25, []string{"action", "sci-fi", "shounen", "supernatural"}, 2018,
		"الحلقة الجديدة من أكاديمية بطلي - المعركة النهائية لأول مايت.",
		"The new episode of MHA - All Might's final battle.")

	// 13. MHA S4
	animeMha4 := domain.Anime{
		Title:         "Boku no Hero Academia Season 4 أكاديمية بطلي الموسم الرابع",
		TitleEn:       "My Hero Academia Season 4",
		Slug:          "mha-s4",
		SlugEn:        "mha-s4",
		Description:   "ميدوريا ورفاقه ينضمون إلى وكالات الأبطال للتدريب الميداني. يواجهون منظمة 'إيتشيسايكاي' بقيادة أوفر هول الذي يحاول استغلال قدرة فتاة صغيرة تدعى إيري. هل سينجح ميدوريا في إنقاذ إيري وتحطيم مخططاتهم؟",
		DescriptionEn: "Midoriya and his friends join hero agencies for field training. They face the 'Eight Precepts of Death' led by Overhaul, who tries to exploit the power of a small girl named Eri. Will Midoriya succeed in saving Eri and crushing their plans?",
		Seasons:       4,
		Status:        "Completed",
		Rating:        8.4,
		Image:         "/uploads/animes/mha_s4.jpg",
		Cover:         "/uploads/animes/mha_s4.jpg",
		StudioName:    "Bones",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeMha4.ReleaseDate = toDatePtr("2006-01-02", "2019-10-12")
	createAnimeWithEpisodes(db, animeMha4, 25, []string{"action", "sci-fi", "shounen", "supernatural"}, 2019,
		"الحلقة الجديدة من أكاديمية بطلي - محاولات إنقاذ إيري والمواجهة ضد أوفر هول.",
		"The new episode of MHA - Attempts to save Eri and the confrontation against Overhaul.")

	// 14. MHA S5
	animeMha5 := domain.Anime{
		Title:         "Boku no Hero Academia Season 5 أكاديمية بطلي الموسم الخامس",
		TitleEn:       "My Hero Academia Season 5",
		Slug:          "mha-s5",
		SlugEn:        "mha-s5",
		Description:   "التدريب المشترك بين الفصل A والفصل B من مدرسة يو أي. يكتشف ميدوريا أسراراً جديدة داخل قدرة 'ون فور أول'، بينما تستعد جبهة تحرير الأشرار لشن هجوم شامل.",
		DescriptionEn: "Joint training between Class A and Class B of U.A. High School. Midoriya discovers new secrets within the 'One For All' ability, while the Villain Liberation Front prepares for an all-out attack.",
		Seasons:       5,
		Status:        "Completed",
		Rating:        8.1,
		Image:         "/uploads/animes/mha_s5.jpg",
		Cover:         "/uploads/animes/mha_s5.jpg",
		StudioName:    "Bones",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeMha5.ReleaseDate = toDatePtr("2006-01-02", "2021-03-27")
	createAnimeWithEpisodes(db, animeMha5, 25, []string{"action", "sci-fi", "shounen", "supernatural"}, 2021,
		"الحلقة الجديدة من أكاديمية بطلي - التدريبات المشتركة وظهور القوى الجديدة.",
		"The new episode of MHA - Joint training and the emergence of new powers.")

	// 15. MHA S6
	animeMha6 := domain.Anime{
		Title:         "Boku no Hero Academia Season 6 أكاديمية بطلي الموسم السادس",
		TitleEn:       "My Hero Academia Season 6",
		Slug:          "mha-s6",
		SlugEn:        "mha-s6",
		Description:   "الحرب الشاملة بين الأبطال وجبهة تحرير الأشرار. تندلع معارك مدمرة في جميع أنحاء اليابان، مما يؤدي إلى تغيير جذري في المجتمع وظهور 'ديفي ميدوريا' الذي يقرر القتال بمفرده لحماية الجميع.",
		DescriptionEn: "The all-out war between heroes and the Villain Liberation Front. Destructive battles erupt across Japan, leading to a radical change in society and the emergence of 'Dark Midoriya' who decides to fight alone to protect everyone.",
		Seasons:       6,
		Status:        "Completed",
		Rating:        8.7,
		Image:         "/uploads/animes/mha_s6.jpg",
		Cover:         "/uploads/animes/mha_s6.jpg",
		StudioName:    "Bones",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeMha6.ReleaseDate = toDatePtr("2006-01-02", "2022-10-01")
	createAnimeWithEpisodes(db, animeMha6, 25, []string{"action", "sci-fi", "shounen", "supernatural"}, 2022,
		"الحلقة الجديدة من أكاديمية بطلي - ويلات الحرب ودمار المدن الكبرى.",
		"The new episode of MHA - The ravages of war and destruction of major cities.")

	// 16. MHA S7
	animeMha7 := domain.Anime{
		Title:         "Boku no Hero Academia Season 7 أكاديمية بطلي الموسم السابع",
		TitleEn:       "My Hero Academia Season 7",
		Slug:          "mha-s7",
		SlugEn:        "mha-s7",
		Description:   "المعركة النهائية لإنقاذ العالم من أول فور ون وشيغاراكي. الأبطال المتبقون يضعون خطة أخيرة لهزيمة الأشرار، بينما يحاول ميدوريا استعادة تومورا ووقف الدمار النهائي.",
		DescriptionEn: "The final battle to save the world from All For One and Shigaraki. Remaining heroes put a final plan to defeat the villains, while Midoriya attempts to restore Tomura and stop the final destruction.",
		Seasons:       7,
		Status:        "Running",
		Rating:        8.8,
		Image:         "/uploads/animes/mha_s7.jpg",
		Cover:         "/uploads/animes/mha_s7.jpg",
		StudioName:    "Bones",
		Duration:      23,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	animeMha7.ReleaseDate = toDatePtr("2006-01-02", "2024-05-04")
	createAnimeWithEpisodes(db, animeMha7, 21, []string{"action", "sci-fi", "shounen", "supernatural"}, 2024,
		"الحلقة الجديدة من أكاديمية بطلي - الاستعدادات للمعركة المصيرية الكبرى.",
		"The new episode of MHA - Preparations for the great fateful battle.")
}
