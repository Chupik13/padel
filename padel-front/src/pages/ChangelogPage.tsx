import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InfoTip from '../components/InfoTip';

interface ChangelogSection {
  title: string;
  items: string[];
}

interface ChangelogVersion {
  version: string;
  date: string;
  description: string;
  sections: ChangelogSection[];
}

interface ChangelogGroup {
  majorMinor: string;
  versions: ChangelogVersion[];
  latestDate: string;
}

function parseChangelog(raw: string): ChangelogVersion[] {
  const blocks = raw.split(/\n## \[/).slice(1);
  return blocks.map((block) => {
    const headerMatch = block.match(/^([^\]]+)\]\s*—\s*(\S+)/);
    const version = headerMatch?.[1] ?? '';
    const date = headerMatch?.[2] ?? '';

    const lines = block.split('\n');
    // Description: lines after header, before first ### section
    const descLines: string[] = [];
    let i = 1;
    for (; i < lines.length; i++) {
      if (lines[i].startsWith('### ')) break;
      if (lines[i].startsWith('---')) continue;
      if (lines[i].trim()) descLines.push(lines[i].trim());
    }
    const description = descLines.join(' ');

    const sections: ChangelogSection[] = [];
    let currentSection: ChangelogSection | null = null;
    for (; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('### ')) {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: line.replace('### ', ''), items: [] };
      } else if (line.startsWith('- ') && currentSection) {
        currentSection.items.push(line.slice(2));
      } else if (line.startsWith('  ') && currentSection && currentSection.items.length > 0) {
        // Continuation line (indented sub-item)
        currentSection.items[currentSection.items.length - 1] += ' ' + line.trim();
      }
    }
    if (currentSection) sections.push(currentSection);

    return { version, date, description, sections };
  });
}

function groupVersions(versions: ChangelogVersion[]): ChangelogGroup[] {
  const map = new Map<string, ChangelogVersion[]>();
  for (const v of versions) {
    const parts = v.version.split('.');
    const key = parts.slice(0, 2).join('.');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return Array.from(map.entries()).map(([majorMinor, vers]) => ({
    majorMinor,
    versions: vers,
    latestDate: vers[0].date,
  }));
}

function renderTextWithBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function pluralizeVersions(count: number, t: (key: string, opts?: Record<string, unknown>) => string, lang: string): string {
  if (lang === 'ru') {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return t('changelog.version_one', { count });
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return t('changelog.version_few', { count });
    return t('changelog.version_many', { count });
  }
  return t(count === 1 ? 'changelog.version_one' : 'changelog.version_other', { count });
}

export default function ChangelogPage() {
  const [versions, setVersions] = useState<ChangelogVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get('highlight') === 'latest';
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const dateFmt = lang === 'ru' ? 'ru-RU' : 'en-US';

  useEffect(() => {
    const url = lang === 'ru'
      ? 'https://raw.githubusercontent.com/Chupik13/padel/main/CHANGELOG.md'
      : 'https://raw.githubusercontent.com/Chupik13/padel/main/CHANGELOG.en.md';

    setLoading(true);
    setError('');
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.text();
      })
      .then((raw) => {
        const parsed = parseChangelog(raw);
        setVersions(parsed);
        // Expand the first group by default
        if (parsed.length > 0) {
          const firstKey = parsed[0].version.split('.').slice(0, 2).join('.');
          setExpanded(new Set([firstKey]));
        }
      })
      .catch(() => setError(t('changelog.loadError')))
      .finally(() => setLoading(false));
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = groupVersions(versions);

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="screen center-content">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen center-content">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="title-row">
        <h2 className="screen-title">{t('changelog.title')}</h2>
        <InfoTip text={t('changelog.title_hint')} />
      </div>
      <div className="changelog-list">
        {groups.map((group, groupIdx) => {
          const isExpanded = expanded.has(group.majorMinor);
          return (
            <div
              key={group.majorMinor}
              className="changelog-group"
            >
              <div
                className="changelog-group-header"
                onClick={() => toggleGroup(group.majorMinor)}
              >
                <div className="changelog-group-left">
                  <span className="changelog-expand-icon">{isExpanded ? '▾' : '▸'}</span>
                  <span className="tag tag-green">v{group.majorMinor}</span>
                  <span className="changelog-date">
                    {new Date(group.latestDate).toLocaleDateString(dateFmt)}
                  </span>
                </div>
                <span className="changelog-group-count">
                  {pluralizeVersions(group.versions.length, t, lang)}
                </span>
              </div>
              {isExpanded && (
                <div className="changelog-group-body">
                  {group.versions.map((release, releaseIdx) => (
                    <div
                      key={release.version}
                      className={`changelog-release${highlight && groupIdx === 0 && releaseIdx === 0 ? ' changelog-highlight' : ''}`}
                    >
                      <div className="changelog-release-header">
                        <span className="tag tag-muted">v{release.version}</span>
                        <span className="changelog-date">
                          {new Date(release.date).toLocaleDateString(dateFmt)}
                        </span>
                      </div>
                      {release.description && (
                        <p className="changelog-description">
                          {renderTextWithBold(release.description)}
                        </p>
                      )}
                      {release.sections.map((section) => (
                        <div key={section.title} className="changelog-section">
                          <h4 className="changelog-section-title">{section.title}</h4>
                          <ul className="changelog-items">
                            {section.items.map((item, i) => (
                              <li key={i}>{renderTextWithBold(item)}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
