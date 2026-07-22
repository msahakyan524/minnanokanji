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
  let LANG = localStorage.getItem(STORE) || "hy";
  if (!LANGS.some((l) => l.code === LANG)) LANG = "hy";
  document.documentElement.lang = LANG;

  /* ---- whole, fixed phrases: Armenian -> { en, ru } ---- */
  const EXACT = {
    "Ֆլեշքարտեր": { en: "Flashcards", ru: "Карточки" },
    "Փակել": { en: "Close", ru: "Закрыть" },
    "+ Նոր հավաքածու ստեղծել": { en: "+ Create new set", ru: "+ Создать новый набор" },
    "Հավաքածուի անուն": { en: "Set name", ru: "Название набора" },
    "Ավելացնել նաև այս կանջիներով բառեր": { en: "Also add words with these kanji", ru: "Также добавить слова с этими кандзи" },
    "Ընտրիր մակարդակ, ապա սեղմիր կանջիների վրա։": { en: "Pick a level, then tap the kanji.", ru: "Выбери уровень, затем нажми на кандзи." },
    "Ստեղծել հավաքածու": { en: "Create set", ru: "Создать набор" },
    "Ետ": { en: "Back", ru: "Назад" },
    "Չգիտեմ": { en: "Don't know", ru: "Не знаю" },
    "Շրջել": { en: "Flip", ru: "Перевернуть" },
    "Գիտեմ": { en: "Know", ru: "Знаю" },
    "Քաշիր աջ՝ գիտեմ, ձախ՝ չգիտեմ։ Համակարգչում՝ →  ←  և Space (շրջել)։": { en: "Swipe right for know, left for don't know. On a computer: →  ←  and Space (flip).", ru: "Свайп вправо — знаю, влево — не знаю. На компьютере: →  ←  и Space (перевернуть)." },
    "Խմբագրում": { en: "Editing", ru: "Редактирование" },
    "Ավելացնել այս կանջիներով բառեր": { en: "Add words with these kanji", ru: "Добавить слова с этими кандзи" },
    "Քարտեր (սեղմիր ✕՝ հեռացնելու համար)": { en: "Cards (tap ✕ to remove)", ru: "Карточки (нажми ✕, чтобы убрать)" },
    "ավելացնել կանջիներ": { en: "add kanji", ru: "добавить кандзи" },
    "Ավելացնել ընտրվածները": { en: "Add selected", ru: "Добавить выбранные" },
    "Պահպանել": { en: "Save", ru: "Сохранить" },
    "Գրել (մատիկով)": { en: "Draw (finger)", ru: "Рисовать (пальцем)" },
    "Վերբեռնել": { en: "Upload", ru: "Загрузить" },
    "Լուսանկարել": { en: "Photo", ru: "Фото" },
    "Մուտքագրել": { en: "Type", ru: "Ввод" },
    "Գրիր բառը ինչպես ուզում ես — գծերի հերթականությունը կարևոր չէ։": { en: "Write the word however you like — stroke order doesn't matter.", ru: "Пиши слово как хочешь — порядок черт не важен." },
    "Նկարելու տարածք": { en: "Drawing area", ru: "Область для рисования" },
    "Ջնջել": { en: "Clear", ru: "Очистить" },
    "Մի քայլ հետ": { en: "Undo", ru: "Отменить" },
    "Մի քայլ առաջ": { en: "Redo", ru: "Повторить" },
    "Կարդալ կանջին": { en: "Read kanji", ru: "Распознать кандзи" },
    "Ընտրիր նկար": { en: "Choose image", ru: "Выбери картинку" },
    "ընտրիր նկար այս սարքից": { en: "choose an image from this device", ru: "выбери картинку с этого устройства" },
    "Միացրու տեսախցիկը": { en: "Turn on camera", ru: "Включить камеру" },
    "Պահիր բառի վրա ու սեղմիր «Կարդալ հիմա»։": { en: "Hold over the word and tap “Read now”.", ru: "Наведи на слово и нажми «Прочитать сейчас»." },
    "Կամ լուսանկարիր": { en: "Or take a photo", ru: "Или сфотографируй" },
    "Կարդալ հիմա": { en: "Read now", ru: "Прочитать сейчас" },
    "Մուտքագրիր կամ փակցրու ճապոներեն տեքստ՝": { en: "Type or paste Japanese text:", ru: "Введи или вставь японский текст:" },
    "օր․՝ 日本語を勉強する": { en: "e.g. 日本語を勉強する", ru: "напр. 日本語を勉強する" },
    "Վերլուծել": { en: "Analyze", ru: "Разобрать" },
    "Քո նկարը": { en: "Your image", ru: "Твоя картинка" },
    "Ճանաչված նշանը — ուղղիր ու վերլուծիր՝": { en: "Recognized character — fix it and analyze:", ru: "Распознанный знак — исправь и разбери:" },
    "Որոնման պատմություն": { en: "Search history", ru: "История поиска" },
    "Գրիր (մատիկով), վերբեռնիր, լուսանկարիր կամ մուտքագրիր ճապոներեն։ Ստացիր յուրաքանչյուր կանջիի իմաստը, ընթերցելու տարբերակներն ու stroke-երի հերթականությունը։": { en: "Draw (with your finger), upload, photograph, or type Japanese. Get each kanji's meaning, readings, and stroke order.", ru: "Рисуй (пальцем), загружай, фотографируй или вводи японский. Узнай значение каждого кандзи, чтения и порядок черт." },
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
    "Այս տեքստում կանջի չգտնվեց։ Փորձիր ավելի հստակ նկար կամ ուղղակի մուտքագրիր նշանները։": { en: "No kanji found in this text. Try a clearer image or just type the characters.", ru: "В этом тексте кандзи не найдены. Попробуй более чёткое изображение или просто введи знаки." },
    "Կարդում եմ նշանը…": { en: "Reading the character…", ru: "Читаю знак…" },
    "Կրկին փորձում եմ…": { en: "Trying again…", ru: "Пробую снова…" },
    "Ահա թե ինչ կարդացի — ուղղիր անհրաժեշտության դեպքում՝": { en: "Here's what I read — fix it if needed:", ru: "Вот что я прочитал — исправь при необходимости:" },
    "Չկարողացա հստակ կարդալ։ Մուտքագրիր ներքևում կամ փորձիր ավելի մեծ ու հստակ լուսանկար։": { en: "Couldn't read it clearly. Type below or try a bigger, clearer photo.", ru: "Не удалось прочитать чётко. Введи ниже или попробуй более крупное и чёткое фото." },
    "Մաքրում եմ նկարը…": { en: "Cleaning up the image…", ru: "Обрабатываю изображение…" },
    "Մաքրում եմ պատկերը…": { en: "Cleaning up the image…", ru: "Обрабатываю изображение…" },
    "Այս զննարկիչը կենդանի տեսախցիկ չի աջակցում": { en: "This browser doesn't support live camera", ru: "Этот браузер не поддерживает камеру" },
    "Տեսախցիկը հասանելի չէ — թույլ տուր մուտքը": { en: "Camera unavailable — allow access", ru: "Камера недоступна — разреши доступ" },
    "Տեսախցիկը դեռ պատրաստ չէ": { en: "Camera not ready yet", ru: "Камера ещё не готова" },
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
    { re: /^Կարդում եմ… (\d+)%$/, en: "Reading… $1%", ru: "Читаю… $1%" },
    { re: /^Չհաջողվեց բացել նկարը՝ (.*)$/, en: "Couldn't open the image: $1", ru: "Не удалось открыть изображение: $1" },
    { re: /^Չհաջողվեց կարդալ՝ (.*)$/, en: "Couldn't read: $1", ru: "Не удалось прочитать: $1" },
    { re: /^Գծերի քանակը՝ (\d+)$/, en: "Strokes: $1", ru: "Черт: $1" },
    { re: /^Չհաջողվեց ճանաչել նկարածը՝ (.*)$/, en: "Couldn't recognize the drawing: $1", ru: "Не удалось распознать рисунок: $1" },
    { re: /^Սխալ առաջացավ՝ (.*)։ Էջը գուցե ամբողջությամբ չբեռնվեց — թարմացրու։$/, en: "An error occurred: $1. The page may not have fully loaded — refresh.", ru: "Произошла ошибка: $1. Возможно, страница загрузилась не полностью — обнови." },
    { re: /^Պատճենվեց՝ (.*)$/, en: "Copied: $1", ru: "Скопировано: $1" },
    { re: /^(.+) Հատուկ բառեր$/, en: "$1 Starred words", ru: "$1 Избранные слова" },
    { re: /^(\d+) քարտ · գիտեմ՝ (\d+)$/, en: "$1 cards · know: $2", ru: "$1 карт. · знаю: $2" },
    { re: /^(\d+) քարտ$/, en: "$1 cards", ru: "$1 карт." },
    { re: /^N(\d)՝ ընդամենը (\d+) կանջի · ընտրված՝ (\d+)։ Կարող ես ընտրել տարբեր մակարդակներից՝ ընտրվածը պահվում է։$/, en: "N$1: $2 kanji total · selected: $3. You can pick from different levels — your selection is saved.", ru: "N$1: всего $2 кандзи · выбрано: $3. Можно выбирать из разных уровней — выбор сохраняется." },
    { re: /^Ստեղծել հավաքածու \((\d+)\)$/, en: "Create set ($1)", ru: "Создать набор ($1)" },
    { re: /^Հավաքածուն ստեղծվեց՝ (.*)$/, en: "Set created: $1", ru: "Набор создан: $1" },
    { re: /^Գիտեմ՝ (\d+) · Չգիտեմ՝ (\d+)$/, en: "Know: $1 · Don't know: $2", ru: "Знаю: $1 · Не знаю: $2" },
    { re: /^Կրկնել չիմացածները \((\d+)\)$/, en: "Repeat the unknown ones ($1)", ru: "Повторить незнакомые ($1)" },
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
