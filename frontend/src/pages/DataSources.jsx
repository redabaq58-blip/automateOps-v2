import React from 'react';
import { Database, CheckCircle, ExternalLink, Shield } from 'lucide-react';

export default function DataSources() {
  const sources = [
    {
      name: 'O*NET 30.2',
      organization: 'U.S. Department of Labor',
      type: 'Primary Occupation Database',
      description: 'Comprehensive occupational information database containing detailed descriptions of 1,016 occupations including tasks, skills, knowledge, abilities, work activities, work context, and tools/technology.',
      data_provided: [
        '1,016 US occupations',
        '18,796 task statements',
        '31,290 skills records',
        '46,488 abilities records',
        '74,435 tools & technology records',
        '23 industry groups (SOC classification)'
      ],
      license: 'CC BY 4.0 (Creative Commons Attribution)',
      url: 'https://www.onetcenter.org/',
      update_frequency: 'Annual',
      last_updated: '2024',
      enterprise_grade: true
    },
    {
      name: 'NOC 2021',
      organization: 'Statistics Canada',
      type: 'Canadian Occupation Classification',
      description: 'National Occupational Classification system providing detailed occupation information for the Canadian labor market including duties, employment requirements, and related occupations.',
      data_provided: [
        '822 Canadian occupations',
        '3,095 occupation elements',
        '1,467 NOC ↔ O*NET crosswalk mappings',
        'Employment requirements',
        'Main duties and responsibilities'
      ],
      license: 'Open Government Licence - Canada',
      url: 'https://www.statcan.gc.ca/en/subjects/standard/noc/2021/',
      update_frequency: 'Every 5 years',
      last_updated: '2021',
      enterprise_grade: true
    },
    {
      name: 'ESCO v1.2.1',
      organization: 'European Commission',
      type: 'European Skills, Competences, Qualifications and Occupations',
      description: 'European multilingual classification of occupations, skills, and qualifications providing detailed occupation profiles with essential and optional skills.',
      data_provided: [
        '100 European occupations (sampled from 3,039 total)',
        'Essential skills mappings',
        'Optional skills recommendations',
        'ISCO-08 code alignments',
        'Multilingual titles (EN/FR)'
      ],
      license: 'EU Open Data',
      url: 'https://ec.europa.eu/esco/',
      update_frequency: 'Periodic',
      last_updated: '2024',
      enterprise_grade: true
    },
    {
      name: 'GPT-4o AI Analysis',
      organization: 'OpenAI (via Emergent Integrations)',
      type: 'Task Automation Enrichment',
      description: 'AI-powered analysis of task statements to provide automation scores, automation types (RPA/LLM/Hybrid), edge cases, and implementation considerations.',
      data_provided: [
        '457 tasks enriched (2.4% coverage)',
        'Automation scores (0-100%)',
        'Automation type classification',
        'Edge case identification',
        'Regulatory notes (Canada/Quebec)'
      ],
      license: 'Proprietary',
      url: 'https://openai.com/',
      update_frequency: 'On-demand',
      last_updated: '2025-03-03',
      enterprise_grade: true
    },
    {
      name: 'SOC Incident Response Playbooks',
      organization: 'SOCFortress (Open Source Community)',
      type: 'Security Operations Workflows',
      description: 'Real-world incident response playbooks from security operations centers including detailed procedures for handling security incidents, threats, and breaches.',
      data_provided: [
        '10 security playbooks',
        '168 workflow steps',
        'Incident response procedures',
        'Threat investigation workflows',
        'Tool recommendations'
      ],
      license: 'Open Source (GitHub)',
      url: 'https://github.com/socfortress/Playbooks',
      update_frequency: 'Community-driven',
      last_updated: '2025',
      enterprise_grade: true
    }
  ];

  const methodology = [
    {
      title: 'Data Collection',
      description: 'Government databases, official classification systems, and vetted open-source repositories'
    },
    {
      title: 'Quality Assurance',
      description: 'All data sources are enterprise-grade, regularly updated, and from authoritative organizations'
    },
    {
      title: 'AI Enrichment',
      description: 'GPT-4o analysis adds automation intelligence while preserving source data integrity'
    },
    {
      title: 'Cross-Referencing',
      description: 'Occupations mapped across US, Canadian, and European systems for international coverage'
    },
    {
      title: 'Attribution',
      description: 'Full source attribution maintained on all exports for license compliance'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-10 h-10 text-indigo-400" />
            <h1 className="text-5xl font-bold">Data Sources & Methodology</h1>
          </div>
          <p className="text-xl text-zinc-300 max-w-3xl">
            Enterprise-grade occupation data from authoritative government sources and vetted open-source repositories
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Trust Indicators */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
            <div className="text-3xl font-bold text-indigo-400">5</div>
            <div className="text-sm text-zinc-400">Data Sources</div>
          </div>
          <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
            <div className="text-3xl font-bold text-green-400">~400K</div>
            <div className="text-sm text-zinc-400">Total Records</div>
          </div>
          <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
            <div className="text-3xl font-bold text-amber-400">3</div>
            <div className="text-sm text-zinc-400">Countries</div>
          </div>
          <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
            <div className="text-3xl font-bold text-purple-400">100%</div>
            <div className="text-sm text-zinc-400">Attributed</div>
          </div>
        </div>

        {/* Primary Sources */}
        <div className="space-y-6 mb-12">
          <h2 className="text-2xl font-bold mb-6">Primary Data Sources</h2>
          {sources.map((source, idx) => (
            <div key={idx} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold">{source.name}</h3>
                      {source.enterprise_grade && (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded border border-emerald-500/30 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Enterprise-Grade
                        </span>
                      )}
                    </div>
                    <div className="text-zinc-400 mb-1">{source.organization}</div>
                    <div className="text-sm text-zinc-500">{source.type}</div>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-colors"
                  >
                    Visit Source <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <p className="text-zinc-300 mb-6">{source.description}</p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-400 mb-3">Data Provided:</h4>
                    <ul className="space-y-2">
                      {source.data_provided.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-zinc-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">License</div>
                      <div className="text-sm text-zinc-300">{source.license}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Update Frequency</div>
                      <div className="text-sm text-zinc-300">{source.update_frequency}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Last Updated</div>
                      <div className="text-sm text-zinc-300">{source.last_updated}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Methodology */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Our Methodology</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {methodology.map((item, idx) => (
              <div key={idx} className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
                <h3 className="text-lg font-semibold mb-2 text-indigo-400">{item.title}</h3>
                <p className="text-sm text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Attribution Notice */}
        <div className="mt-12 p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-blue-400">Attribution & Compliance</h3>
          <p className="text-sm text-zinc-300">
            All exports include proper source attribution and license information. O*NET data is provided under CC BY 4.0 license requiring attribution to the U.S. Department of Labor. NOC data follows Open Government Licence - Canada requirements. ESCO data complies with EU Open Data policies.
          </p>
        </div>
      </div>
    </div>
  );
}
