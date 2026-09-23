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
      'Веб-приложение клинического регистра: паспорт пациента, матрица фаз заболевания, роли, аудит и аутентификация.',
    domainNote:
      'Модель данных основана на реальной научной работе — лонгитюдном исследовании рекуррентного депрессивного расстройства у пациентов позднего возраста.',
    login: 'Войти',
    about: 'О проекте',
    docs: 'Документация на GitHub',
    docsUrl: 'https://github.com/denzakh/rdd/blob/main/docs/ru/architecture-overview.md',
    thesis: 'Реферат диссертации',
    thesisUrl:
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/ru/abstract/abstract.ru.md',
    cardPassportTitle: 'Паспорт пациента',
    cardPassportText:
      'Демография, социальный статус, вычисляемый возраст — паспортная часть реестра.',
    cardMatrixTitle: 'Матрица фаз 1..N + 98/99',
    cardMatrixText:
      'Анамнестические и текущие фазы: фармакотерапия, ремиссия, психический статус, шкалы.',
    cardReportsTitle: 'Отчёты и экспорт',
    cardReportsText: 'Агрегаты по когорте и деидентифицированный экспорт csv / json / xlsx.',
    cardDictionaryTitle: 'Словарь из реестра',
    cardDictionaryText: 'Data Dictionary автогенерируется из единого TS-реестра полей.',
    pipelineTitle: 'Registry → D1 / Zod / UI',
    pipeline1: 'Единый TS-реестр полей — источник правды для схемы D1, Zod-валидации и UI.',
    pipeline2: '«Поле = колонка»: инвариант, на котором построены все слои.',
    pipeline3: 'Эволюция схемы — только через ресет БД, версионность протокола в baseline.',
    boundariesTitle: 'Границы демо',
    boundariesText:
      'Регуляторика, backup/DR, retention, медицинская валидация и коллаб-sync — сознательно вне scope: это демонстрация архитектуры, а не прод для реальных пациентов.',
    diagramAlt: 'C4-обзор: контекст и контейнеры системы RDD',
    diagramSrc: '/diagrams/c4-overview.svg',
    footerNote: 'Demo: synthetic data only, no real PII',
  },
  about: {
    title: 'О проекте',
    intro:
      'RDD — клинический регистр депрессивных расстройств и одновременно демонстрация инженерии уровня Senior/Architect: registry-driven core, матрица фаз с CAS-конфликтами и виртуализацией, собственные сессии и аудит на Cloudflare D1.',
    registryTitle: 'Registry-driven core',
    registryText:
      'Единый TS-реестр порождает схему D1, Zod-схемы, UI-рендеринг, матрицу и вычисляемые поля. Подробно — rdd-v1.md в GitHub.',
    casTitle: 'CAS-конфликты без потери данных',
    casText:
      'Параллельные правки выявляются по версии записи: конфликт возвращается как 409, данные врача не затираются молча. Подробно — matrix.md в GitHub.',
    virtualizationTitle: 'Виртуализация матрицы',
    virtualizationText:
      'Сетка фаз на сотни ячеек рендерится окном видимости: DOM держит только видимые строки. Подробно — matrix.md в GitHub.',
    securityTitle: 'Безопасность — одной строкой',
    securityText:
      'Собственные D1-сессии, роли и row-level access, аудит в одном batch с записью, регистрации нет — учётки создаёт только admin. Детали — только в GitHub, в рантайм не едут.',
    boundariesTitle: 'Границы демо',
    boundariesText:
      'Регуляторика, шифрование at rest и разделение окружений, backup/DR, retention и удаление данных, медицинская валидация, коллаб-sync — сознательно вынесены за рамки. Пороги эскалации зафиксированы в спеках.',
    thesisLink: 'Реферат диссертации (к.м.н. по психиатрии, Институт Бехтерева, 2015)',
    thesisUrl:
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/ru/abstract/abstract.ru.md',
    docsLink: 'Полная документация на GitHub',
    docsUrl: 'https://github.com/denzakh/rdd/blob/main/docs/ru/architecture-overview.md',
    backHome: '← На главную',
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
