/** Русские UI-строки по неймспейсам (docs/en/i18n.md §3, вариант A). */
export const ru = {
  common: {
    appName: 'RDD · депрессивные расстройства',
    patients: 'Пациенты',
    reports: 'Отчёты',
    dataDictionary: 'Словарь данных',
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
    badge: 'PhD, Bekhterev Institute, 2015',
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
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/en/abstract/abstract.en.md',
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
    thesisLink: 'Реферат диссертации (PhD, Bekhterev Institute, 2015)',
    thesisUrl:
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/en/abstract/abstract.en.md',
    docsLink: 'Полная документация на GitHub',
    docsUrl: 'https://github.com/denzakh/rdd/blob/main/docs/ru/architecture-overview.md',
    backHome: '← На главную',
  },
} as const
