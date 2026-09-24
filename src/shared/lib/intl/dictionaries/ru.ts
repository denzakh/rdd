/** Русские UI-строки по неймспейсам (docs/en/i18n.md §3, вариант A). */
export const ru = {
  common: {
    appName: 'RDD · депрессивные расстройства',
    patients: 'Пациенты',
    reports: 'Отчёты',
    dataDictionary: 'Словарь данных',
    documentation: 'Документация',
    search: 'Найти',
    save: 'Сохранить',
    saving: 'Сохранение…',
    logout: 'Выйти',
    backToList: '← к списку',
    open: 'Открыть →',
    download: 'Скачать',
    noData: 'Нет данных',
    readOnly: 'Доступ только для чтения.',
    continueWork: 'Продолжить работу',
  },
  auth: {
    loginTitle: 'Вход в регистр',
    password: 'Пароль',
    login: 'Войти',
    loggingIn: 'Вход…',
    currentPassword: 'Текущий пароль',
    newPassword: 'Новый пароль',
    repeatNewPassword: 'Повторите новый пароль',
    changePassword: 'Сменить пароль',
    passwordChanged: 'Пароль изменён.',
  },
  patients: {
    title: 'Пациенты',
    newPatient: 'Новый пациент',
    searchPlaceholder: '№ пациента',
    notFound: 'Пациентов не найдено.',
    cardTitle: 'Пациент',
    edit: 'изменить',
    phases: 'Фазы',
    matrix: 'Матрица →',
  },
  dataDictionary: {
    pageTitle: 'Словарь данных (Data Dictionary)',
    autoFrom: 'Автогенерируется из реестра полей',
    totalFields: 'Всего полей',
    nullMeans:
      'NULL означает, что значение не заполнено; вычисляемые поля не хранятся в БД и рассчитываются на лету.',
    colField: 'Поле (ID)',
    colName: 'Название',
    colType: 'Тип (логич./SQL)',
    colAllowed: 'Допустимые значения',
    colStorage: 'Источник в БД',
    currentOnly: 'только текущий статус',
    computed: 'вычисляемое',
    notStored: 'не хранится (расчёт)',
  },
  landing: {
    badge: 'к.м.н. по психиатрии, Институт Бехтерева, 2015',
    title: 'RDD — Регистр депрессивных расстройств',
    subtitle:
      'Специализированный клинический веб-регистр для лонгитюдного ведения и анализа депрессий позднего возраста. Инженерная демонстрация уровня Senior/Architect: единый TS-реестр полей, виртуализированная матрица фаз и Edge-рантайм на Cloudflare.',
    domainNote:
      'Разработан на стыке медицины и инженерии: структура фаз заболевания, динамика психофармакотерапии и расчёт качества ремиссии основаны на реальном 10-летнем клиническом исследовании автора.',
    login: 'Войти в демо',
    about: 'Подробнее о проекте',
    docs: 'Архитектурный обзор (GitHub)',
    docsUrl: 'https://github.com/denzakh/rdd/blob/main/docs/ru/architecture-overview.md',
    thesis: 'Реферат диссертации (к.м.н.)',
    thesisUrl:
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/ru/abstract/abstract.ru.md',
    targetAudienceTitle: 'Для кого и какую задачу решает система',
    forDoctorsTitle: 'Для врачей и научных исследователей',
    forDoctorsText:
      'Устраняет хаос разрозненных таблиц и бумажных карт: связывает анамнез, психометрические шкалы (HAM-D, MMSE), смену терапевтических схем и исходы по всем фазам болезни с мгновенным расчётом когортной статистики.',
    forTechTitle: 'Для нанимателей и техлидов',
    forTechText:
      'Демонстрация бескомпромиссной архитектуры: Single Source of Truth на TypeScript без рассинхрона слоёв БД/валидации/UI, оптимистический CAS-контроль версий и нулевой cold start на бессерверной инфраструктуре.',
    cardPassportTitle: 'Паспорт пациента и анамнез',
    cardPassportText:
      'Социально-демографический профиль, отягощённость наследственности, возраст манифеста и коморбидность с автоматическим расчётом возраста на момент включения.',
    cardMatrixTitle: 'Матрица фаз заболевания',
    cardMatrixText:
      'Сквозное ведение анамнестических эпизодов (1..N), текущего статуса (98) и катамнеза (99): динамика симптоматики, дозировки препаратов, причины смены терапии и шкалы.',
    cardReportsTitle: 'Аналитика и де-идентификация',
    cardReportsText:
      'Автоматический подсчёт длительности межфазных интервалов, сезонности и структуры фаз, а также экспорт де-идентифицированных датасетов (CSV, JSON, Excel) для научных публикаций.',
    cardDictionaryTitle: 'Самодокументируемый словарь',
    cardDictionaryText:
      'Живой Data Dictionary, формируемый напрямую из единого реестра полей: врачи видят клинический смысл признаков, а разработчики — типы, валидаторы и колонки БД.',
    techHighlightsTitle: 'Ключевые инженерные решения',
    highlightRegistryTitle: 'Registry-Driven Core (SSOT)',
    highlightRegistryText:
      'Единый декларируемый TS-реестр полей генерирует схему Cloudflare D1 (SQLite), Zod-схемы валидации, UI-поля ввода и Data Dictionary. Инвариант «поле = колонка» исключает рассинхрон слоёв.',
    highlightMatrixTitle: 'Виртуализированный грид с CAS',
    highlightMatrixText:
      'Виртуализация TanStack Virtual + CSS Grid со sticky-колонками без JS-синхронизации скролла. Оптимистическая блокировка (Compare-And-Swap) с кодом 409 защищает клинические данные врачей от тихой перезаписи.',
    highlightEdgeTitle: 'Бессерверный Edge-стек и безопасность',
    highlightEdgeText:
      'Next.js 16 на Cloudflare Workers + D1. Криптография через Web Crypto (PBKDF2-SHA256, 600k итераций), сессии в HttpOnly cookie с SHA-256 в БД, Row-Level Access (data_scope) и hash-chain аудит мутаций.',
    diagramTitle: 'Архитектурный контекст системы (C4 Model)',
    diagramAlt: 'C4-обзор: контекст и контейнеры системы RDD',
    diagramSrc: '/diagrams/c4-overview.svg',
    boundariesTitle: 'Границы демонстрационной версии',
    boundariesText:
      'Система наполнена синтетическими клиническими данными (без реальных ПДн). Регуляторный комплаенс (152-ФЗ / HIPAA), WAF-защита от L7-флуда и регулярное резервное копирование D1 зафиксированы в спецификациях как точки эскалации для промышленного контура.',
    footerNote:
      'RDD — Clinical Depressive Disorders Registry · Демонстрационный проект: синтетические данные, PII отсутствуют',
  },
  about: {
    title: 'О проекте RDD (Registry-Driven Development)',
    intro:
      'RDD — это специализированный веб-регистр для лонгитюдного ведения пациентов с рекуррентным депрессивным расстройством и одновременно полнофункциональное архитектурное портфолио уровня Senior / Staff Engineer. Система решает ключевую проблему медицинских исследований: сбор сложноструктурированных динамических клинических данных с бескомпромиссной защитой от потери информации и рассинхрона кодовой базы.',
    clinicalSectionTitle: '1. Клинический контекст и предыстория',
    clinicalBackground:
      'В основе модели данных регистра лежит 10-летнее исследование рекуррентного депрессивного расстройства у пациентов позднего возраста, проведённое автором в Национальном медицинском исследовательском центре психиатрии и неврологии им. В.М. Бехтерева (Санкт-Петербург, 2015 г., степень кандидата медицинских наук).',
    clinicalProblemTitle: 'Какую клиническую проблему решает проект?',
    clinicalProblemText:
      'В психиатрических исследованиях традиционные инструменты (электронные таблицы Excel, универсальные опросники Google Forms, универсальные системы типа RedCap) быстро заходят в тупик: они не умеют валидировать временную последовательность аффективных фаз, не связывают смену фармакотерапии с динамикой симптомов и допускают противоречивые данные. RDD переносит врачебную логику непосредственно в архитектуру системы: нормализованный паспорт пациента, динамическая матрица фаз (1..N, поступление 98, катамнез 99), автоматический расчёт чистой ремиссии и встроенные психометрические шкалы (HAM-D, MMSE, тест рисования часов).',
    archSectionTitle: '2. Архитектура: Registry-Driven Core (SSOT)',
    archRegistryText:
      'Главная проблема медицинских систем с десятками клинических признаков — постоянный рассинхрон между схемой базы данных, валидацией на бэкенде, UI-компонентами форм и словарём данных. В RDD реализован подход Single Source of Truth:',
    archRegistryPoint1:
      'Единый декларативный TypeScript-объект (src/shared/config/registry/) описывает каждое поле: тип данных SQLite, UI-компонент, диапазон допустимых значений (min/max), клинические варианты выбора и формулы вычисления.',
    archRegistryPoint2:
      'Из этого реестра генератор gen:d1 автоматически формирует D1-миграции, валидаторы Zod строятся на лету (to-zod.ts), интерфейс карточек рендерится декларативно, а Data Dictionary обновляется без участия разработчика.',
    archRegistryPoint3:
      'Инвариант «Поле = Колонка»: бинарные признаки хранятся как плоские INTEGER 0/1. Это позволило отказаться от непрозрачных JSON-полей и тяжелых EAV-паттернов, обеспечив прямые высокоскоростные SQL-агрегаты.',
    matrixSectionTitle: '3. Высокопроизводительная матрица фаз (Matrix Grid)',
    matrixText:
      'Сетка фаз — центральный инструмент врача, требующий одновременного отображения сотен ячеек динамики заболевания:',
    matrixPoint1:
      'Гибридный скролл без JS-синхронизации: строки рендерятся через CSS Grid, где левая колонка наименования признака имеет нативное правило position: sticky; left: 0. Это исключило рассинхронизацию независимых слоев прокрутки.',
    matrixPoint2:
      'Виртуализация TanStack Virtual: рендерятся исключительно строки, попадающие в видимый viewport экрана, что гарантирует мгновенный отклик даже на больших клинических картах.',
    matrixPoint3:
      'Атомарное состояние на Zustand: изменение ячейки обновляет только конкретный DOM-узел через селекторы подписки, исключая перерисовку всей таблицы.',
    matrixPoint4:
      'Защита от потери данных (Compare-And-Swap): одновременные правки нескольких врачей проверяются по версии записи. В случае конфликта (HTTP 409 Conflict) врач видит интерактивный дифф своего значения и версии коллеги — тихая перезапись исключена на уровне архитектуры.',
    edgeSectionTitle: '4. Edge-инфраструктура, аудит и безопасность',
    edgeText:
      'Приложение развернуто в бессерверном рантайме Cloudflare (Workers + Pages + D1 Database) на базе Next.js 16 App Router с нулевым cold start:',
    edgeCryptoText:
      'Криптография на Web Crypto API: из-за отсутствия node:crypto на Edge хэширование паролей реализовано через PBKDF2-SHA256 (600 000 итераций) с солью. Токен сессии хранится в HttpOnly; Secure; SameSite=Lax cookie, а в БД — только SHA-256 дайджест.',
    edgeRlsText:
      'Разграничение доступа к данным (Row-Level Access): декларативный data_scope пользователя (all / site / assigned) автоматически инкапсулируется в репозиторий запросов, предотвращая IDOR-уязвимости.',
    edgeAuditText:
      'Криптографический аудит (Append-Only): каждая мутация пишется в audit_log в одном batch с данными. Цепочка связывается хэшами (prev_hash/entry_hash), исключая незаметную подмену истории болезни.',
    boundariesSectionTitle: '5. Границы демонстрационного проекта и продакшен',
    boundariesIntro:
      'Проект создан для демонстрации инженерных подходов системного проектирования и доменной экспертизы. В спеках явно разграничены текущий функционал и требования боевого контура:',
    boundariesScope1:
      'Текущий контур: полностью функциональная бизнес-логика регистра с синтетическими медицинскими профилями на серверах Cloudflare.',
    boundariesScope2:
      'Продакшен-эскалация: для эксплуатации с реальными пациентами требуется сертификация (152-ФЗ / HIPAA), Cloudflare WAF, Point-in-Time Recovery бэкапы D1 и интеграция с внешними МИС/ЕГИСЗ через HL7 FHIR.',
    thesisLink: 'Реферат кандидатской диссертации (Институт им. Бехтерева)',
    thesisUrl:
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/ru/abstract/abstract.ru.md',
    docsLink: 'Архитектурный обзор (GitHub)',
    docsUrl: 'https://github.com/denzakh/rdd/blob/main/docs/ru/architecture-overview.md',
    backHome: '← На главную',
    openDemo: 'Перейти в демо-интерфейс',
  },
  homeHub: {
    title: 'Рабочий хаб',
    greeting: 'Вы вошли как',
    searchPlaceholder: '№ пациента',
    search: 'Найти',
    cardPatientsTitle: 'Пациенты',
    cardPatientsText:
      'Список и карточки пациентов: поиск по номеру, паспорт, переход в матрицу фаз.',
    cardReportsTitle: 'Отчёты',
    cardReportsText: 'Агрегаты по когорте и де-идентифицированный экспорт csv / json / xlsx.',
    cardDictionaryTitle: 'Словарь данных',
    cardDictionaryText:
      'Data Dictionary автогенерируется из реестра полей и синхронен со схемой D1.',
    cardDocsTitle: 'Документация',
    cardDocsText:
      'Курированные выжимки: архитектура, безопасность, NFR/RTO/RPO, roadmap. Полные тексты — на GitHub.',
  },
  docsHub: {
    title: 'Документация',
    intro:
      'Курированные выжимки вместо зеркала всех md: полные тексты живут в GitHub (docs/ru + docs/en) и в рантайм не копируются.',
    architectureTitle: 'Архитектура (выжимка)',
    architectureText:
      'Реестр полей — источник правды: один TS-реестр порождает схему D1, Zod-валидацию и UI. Матрица фаз рендерится окном видимости, параллельные правки выявляются через CAS (409), аудит пишется в одном batch с записью.',
    architectureLink: 'architecture-overview.md на GitHub',
    architectureUrl: 'https://github.com/denzakh/rdd/blob/main/docs/ru/architecture-overview.md',
    securityTitle: 'Безопасность: угроза → мера → где',
    securityText:
      'Выжимка из auth.md и threat-model.md (STRIDE); полные таблицы — по ссылкам ниже.',
    securityColThreat: 'Угроза',
    securityColMeasure: 'Мера',
    securityColWhere: 'Где',
    securityRow1: 'Подбор пароля и перебор логинов',
    securityMeasure1:
      'Rate-limit на вход; одинаковое время ответа для существующих и несуществующих email',
    securityWhere1: 'auth.md §6',
    securityRow2: 'Угон сессии через cookie',
    securityMeasure2:
      'Собственные сессии на D1: HttpOnly-cookie, скользящий TTL, в БД только хэш токена',
    securityWhere2: 'auth.md §5',
    securityRow3: 'IDOR: clinician видит чужих пациентов',
    securityMeasure3:
      'Row-level access: data_scope у пользователя + scope-репозиторий на всех выборках',
    securityWhere3: 'auth.md — Row-level access',
    securityRow4: 'Мутация мимо UI (роль readonly)',
    securityMeasure4:
      'Двойная проверка: canWrite() в каждом Server Action + whitelist полей и Zod-схема',
    securityWhere4: 'spec-stage-1 §1, §3',
    securityRow5: 'Подмена данных и аудита',
    securityMeasure5:
      'actor_id в каждой мутации; audit_log append-only с hash-chain, целостность проверяет verifyChain()',
    securityWhere5: 'matrix.md §6.6',
    securityAuthLink: 'auth.md на GitHub',
    securityAuthUrl: 'https://github.com/denzakh/rdd/blob/main/docs/ru/auth.md',
    securityThreatLink: 'threat-model.md на GitHub',
    securityThreatUrl: 'https://github.com/denzakh/rdd/blob/main/docs/ru/threat-model.md',
    nfrTitle: 'NFR / RTO / RPO (выжимка)',
    nfrText:
      'Демо: SLA не гарантируется — один инстанс D1 и ручной деплой. Прод-цели: availability ≥ 99,5 % в месяц, SLO по 5xx < 0,5 %, RTO ≤ 4 ч, RPO ≤ 1 ч, TTI списка пациентов ≤ 1 с.',
    nfrLink: 'nfr.md на GitHub',
    nfrUrl: 'https://github.com/denzakh/rdd/blob/main/docs/ru/nfr.md',
    roadmapTitle: 'Roadmap: spec-stage-1..4 ✅',
    roadmapText:
      'spec-stage-1..4 ✅: реальные мутации и аудит, entities и страницы пациента, auth v1.5 (смена пароля, rate-limit, инвайты), качество и CI. Сверх плана — row-level access (data_scope) и согласие v1; запланирован collab-режим (polling).',
    roadmapLink: 'roadmap.md на GitHub',
    roadmapUrl: 'https://github.com/denzakh/rdd/blob/main/docs/ru/roadmap.md',
    dictionaryTitle: 'Словарь данных (живой)',
    dictionaryText:
      'Единственный registry-driven пример в рантайме: страница собирается из того же TS-реестра полей, что и схема D1, поэтому здесь не пересказывается.',
    dictionaryLink: 'Открыть /data-dictionary →',
  },
} as const
