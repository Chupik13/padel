const changelog = [
  {
    version: '1.1.0',
    date: '2026-03-03',
    description: 'Управление незавершёнными турнирами, мягкая отмена, страница «Что нового».',
    sections: [
      {
        title: 'Добавлено',
        items: [
          'Страница «Что нового» — история изменений по версиям в боковом меню.',
          'Список незавершённых турниров на вкладке «Играть» — можно зайти, завершить, отменить или завершить досрочно.',
          'Мягкая отмена турниров — отменённые турниры остаются в истории с тегом «Отменена».',
          'Тег количества матчей в истории турниров.',
          'Админ-доступ для управления всеми турнирами.',
        ],
      },
      {
        title: 'Исправлено',
        items: [
          'Прочерк вместо «#1» в профиле, если нет сезонных игр.',
          'Незавершённые турниры без хоста теперь видны админу.',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-03',
    description: 'Первый релиз приложения для управления турнирами по падел-теннису.',
    sections: [
      {
        title: 'Добавлено',
        items: [
          'Сжатие аватарок — автоматическое сжатие до 256x256 и сохранение в WebP. Миграция существующих PNG/JPG при старте сервера.',
          'Сбалансированные форматы турниров — замена фиксированных опций (5/10) на Баланс / Малый / Средний.',
          'Досрочное завершение турнира — кнопка "Завершить досрочно" для товарищеских игр. Неотыгранные матчи получают счёт 8:8.',
          'Общий лидерборд — вкладки "История турниров" / "Общий рейтинг" на странице турниров.',
          'Теги статуса и типа турнира вместо звёздочек.',
        ],
      },
      {
        title: 'Исправлено',
        items: [
          'Битые турниры (без матчей) скрыты из всех списков и автоматически отменяются.',
          'Защита от краша при некорректном индексе матча.',
          'Корректная установка типа игры при загрузке активного турнира.',
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="screen">
      <h2 className="screen-title">Что нового</h2>
      <div className="changelog-list">
        {changelog.map((release) => (
          <div key={release.version} className="changelog-release">
            <div className="changelog-release-header">
              <span className="tag tag-green">v{release.version}</span>
              <span className="changelog-date">{new Date(release.date).toLocaleDateString('ru-RU')}</span>
            </div>
            <p className="changelog-description">{release.description}</p>
            {release.sections.map((section) => (
              <div key={section.title} className="changelog-section">
                <h4 className="changelog-section-title">{section.title}</h4>
                <ul className="changelog-items">
                  {section.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
