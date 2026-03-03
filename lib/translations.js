// French translations for UI strings
const translations = {
  en: {
    // Navigation
    'nav.search': 'Search',
    'nav.industries': 'Industries',
    'nav.marketplace': 'Marketplace',
    'nav.dashboard': 'Dashboard',
    'nav.admin': 'Admin',
    'nav.signin': 'Sign in',

    // Homepage
    'hero.title.line1': 'Structured job data',
    'hero.title.line2': 'for AI builders',
    'hero.subtitle': 'Search real workflows. Download machine-ready JSON/CSV. Ship vertical automations and agents 10x faster.',
    'hero.search.placeholder': 'Search occupations, tasks, skills...',
    'hero.ask': 'Ask the data',
    'hero.browse': 'Browse industries',

    // Stats
    'stats.occupations': 'Occupations',
    'stats.tasks': 'Task Statements',
    'stats.skills': 'Skills Mapped',
    'stats.tools': 'Tools & Tech',

    // Features
    'feature.realData.title': 'Real Government Data',
    'feature.realData.desc': '1,016+ occupations from O*NET 30.2 and NOC 2021 with tasks, skills, tools, work context, and education data. Verified, structured, and attribution-compliant.',
    'feature.exports.title': 'Machine-Ready Exports',
    'feature.exports.desc': 'Download clean JSON or CSV per occupation. Every file includes schema documentation and mandatory attribution. Ready for LLM fine-tuning or agent workflows.',
    'feature.ask.title': 'Ask the Data',
    'feature.ask.desc': 'Use natural language to query across all occupations. Find invoice-related tasks, compare automation potential, or discover cross-industry patterns.',

    // Occupation detail
    'occ.tasks': 'Tasks',
    'occ.skills': 'Skills & Knowledge',
    'occ.tools': 'Tools',
    'occ.activities': 'Work Activities',
    'occ.context': 'Work Context',
    'occ.related': 'Related',
    'occ.export': 'Export',

    // Common
    'common.search': 'Search',
    'common.download': 'Download',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.noResults': 'No results found',
    'common.page': 'Page',
    'common.of': 'of',
    'common.prev': 'Prev',
    'common.next': 'Next',
    'common.filters': 'Filters',
    'common.allIndustries': 'All Industries',
    'common.allJobZones': 'All Job Zones',
    'common.clear': 'Clear',
    'common.results': 'results',

    // Attribution
    'attribution.onet': 'Includes O*NET 30.2 data, U.S. Department of Labor/Employment and Training Administration (USDOL/ETA). Licensed under CC BY 4.0.',
    'attribution.noc': 'Contains information from the National Occupational Classification (NOC) 2021, Statistics Canada. Licensed under the Open Government Licence - Canada.',
  },
  fr: {
    // Navigation
    'nav.search': 'Recherche',
    'nav.industries': 'Industries',
    'nav.marketplace': 'March\u00e9',
    'nav.dashboard': 'Tableau de bord',
    'nav.admin': 'Admin',
    'nav.signin': 'Connexion',

    // Homepage
    'hero.title.line1': 'Donn\u00e9es structur\u00e9es',
    'hero.title.line2': 'pour les cr\u00e9ateurs d\'IA',
    'hero.subtitle': 'Recherchez des flux de travail r\u00e9els. T\u00e9l\u00e9chargez des JSON/CSV pr\u00eats pour les machines. Livrez des automatisations verticales 10x plus vite.',
    'hero.search.placeholder': 'Rechercher des professions, t\u00e2ches, comp\u00e9tences...',
    'hero.ask': 'Interroger les donn\u00e9es',
    'hero.browse': 'Parcourir les industries',

    // Stats
    'stats.occupations': 'Professions',
    'stats.tasks': '\u00c9nonc\u00e9s de t\u00e2ches',
    'stats.skills': 'Comp\u00e9tences',
    'stats.tools': 'Outils & Tech',

    // Features
    'feature.realData.title': 'Donn\u00e9es gouvernementales r\u00e9elles',
    'feature.realData.desc': '1 016+ professions de O*NET 30.2 et CNP 2021 avec t\u00e2ches, comp\u00e9tences, outils, contexte de travail et donn\u00e9es sur l\'\u00e9ducation.',
    'feature.exports.title': 'Exportations pr\u00eates pour les machines',
    'feature.exports.desc': 'T\u00e9l\u00e9chargez des JSON ou CSV propres par profession. Chaque fichier inclut la documentation du sch\u00e9ma et l\'attribution obligatoire.',
    'feature.ask.title': 'Interroger les donn\u00e9es',
    'feature.ask.desc': 'Utilisez le langage naturel pour interroger toutes les professions. Trouvez des t\u00e2ches li\u00e9es \u00e0 la facturation ou comparez le potentiel d\'automatisation.',

    // Occupation detail
    'occ.tasks': 'T\u00e2ches',
    'occ.skills': 'Comp\u00e9tences & Connaissances',
    'occ.tools': 'Outils',
    'occ.activities': 'Activit\u00e9s de travail',
    'occ.context': 'Contexte de travail',
    'occ.related': 'Reli\u00e9es',
    'occ.export': 'Exporter',

    // Common
    'common.search': 'Rechercher',
    'common.download': 'T\u00e9l\u00e9charger',
    'common.save': 'Sauvegarder',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement...',
    'common.noResults': 'Aucun r\u00e9sultat trouv\u00e9',
    'common.page': 'Page',
    'common.of': 'de',
    'common.prev': 'Pr\u00e9c.',
    'common.next': 'Suiv.',
    'common.filters': 'Filtres',
    'common.allIndustries': 'Toutes les industries',
    'common.allJobZones': 'Toutes les zones',
    'common.clear': 'Effacer',
    'common.results': 'r\u00e9sultats',

    // Attribution
    'attribution.onet': 'Inclut les donn\u00e9es O*NET 30.2, U.S. Department of Labor/Employment and Training Administration (USDOL/ETA). Sous licence CC BY 4.0.',
    'attribution.noc': 'Contient des informations de la Classification nationale des professions (CNP) 2021, Statistique Canada. Sous la Licence du gouvernement ouvert - Canada.',
  },
};

export function t(key, lang = 'en') {
  return translations[lang]?.[key] || translations['en']?.[key] || key;
}

export default translations;
