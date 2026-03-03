import React from 'react';
import { Check, Zap, Rocket, Building, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PricingPage() {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Free',
      price: 0,
      period: 'forever',
      description: 'Perfect for exploring automation opportunities',
      icon: Sparkles,
      color: 'zinc',
      features: [
        'Full Automation Heatmap access',
        'View top 3 goldmines',
        'Basic occupation search',
        'Export sample data (JSON/CSV)',
        'Community support'
      ],
      cta: 'Start Free',
      highlighted: false
    },
    {
      name: 'Builder',
      price: 29,
      period: 'month',
      description: 'For indie hackers & automation builders',
      icon: Zap,
      color: 'indigo',
      features: [
        'All 30 Automation Goldmines',
        'Complete implementation guides',
        'Working code samples',
        'Tech stack & API endpoints',
        'Database schemas',
        'Market sizing & revenue projections',
        '1,000 API calls/month',
        'Priority email support'
      ],
      cta: 'Start Building',
      highlighted: true
    },
    {
      name: 'Pro',
      price: 99,
      period: 'month',
      description: 'For teams & growing products',
      icon: Rocket,
      color: 'purple',
      features: [
        'Everything in Builder, plus:',
        'Unlimited API access',
        'New goldmines added weekly',
        'Custom data exports',
        'Advanced filtering',
        'Webhook integrations',
        'Slack/Discord support',
        'Early access to new features'
      ],
      cta: 'Go Pro',
      highlighted: false
    },
    {
      name: 'Enterprise',
      price: 499,
      period: 'month',
      description: 'For agencies & large teams',
      icon: Building,
      color: 'amber',
      features: [
        'Everything in Pro, plus:',
        'White-label access',
        'Custom data collection',
        'Dedicated account manager',
        'SLA guarantee (99.9% uptime)',
        'Custom integrations',
        'On-premise deployment option',
        'Training & onboarding',
        '24/7 phone support'
      ],
      cta: 'Contact Sales',
      highlighted: false
    }
  ];

  const getButtonClass = (plan) => {
    if (plan.highlighted) {
      return 'w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all';
    }
    return 'w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold rounded-lg transition-all';
  };

  const getCardClass = (plan) => {
    if (plan.highlighted) {
      return 'relative bg-gradient-to-b from-indigo-950/50 to-zinc-900 rounded-2xl p-8 border-2 border-indigo-500/50 shadow-xl shadow-indigo-500/20';
    }
    return 'relative bg-zinc-900 rounded-2xl p-8 border border-zinc-800 hover:border-zinc-700 transition-all';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Choose the perfect plan to accelerate your automation journey
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-sm text-emerald-400">All plans include our complete automation database</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div key={plan.name} className={getCardClass(plan)}>
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className={`w-12 h-12 rounded-lg bg-${plan.color}-500/20 border border-${plan.color}-500/30 flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 text-${plan.color}-400`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-zinc-400 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-zinc-500">/{plan.period}</span>
                  </div>
                </div>

                <button
                  onClick={() => plan.name === 'Free' ? navigate('/goldmines') : alert('Payment integration coming soon!')}
                  className={getButtonClass(plan)}
                >
                  {plan.cta}
                </button>

                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-zinc-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ / Additional Info */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold mb-2">💳 No Credit Card Required</h3>
            <p className="text-sm text-zinc-400">
              Start with our free plan immediately. Upgrade only when you're ready to build.
            </p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold mb-2">🔄 Cancel Anytime</h3>
            <p className="text-sm text-zinc-400">
              No long-term contracts. Cancel your subscription with one click, anytime.
            </p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <h3 className="text-lg font-semibold mb-2">📈 ROI Guarantee</h3>
            <p className="text-sm text-zinc-400">
              Build your first automation in days, not weeks. Save 10x your subscription cost.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-indigo-950/50 to-purple-950/50 rounded-2xl p-12 border border-indigo-500/20">
          <h2 className="text-3xl font-bold mb-4">Ready to Build?</h2>
          <p className="text-zinc-400 mb-6 max-w-2xl mx-auto">
            Join hundreds of indie hackers and automation builders shipping products faster with our data.
          </p>
          <button
            onClick={() => navigate('/goldmines')}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all inline-flex items-center gap-2"
          >
            View Top 30 Goldmines <Zap className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
