"use strict";
/* ============================================================================
   Site language switcher.
   The app is written in Armenian (hy) — that stays the source language.
   This file swaps the visible Armenian text into English (en) or Russian (ru)
   on the fly, and adds the language dropdown in the top-left corner.
   Nothing here touches the Japanese words or the dictionary meanings.
   ========================================================================== */
(function () {
  const STORE = "mk_lang";
  const LANGS = [
    { code: "hy", label: "Հայերեն" },
    { code: "ru", label: "Русский" },
    { code: "en", label: "English" },
  ];
  /* The two sister sites share one web address, so they share one browser
     storage. The language is therefore kept under a single shared label that
     both of them read and write. Whichever site you open next opens in the
     language you last picked — through the flower, a bookmark, or the Back
     button, it makes no difference. STORE stays as a fallback for anyone who
     chose a language before this was shared. */
  const SHARED = "mn_lang";
  let LANG = localStorage.getItem(SHARED) || localStorage.getItem(STORE) || "hy";
  if (!LANGS.some((l) => l.code === LANG)) LANG = "hy";
  try { localStorage.setItem(SHARED, LANG); } catch (e) {}   // so the sister sees it too
  document.documentElement.lang = LANG;

  /* ---- whole, fixed phrases: Armenian -> { en, ru } ---- */
  const EXACT = {
    "Ֆլեշքարտեր": { en: "Flashcards", ru: "Карточки" },
    "Փակել": { en: "Close", ru: "Закрыть" },
    "Դուրս գալ ֆլեշքարտերից": { en: "Leave the flashcards", ru: "Выйти из карточек" },
    "Ամբողջ էկրանով": { en: "Full screen", ru: "Во весь экран" },
    "Վերադառնալ պատուհան": { en: "Back to the window", ru: "Вернуться в окно" },
    "+ Նոր հավաքածու ստեղծել": { en: "+ Create new set", ru: "+ Создать новый набор" },
    "Հավաքածուի անուն": { en: "Set name", ru: "Название набора" },
    "Ավելացնել նաև այս կանջիներով բառեր": { en: "Also add words with these kanji", ru: "Также добавить слова с этими кандзи" },
    "Ընտրիր մակարդակ, ապա սեղմիր կանջիների վրա։": { en: "Pick a level, then tap the kanji.", ru: "Выбери уровень, затем нажми на кандзи." },
    "Ստեղծել հավաքածու": { en: "Create set", ru: "Создать набор" },
    "Ետ": { en: "Back", ru: "Назад" },
    "Չգիտեմ": { en: "Don't know", ru: "Не знаю" },
    "Շրջել": { en: "Flip", ru: "Перевернуть" },
    "Գիտեմ": { en: "Know", ru: "Знаю" },
    "Սեղմիր քարտին՝ շրջելու համար։ ← → ՝ քարտերի միջև, 🔊՝ լսելու։ Քաշիր աջ՝ գիտեմ, ձախ՝ չգիտեմ։": { en: "Tap the card to flip it. ← → move between cards, 🔊 listens. Swipe right = know, left = don't know.", ru: "Нажми на карточку, чтобы перевернуть. ← → — между карточками, 🔊 — послушать. Свайп вправо — знаю, влево — не знаю." },
    "Քաշիր աջ՝ գիտեմ, ձախ՝ չգիտեմ։ Սեղմիր քարտին՝ շրջելու համար։": { en: "Swipe right = know, left = don't know. Tap the card to flip it.", ru: "Свайп вправо — знаю, влево — не знаю. Нажми на карточку, чтобы перевернуть." },
    "Համակարգչում՝ ↑ գիտեմ · ↓ չգիտեմ · ← → քարտերի միջև · Space/Enter՝ շրջել։": { en: "On a computer: ↑ know · ↓ don't know · ← → move between cards · Space/Enter flips.", ru: "На компьютере: ↑ знаю · ↓ не знаю · ← → между карточками · Space/Enter — перевернуть." },
    "Նախորդ քարտը": { en: "Previous card", ru: "Предыдущая карточка" },
    "Հաջորդ քարտը": { en: "Next card", ru: "Следующая карточка" },
    "Ընտրել ամբողջ մակարդակը": { en: "Select the whole level", ru: "Выбрать весь уровень" },
    "Մաքրել ընտրվածը": { en: "Clear selection", ru: "Очистить выбор" },
    "Արդյունք": { en: "Result", ru: "Результат" },
    "«Կատվի թաթն էլ կուզեի փոխ վերցնել» — ասում են, երբ շատ զբաղված են։": { en: "“I'd even borrow a cat's paw” — said when you're swamped.", ru: "«Я бы и лапу кота одолжил» — говорят, когда завал." },
    "Ճապոներենում հոգնակի թիվ չկա՝ 猫 նշանակում է և՛ կատու, և՛ կատուներ։": { en: "Japanese has no plural: 猫 means one cat or many.", ru: "В японском нет множественного числа: 猫 — и кот, и коты." },
    "«Կարաոկե» բառացի նշանակում է «դատարկ նվագախումբ»։": { en: "“Karaoke” literally means “empty orchestra”.", ru: "«Караоке» буквально значит «пустой оркестр»." },
    "Emoji-ն 絵文字 է՝ «նկար-տառ», ոչ թե «էմոցիա»։": { en: "Emoji is 絵文字, “picture letter” — nothing to do with emotion.", ru: "Эмодзи — это 絵文字, «картинка-буква», не «эмоция»." },
    "4 թիվը հնչում է ինչպես «մահ», դրա համար հիվանդանոցները բաց են թողնում այն։": { en: "The number 4 sounds like “death”, so hospitals skip it.", ru: "Цифра 4 звучит как «смерть», поэтому её пропускают в больницах." },
    "木漏れ日 — տերևների արանքից ծորացող արևի լույս։ Մեկ բառով։": { en: "木漏れ日: sunlight leaking through leaves. One single word.", ru: "木漏れ日 — солнце, просачивающееся сквозь листву. Одно слово." },
    "«Արիգատո»-ն սկզբում նշանակել է «հազվադեպ գոյություն ունեցող»։": { en: "“Arigatou” originally meant “rare to exist”.", ru: "«Аригато» изначально значило «редко существующее»." },
    "Մեկ ճապոնական նախադասությունը կարող է օգտագործել երեք այբուբեն միանգամից։": { en: "One Japanese sentence can use three alphabets at once.", ru: "Одно японское предложение может использовать три алфавита сразу." },
    "「かわいい」 սկզբնապես նշանակել է «խղճալի», ոչ թե «սիրուն»։": { en: "“Kawaii” first meant “pitiable”, not “cute”.", ru: "«Каваии» сначала значило «жалкий», а не «милый»." },
    "Չափահաս ճապոնացիները վեճերը երբեմն լուծում են քար-թուղթ-մկրատով։": { en: "Japanese adults sometimes settle real arguments with rock-paper-scissors.", ru: "Взрослые японцы иногда решают споры игрой камень-ножницы-бумага." },
    "布団が吹っ飛んだ — «ներքնակը թռավ»։ Ամենահայտնի ճապոնական բառախաղը։": { en: "布団が吹っ飛んだ — “the futon flew off”: Japan's classic dad joke.", ru: "布団が吹っ飛んだ — «футон улетел»: классический японский каламбур." },
    "一石二鳥 — «մեկ քարով երկու թռչուն», ճիշտ ինչպես մեզ մոտ։": { en: "一石二鳥 — “one stone, two birds”, just like we say.", ru: "一石二鳥 — «одним камнем двух птиц», как и у нас." },
    "Պատրաստում ենք հավաքածուդ…": { en: "Building your set…", ru: "Собираем твой набор…" },
    "Գիտե՞ս որ․․․": { en: "Did you know…", ru: "А ты знал(а)…" },
    "Մուտք գործիր՝ առաջընթացդ պահելու համար": { en: "Log in to keep your progress", ru: "Войди, чтобы сохранять прогресс" },
    "Մուտք": { en: "Log in", ru: "Войти" },
    "Բացիր հաշիվդ": { en: "Open your account", ru: "Открыть аккаунт" },
    "← Դեպի հավաքածուներ": { en: "← Back to sets", ru: "← К наборам" },
    "Իմ հաշիվը": { en: "My account", ru: "Мой аккаунт" },
    "Մուտք գործել": { en: "Log in", ru: "Войти" },
    "Գրանցվել": { en: "Sign up", ru: "Зарегистрироваться" },
    "Դուրս գալ": { en: "Log out", ru: "Выйти" },
    "Անուն": { en: "Name", ru: "Имя" },
    "Էլ. փոստ": { en: "Email", ru: "Эл. почта" },
    "Գաղտնաբառ": { en: "Password", ru: "Пароль" },
    "Առնվազն 6 նշան": { en: "At least 6 characters", ru: "Минимум 6 символов" },
    "Մուտք…": { en: "Logging in…", ru: "Вхожу…" },
    "Գրանցում…": { en: "Signing up…", ru: "Регистрирую…" },
    "Ադմին վահանակ": { en: "Admin panel", ru: "Панель админа" },
    "Հավաքածուներ": { en: "Sets", ru: "Наборы" },
    "Քարտեր": { en: "Cards", ru: "Карточки" },
    "Առանց հաշվի էլ կարող ես սովորել — պարզապես արդյունքները կմնան միայն այս սարքում։": { en: "You can study without an account — your progress just stays on this device.", ru: "Можно учиться и без аккаунта — прогресс останется только на этом устройстве." },
    "Լրացրու էլ. փոստն ու գաղտնաբառը։": { en: "Fill in your email and password.", ru: "Введи почту и пароль." },
    "Պետք է էլ. փոստ և առնվազն 6 նշան գաղտնաբառ։": { en: "Need an email and a password of at least 6 characters.", ru: "Нужны почта и пароль минимум из 6 символов." },
    "Սխալ փոստ կամ գաղտնաբառ։": { en: "Wrong email or password.", ru: "Неверная почта или пароль." },
    "Այս փոստն արդեն գրանցված է — մուտք գործիր։": { en: "That email is already registered — log in instead.", ru: "Эта почта уже зарегистрирована — войди." },
    "Գաղտնաբառը շատ կարճ է (նվազագույնը՝ 6)։": { en: "Password too short (at least 6).", ru: "Пароль слишком короткий (минимум 6)." },
    "Ստուգիր փոստդ՝ հաստատելու համար։": { en: "Check your email to confirm.", ru: "Проверь почту для подтверждения." },
    "Հաշիվները հասանելի չեն այս պահին։": { en: "Accounts aren't available right now.", ru: "Аккаунты сейчас недоступны." },
    "հենց նոր": { en: "just now", ru: "только что" },
    "վերջին անգամ՝": { en: "last seen:", ru: "был(а):" },
    "Հրավերի կոդ (միայն գրանցվելիս)": { en: "Invite code (only when signing up)", ru: "Код приглашения (только при регистрации)" },
    "Կոդը՝ Միշկայից": { en: "Code from Mishka", ru: "Код от Мишки" },
    "Կոդ խնդրիր Միշկայից։": { en: "Ask Mishka for a code.", ru: "Попроси код у Мишки." },
    "Հրավերի կոդը սխալ է կամ սպառված։": { en: "That invite code is wrong or used up.", ru: "Код приглашения неверный или израсходован." },
    "Փոստը հաստատված չէ — բացիր Supabase → Authentication → Users և հաստատիր։": { en: "Email not confirmed — open Supabase → Authentication → Users and confirm it.", ru: "Почта не подтверждена — открой Supabase → Authentication → Users и подтверди." },
    "Չափից շատ փորձեր — սպասիր մի քիչ։": { en: "Too many attempts — wait a bit.", ru: "Слишком много попыток — подожди немного." },
    "Մոռացե՞լ ես գաղտնաբառը": { en: "Forgot your password?", ru: "Забыл(а) пароль?" },
    "Նախ գրիր էլ. փոստդ։": { en: "Type your email first.", ru: "Сначала введи почту." },
    "Ուղարկում…": { en: "Sending…", ru: "Отправляю…" },
    "Ուղարկեցինք հղում՝ ստուգիր փոստդ։": { en: "Link sent — check your email.", ru: "Ссылка отправлена — проверь почту." },
    "Նոր գաղտնաբառ": { en: "New password", ru: "Новый пароль" },
    "Առնվազն 6 նշան։": { en: "At least 6 characters.", ru: "Минимум 6 символов." },
    "Գաղտնաբառը փոխվեց": { en: "Password changed", ru: "Пароль изменён" },
    "Ընտրիր ավելի քաղաքավարի անուն կամ փոստ։": { en: "Please choose a more polite name or email.", ru: "Выбери более вежливое имя или почту." },
    "Ընտրիր ավելի քաղաքավարի անուն։": { en: "Please choose a more polite name.", ru: "Выбери более вежливое имя." },
    "Չընդունվեց՝ ստուգիր հրավերի կոդը և անունը։": { en: "Refused — check the invite code and the name.", ru: "Отказано — проверь код приглашения и имя." },
    "Փոխել անունը": { en: "Change name", ru: "Изменить имя" },
    "Անունը փոխվեց": { en: "Name changed", ru: "Имя изменено" },
    "Փոստդ տեսնում ես միայն դու (և ադմինը)։": { en: "Only you (and the admin) can see your email.", ru: "Твою почту видишь только ты (и админ)." },
    "Փոխել նկարը": { en: "Change picture", ru: "Сменить картинку" },
    "Վերբեռնել լուսանկար": { en: "Upload a photo", ru: "Загрузить фото" },
    "Նկարը փոխվեց": { en: "Picture changed", ru: "Картинка изменена" },
    "Վարկանիշ": { en: "Ranking", ru: "Рейтинг" },
    "Վարկանիշը դեռ միացված չէ։": { en: "Ranking isn't switched on yet.", ru: "Рейтинг ещё не включён." },
    "Դեռ ոչ ոք միավոր չունի։": { en: "Nobody has points yet.", ru: "Пока ни у кого нет очков." },
    "N5 բառ՝ 1 միավոր · N4՝ 2 · N3՝ 4 · N2՝ 8 · N1՝ 16": { en: "N5 word = 1 point · N4 = 2 · N3 = 4 · N2 = 8 · N1 = 16", ru: "Слово N5 = 1 очко · N4 = 2 · N3 = 4 · N2 = 8 · N1 = 16" },
    "Իմ առաջընթացը": { en: "My progress", ru: "Мой прогресс" },
    "Դեռ պարապմունք չկա — սկսիր ֆլեշքարտերից։": { en: "No sessions yet — start with the flashcards.", ru: "Пока нет занятий — начни с карточек." },
    "Հրավերի կոդեր": { en: "Invite codes", ru: "Коды приглашения" },
    "Ստեղծել մեկանգամյա կոդ": { en: "Create a one-time code", ru: "Создать одноразовый код" },
    "Ստեղծել կոդ 5 հոգու համար": { en: "Create a code for 5 people", ru: "Создать код на 5 человек" },
    "Մեկանգամյա կոդը մարում է առաջին օգտագործումից հետո։ 5-հոգանոցը կաշխատի հինգ գրանցման համար, հետո ինքն իրեն կմարի։": { en: "A one-time code dies after the first use. The 5-person one works for five sign-ups, then dies on its own.", ru: "Одноразовый код исчезает после первого использования. Код на 5 человек работает для пяти регистраций, затем исчезает сам." },
    "մեկանգամյա": { en: "one-time", ru: "одноразовый" },
    "օգտագործված": { en: "used", ru: "использован" },
    "Ջնջել կոդը": { en: "Delete code", ru: "Удалить код" },
    "Կոդ չկա — ոչ ոք չի կարող գրանցվել։": { en: "No codes — nobody can sign up.", ru: "Кодов нет — никто не может зарегистрироваться." },
    "Խմբագրում": { en: "Editing", ru: "Редактирование" },
    "Ավելացնել այս կանջիներով բառեր": { en: "Add words with these kanji", ru: "Добавить слова с этими кандзи" },
    "Քարտեր (սեղմիր ✕՝ հեռացնելու համար)": { en: "Cards (tap ✕ to remove)", ru: "Карточки (нажми ✕, чтобы убрать)" },
    "ավելացնել կանջիներ": { en: "add kanji", ru: "добавить кандзи" },
    "Ավելացնել ընտրվածները": { en: "Add selected", ru: "Добавить выбранные" },
    "Պահպանել": { en: "Save", ru: "Сохранить" },
    "Գրել (մատիկով)": { en: "Draw (finger)", ru: "Рисовать (пальцем)" },
    "Մուտքագրել": { en: "Type", ru: "Ввод" },
    "Գրիր բառը ինչպես ուզում ես — գծերի հերթականությունը կարևոր չէ։": { en: "Write the word however you like — stroke order doesn't matter.", ru: "Пиши слово как хочешь — порядок черт не важен." },
    "Նկարելու տարածք": { en: "Drawing area", ru: "Область для рисования" },
    "Ջնջել": { en: "Clear", ru: "Очистить" },
    "Մի քայլ հետ": { en: "Undo", ru: "Отменить" },
    "Մի քայլ առաջ": { en: "Redo", ru: "Повторить" },
    "Կարդալ կանջին": { en: "Read kanji", ru: "Распознать кандзи" },
    "Չգիտե՞ս ինչպես է գրվում։ Մուտքագրիր հիրագանայով՝ օր․՝ たべる, և կստանաս բառի կանջի գրելաձևը՝ 食べる։": { en: "Don't know how it's written? Type it in hiragana — e.g. たべる — and you'll get the kanji spelling: 食べる.", ru: "Не знаешь, как пишется? Введи хираганой — напр. たべる — и получишь запись кандзи: 食べる." },
    "Մուտքագրիր կամ փակցրու ճապոներեն տեքստ՝": { en: "Type or paste Japanese text:", ru: "Введи или вставь японский текст:" },
    "օր․՝ 日本語を勉強する": { en: "e.g. 日本語を勉強する", ru: "напр. 日本語を勉強する" },
    "Վերլուծել": { en: "Analyze", ru: "Разобрать" },
    "Քո նկարը": { en: "Your image", ru: "Твоя картинка" },
    "Ճանաչված նշանը — ուղղիր ու վերլուծիր՝": { en: "Recognized character — fix it and analyze:", ru: "Распознанный знак — исправь и разбери:" },
    "Որոնման պատմություն": { en: "Search history", ru: "История поиска" },
    "Գրիր մատիկով կամ մուտքագրիր ճապոներեն։ Ստացիր յուրաքանչյուր կանջիի իմաստը, ընթերցելու տարբերակներն ու stroke-երի հերթականությունը։": { en: "Draw with your finger or type Japanese. Get each kanji's meaning, readings, and stroke order.", ru: "Рисуй пальцем или вводи японский. Узнай значение каждого кандзи, чтения и порядок черт." },
    "Լսել արտասանությունը": { en: "Listen to pronunciation", ru: "Послушать произношение" },
    "Սեղմիր՝ պատճենելու համար": { en: "Tap to copy", ru: "Нажми, чтобы скопировать" },
    "Օնյոմի": { en: "On'yomi", ru: "Онъёми" },
    "Կունյոմի": { en: "Kun'yomi", ru: "Кунъёми" },
    "Գրելու սխեման հասանելի չէ։": { en: "Stroke diagram unavailable.", ru: "Схема написания недоступна." },
    "Գործածությամբ բառերի օրինակներ": { en: "Example words in use", ru: "Примеры слов" },
    "Երկու կանջիով օրինակ բառ չգտնվեց։": { en: "No example word with two kanji found.", ru: "Пример слова с двумя кандзи не найден." },
    "Կրավորական ձև": { en: "Passive form", ru: "Страдательная форма" },
    "Փնտրում եմ իմաստը…": { en: "Looking up the meaning…", ru: "Ищу значение…" },
    "Այս բառի իմաստը չգտնվեց։": { en: "Meaning of this word not found.", ru: "Значение этого слова не найдено." },
    "Փնտրում եմ…": { en: "Searching…", ru: "Ищу…" },
    "Այս տեքստում կանջի չգտնվեց։ Փորձիր գրել մատիկով կամ մուտքագրել այլ բառ։": { en: "No kanji found in this text. Try drawing it, or type another word.", ru: "В этом тексте кандзи не найдены. Попробуй нарисовать или ввести другое слово." },
    "Կարդում եմ նշանը…": { en: "Reading the character…", ru: "Читаю знак…" },
    "Կրկին փորձում եմ…": { en: "Trying again…", ru: "Пробую снова…" },
    "Ընտրիր քո գրած կանջին": { en: "Pick the kanji you wrote", ru: "Выбери написанный тобой кандзи" },
    "Նախ նկարիր կանջի, ապա սեղմիր «Կարդալ կանջին»։": { en: "Draw a kanji first, then tap “Read kanji”.", ru: "Сначала нарисуй кандзи, потом нажми «Распознать кандзи»." },
    "Ճանաչում եմ նկարածդ…": { en: "Recognizing your drawing…", ru: "Распознаю твой рисунок…" },
    "Չհաջողվեց ճանաչել։ Փորձիր ավելի մեծ ու հստակ նկարել։": { en: "Couldn't recognize it. Try drawing bigger and clearer.", ru: "Не удалось распознать. Попробуй нарисовать крупнее и чётче." },
    "Կարծում եմ՝ նկարեցիր՝": { en: "I think you drew:", ru: "Кажется, ты нарисовал:" },
    "Հեռացվեց հատուկ բառերից": { en: "Removed from starred", ru: "Удалено из избранного" },
    "Ավելացվեց աստղանիշին": { en: "Added to starred", ru: "Добавлено в избранное" },
    "Աստղանիշ՝ կրկնելու համար": { en: "Star for review", ru: "В избранное для повторения" },
    "Աստղանիշ": { en: "Star", ru: "Избранное" },
    "Հատուկ բառեր": { en: "Starred words", ru: "Избранные слова" },
    "Սովորել": { en: "Study", ru: "Учить" },
    "Հատուկ բառերը դատարկ են": { en: "Starred words are empty", ru: "В избранном пусто" },
    "Խմբագրել": { en: "Edit", ru: "Изменить" },
    "Անցնել Միննա の 語彙 կայք": { en: "Go to Միննա の 語彙", ru: "Перейти на Միննա の 語彙" },
    "Քուիզի սխալներից ինքնաշեն հավաքածու": { en: "Set built automatically from your quiz mistakes", ru: "Набор, собранный из ошибок викторины" },
    "Շարունակել": { en: "Continue", ru: "Продолжить" },
    "Չեղարկել": { en: "Discard", ru: "Отменить" },
    "Նախորդ հարցը": { en: "Previous question", ru: "Предыдущий вопрос" },
    "Հաջորդ հարցը": { en: "Next question", ru: "Следующий вопрос" },
    "Քուիզ": { en: "Quiz", ru: "Викторина" },
    "Ֆուրիգանա": { en: "Furigana", ru: "Фуригана" },
    "Ո՞րն է իմաստը": { en: "Which is the meaning?", ru: "Какое это значение?" },
    "Քուիզի համար պետք է առնվազն 2 իմաստով քարտ":
      { en: "A game needs at least 2 cards with meanings", ru: "Для игры нужно минимум 2 карточки со значением" },
    "Բեռնում…": { en: "Loading…", ru: "Загрузка…" },
    "Չհաջողվեց բեռնել մակարդակը։": { en: "Couldn't load the level.", ru: "Не удалось загрузить уровень." },
    "Ստեղծում…": { en: "Creating…", ru: "Создаю…" },
    "Սեղմիր՝ շրջելու համար": { en: "Tap to flip", ru: "Нажми, чтобы перевернуть" },
    "Բացիր ամբողջական էջը": { en: "Open full page", ru: "Открыть полную страницу" },
    "Սեղմիր նշանին՝ ամբողջական էջի համար": { en: "Tap the character for the full page", ru: "Нажми на знак для полной страницы" },
    "Վերջ": { en: "Done", ru: "Готово" },
    "Դեպի հավաքածուներ": { en: "To sets", ru: "К наборам" },
    "Քարտեր չկան։": { en: "No cards.", ru: "Нет карточек." },
    "Հեռացնել": { en: "Remove", ru: "Убрать" },
    "Արդեն ավելացված է": { en: "Already added", ru: "Уже добавлено" },
    "Ավելացնում…": { en: "Adding…", ru: "Добавляю…" },
    "Պահպանվեց": { en: "Saved", ru: "Сохранено" },
  };

  /* ---- phrases with a changing part (numbers, kanji, error text) ----
     Each rule matches the whole line; captured groups ($1…) are kept as-is.
     More specific rules must come before looser ones.                       */
  const RULES = [
    { re: /^Չհաջողվեց բեռնել (.+)-ի տվյալները։$/, en: "Couldn't load data for $1.", ru: "Не удалось загрузить данные для $1." },
    { re: /^Փնտրում եմ (.+)…$/, en: "Looking up $1…", ru: "Ищу $1…" },
    { re: /^Գրելու հերթականությունը՝ (.+)$/, en: "Stroke order: $1", ru: "Порядок черт: $1" },
    { re: /^(\d+) գիծ$/, en: "$1 strokes", ru: "$1 черт" },
    { re: /^(.+)-ի կրավորական ձևը։ Ներքևի կանջիները նույնն են։$/, en: "Passive form of $1. The kanji below are the same.", ru: "Страдательная форма $1. Кандзи ниже те же." },
    { re: /^Ինչ-որ բան այնպես չգնաց՝ (.*)$/, en: "Something went wrong: $1", ru: "Что-то пошло не так: $1" },
    { re: /^«(.+)» կարդացվում է այսպես՝$/, en: "“$1” is read like this:", ru: "«$1» читается так:" },
    { re: /^(\d+) \/ (\d+) օգտագործված$/, en: "$1 / $2 used", ru: "$1 / $2 использовано" },
    { re: /^Սխալներդ պահեցի առանձին հավաքածուում՝ «(.+)»։$/, en: "I saved your mistakes in a set of their own: “$1”.", ru: "Я сохранил твои ошибки в отдельном наборе: «$1»." },
    { re: /^Անավարտ քուիզ · (\d+) \/ (\d+)$/, en: "Unfinished quiz · $1 / $2", ru: "Незаконченная викторина · $1 / $2" },
    { re: /^Գծերի քանակը՝ (\d+)$/, en: "Strokes: $1", ru: "Черт: $1" },
    { re: /^Չհաջողվեց ճանաչել նկարածը՝ (.*)$/, en: "Couldn't recognize the drawing: $1", ru: "Не удалось распознать рисунок: $1" },
    { re: /^Սխալ առաջացավ՝ (.*)։ Էջը գուցե ամբողջությամբ չբեռնվեց — թարմացրու։$/, en: "An error occurred: $1. The page may not have fully loaded — refresh.", ru: "Произошла ошибка: $1. Возможно, страница загрузилась не полностью — обнови." },
    { re: /^Պատճենվեց՝ (.*)$/, en: "Copied: $1", ru: "Скопировано: $1" },
    { re: /^(.+) Հատուկ բառեր$/, en: "$1 Starred words", ru: "$1 Избранные слова" },
    { re: /^(\d+) քարտ · գիտեմ՝ (\d+)$/, en: "$1 cards · know: $2", ru: "$1 карт. · знаю: $2" },
    { re: /^(\d+) քարտ$/, en: "$1 cards", ru: "$1 карт." },
    { re: /^N(\d)՝ ընդամենը (\d+) կանջի · ընտրված՝ (\d+)։ Կարող ես ընտրել տարբեր մակարդակներից՝ ընտրվածը պահվում է։$/, en: "N$1: $2 kanji total · selected: $3. You can pick from different levels — your selection is saved.", ru: "N$1: всего $2 кандзи · выбрано: $3. Можно выбирать из разных уровней — выбор сохраняется." },
    { re: /^Ստեղծել հավաքածու \((\d+)\)$/, en: "Create set ($1)", ru: "Создать набор ($1)" },
    { re: /^(\d+) պարապմունք · վերջինը՝ (\d+)\/(\d+)$/, en: "$1 sessions · last: $2/$3", ru: "$1 сессий · последняя: $2/$3" },
    { re: /^(\d+) պարապմունք$/, en: "$1 sessions", ru: "$1 сессий" },
    { re: /^օգտագործվել է (\d+) անգամ$/, en: "used $1 times", ru: "использован $1 раз" },
    { re: /^(\d+) միավոր$/, en: "$1 points", ru: "$1 очков" },
    { re: /^Օրերի շարք՝ (\d+)$/, en: "Day streak: $1", ru: "Дней подряд: $1" },
    { re: /^Օգտատերեր \((\d+)\)$/, en: "Users ($1)", ru: "Пользователи ($1)" },
    { re: /^(\d+) \/ (\d+) քարտ · (\d+)%$/, en: "$1 / $2 cards · $3%", ru: "$1 / $2 карт. · $3%" },
    { re: /^(\d+) ր առաջ$/, en: "$1 min ago", ru: "$1 мин назад" },
    { re: /^(\d+) ժ առաջ$/, en: "$1 h ago", ru: "$1 ч назад" },
    { re: /^Չհաջողվեց՝ (.*)$/, en: "Failed: $1", ru: "Не удалось: $1" },
    { re: /^Չհաջողվեց բեռնել՝ (.*)$/, en: "Couldn't load: $1", ru: "Не удалось загрузить: $1" },
    { re: /^Իմ հաշիվը՝ (.*)$/, en: "My account: $1", ru: "Мой аккаунт: $1" },
    { re: /^Ստեղծում… (\d+) \/ (\d+)$/, en: "Creating… $1 / $2", ru: "Создаю… $1 / $2" },
    { re: /^Ավելացնում… (\d+) \/ (\d+)$/, en: "Adding… $1 / $2", ru: "Добавляю… $1 / $2" },
    { re: /^Ընտրել ամբողջ N(\d)-ը \((\d+)\)$/, en: "Select all N$1 ($2)", ru: "Выбрать весь N$1 ($2)" },
    { re: /^Հանել ամբողջ N(\d)-ը$/, en: "Unselect all N$1", ru: "Снять весь N$1" },
    { re: /^Հավաքածուն ստեղծվեց՝ (.*)$/, en: "Set created: $1", ru: "Набор создан: $1" },
    { re: /^Գիտեմ՝ (\d+) · Չգիտեմ՝ (\d+)$/, en: "Know: $1 · Don't know: $2", ru: "Знаю: $1 · Не знаю: $2" },
    { re: /^Գիտեմ · (\d+)$/, en: "Know · $1", ru: "Знаю · $1" },
    { re: /^Ճիշտ · (\d+)$/, en: "Right · $1", ru: "Верно · $1" },
    { re: /^Սխալ · (\d+)$/, en: "Wrong · $1", ru: "Неверно · $1" },
    { re: /^Չգիտեմ · (\d+)$/, en: "Don't know · $1", ru: "Не знаю · $1" },
    { re: /^Բաց թողնված · (\d+)$/, en: "Skipped · $1", ru: "Пропущено · $1" },
    { re: /^Կրկնել չիմացածները \((\d+)\)$/, en: "Repeat the unknown ones ($1)", ru: "Повторить незнакомые ($1)" },
    { re: /^Կրկնել սխալները \((\d+)\)$/, en: "Repeat the mistakes ($1)", ru: "Повторить ошибки ($1)" },
    { re: /^Ավելացնել ընտրվածները \((\d+)\)$/, en: "Add selected ($1)", ru: "Добавить выбранные ($1)" },
    { re: /^Ավելացվեց (\d+) կանջի$/, en: "Added $1 kanji", ru: "Добавлено $1 кандзи" },
    { re: /^Ավելացվեց (\d+) բառ$/, en: "Added $1 words", ru: "Добавлено $1 слов" },
    { re: /^(\d+) \/ (\d+) · Հատուկ բառեր · կրկնում$/, en: "$1 / $2 · Starred words · review", ru: "$1 / $2 · Избранные слова · повтор" },
    { re: /^(\d+) \/ (\d+) · Հատուկ բառեր$/, en: "$1 / $2 · Starred words", ru: "$1 / $2 · Избранные слова" },
    { re: /^(\d+) \/ (\d+) · (.+) · կրկնում$/, en: "$1 / $2 · $3 · review", ru: "$1 / $2 · $3 · повтор" },
  ];

  /* footer has links inside, so translate it as a whole block */
  const FOOTER = {
    en: 'Dictionary: <a href="https://kanjiapi.dev" target="_blank" rel="noopener">kanjiapi.dev</a> and <a href="https://jotoba.de" target="_blank" rel="noopener">Jotoba</a>. Stroke diagrams: <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a>. Handwriting is recognized by Google. Runs entirely in your browser.',
    ru: 'Словарь: <a href="https://kanjiapi.dev" target="_blank" rel="noopener">kanjiapi.dev</a> и <a href="https://jotoba.de" target="_blank" rel="noopener">Jotoba</a>. Схемы написания: <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a>. Рукописный ввод распознаёт Google. Работает полностью в твоём браузере.',
  };

  /* look up one trimmed Armenian string; return translation or null */
  function lookup(text) {
    const hit = EXACT[text];
    if (hit) return hit[LANG] || null;
    for (const r of RULES) {
      const m = text.match(r.re);
      if (m) return (r[LANG] || "").replace(/\$(\d)/g, (_, i) => m[i] || "");
    }
    return null;
  }

  const ATTRS = ["title", "aria-label", "placeholder", "alt"];

  function attrsOn(el) {
    // attributes (tooltips, placeholders) are UI text — safe even on lang="ja"
    // elements, since only known Armenian phrases ever match.
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v) { const o = lookup(v.trim()); if (o && o !== v.trim()) el.setAttribute(a, o); }
    }
  }

  function translateEl(node) {
    if (!(node instanceof Element)) return;
    if (node.closest('[lang="ja"]')) return;      // never touch Japanese
    // footer block (has links) — on the node or inside it
    if (node.matches && node.matches("[data-i18n-html]") && FOOTER[LANG]) node.innerHTML = FOOTER[LANG];
    node.querySelectorAll("[data-i18n-html]").forEach((el) => { if (FOOTER[LANG]) el.innerHTML = FOOTER[LANG]; });
    // attributes on this element and every element inside it
    attrsOn(node);
    node.querySelectorAll("*").forEach(attrsOn);
    // text of children + descendants
    walkText(node);
  }

  function walkText(root) {
    const it = document.createNodeIterator(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (n.parentElement && n.parentElement.closest('[lang="ja"]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    const changes = [];
    while ((n = it.nextNode())) {
      const raw = n.nodeValue;
      const o = lookup(raw.trim());
      if (o != null && o !== raw.trim()) {
        const lead = raw.match(/^\s*/)[0];
        const trail = raw.match(/\s*$/)[0];
        changes.push([n, lead + o + trail]);
      }
    }
    for (const [node, val] of changes) node.nodeValue = val;
  }

  function translateAll() {
    // attributes across the page
    document.querySelectorAll("[title],[aria-label],[placeholder],[alt]").forEach(attrsOn);
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      if (FOOTER[LANG]) el.innerHTML = FOOTER[LANG];
    });
    walkText(document.body);
  }

  /* ---- the top-left dropdown ---- */
  function buildSelector() {
    const sel = document.createElement("select");
    sel.className = "lang-select";
    sel.setAttribute("aria-label", "Language");
    for (const l of LANGS) {
      const o = document.createElement("option");
      o.value = l.code; o.textContent = l.label;
      if (l.code === LANG) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", () => {
      localStorage.setItem(STORE, sel.value);
      localStorage.setItem(SHARED, sel.value);   // the sister site reads this one
      location.reload();               // reload = every screen comes back in the new language
    });
    const head = document.querySelector(".site-head") || document.body;
    head.appendChild(sel);
  }

  function start() {
    buildSelector();
    if (LANG === "hy") return;          // Armenian is the source — nothing to swap
    translateAll();
    // keep translating anything the app draws later (results, toasts, cards…)
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "childList") {
          m.addedNodes.forEach((nn) => {
            if (nn.nodeType === 1) translateEl(nn);
            else if (nn.nodeType === 3 && nn.nodeValue && nn.nodeValue.trim()) {
              if (nn.parentElement && nn.parentElement.closest('[lang="ja"]')) return;
              const o = lookup(nn.nodeValue.trim());
              if (o != null && o !== nn.nodeValue.trim()) {
                const raw = nn.nodeValue;
                nn.nodeValue = raw.match(/^\s*/)[0] + o + raw.match(/\s*$/)[0];
              }
            }
          });
        } else if (m.type === "attributes" && m.target.nodeType === 1) {
          const el = m.target;
          const v = el.getAttribute(m.attributeName);
          if (v) { const o = lookup(v.trim()); if (o && o !== v.trim()) el.setAttribute(m.attributeName, o); }
        }
      }
    });
    obs.observe(document.body, {
      childList: true, subtree: true, characterData: false,
      attributes: true, attributeFilter: ATTRS,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
