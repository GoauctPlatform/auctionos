import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, HelpCircle, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const Pricing = () => {
  const [annual, setAnnual] = useState(true);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const plans = [
    {
      name: "Advanced",
      desc: "Ideal for individual investors and small operations.",
      price: annual ? 60 : 72,
      displayPrice: annual ? "$60" : "$72",
      features: [
        "Up to 1000 property views/month",
        "Unlimited saved lists",
        "Create field tasks ($5 reward limit)",
        "Opportunity Scoring Engine",
        "1 Team Member",
        "Data export (CSV)",
        "Priority Support",
      ],
      cta: "Start Free Trial",
      highlighted: false,
    },
    {
      name: "Pro",
      desc: "For active investors and small teams needing scale.",
      price: annual ? 130 : 156,
      displayPrice: annual ? "$130" : "$156",
      features: [
        "Up to 2000 property views/month",
        "Unlimited lists + folders",
        "Full task marketplace access",
        "Market Intelligence Dashboard",
        "Team collaboration (2 managers)",
        "Advanced exports (SQL access)",
        "Custom saved searches",
        "API Access & 24/7 Phone Support",
      ],
      cta: "Get Started",
      highlighted: true,
    },
    {
      name: "Enterprise",
      desc: "Institutional investors and hedge funds.",
      displayPrice: "Custom",
      priceLabel: "Starts at $420/mo",
      features: [
        "Everything in Pro",
        "Unlimited team members",
        "Custom API integrations & higher quotas",
        "Private deployment options",
        "Dedicated Account Manager",
        "Custom reporting capabilities",
        "99.9% SLA & Advanced Security",
      ],
      cta: "Contact Sales",
      highlighted: false,
    }
  ];

  const faqs = [
    {
      q: "Is there a free trial?",
      a: "Yes, we offer a 7-day Free Trial. During the trial, you can view up to 20 properties, create 1 list, and test the core functionalities before deciding to upgrade."
    },
    {
      q: "Can I switch plans later?",
      a: "Yes, you can upgrade or downgrade your plan at any time. Prorated charges will be applied automatically to your account."
    },
    {
      q: "What payment methods do you accept?",
      a: "We process payments securely through Stripe, accepting all major credit cards."
    },
    {
      q: "Is my proprietary deal data secure?",
      a: "Absolutely. We employ enterprise-grade security and strict data isolation protocols. Your searches, proprietary lists, and task data are completely siloed, encrypted, and strictly confidential."
    }
  ];

  return (
    <div className="w-full bg-[#050B14] min-h-screen pt-32 pb-24">
      {/* ── Header ── */}
      <div className="max-w-3xl mx-auto px-6 text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold text-white mb-6"
        >
          Simple, transparent pricing
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-slate-400"
        >
          No hidden fees. Choose the plan that best fits your firm's growth stage. All plans start with a 7-day free trial.
        </motion.p>
      </div>

      {/* ── Toggle ── */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center items-center gap-4 mb-16"
      >
        <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
        <button 
          onClick={() => setAnnual(!annual)}
          className="relative w-16 h-8 rounded-full bg-white/10 border border-white/20 flex items-center px-1 transition-colors hover:bg-white/20"
        >
          <motion.div 
            layout
            className="w-6 h-6 bg-blue-500 rounded-full shadow-md"
            animate={{ x: annual ? 32 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>
        <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-slate-400'}`}>
          Annually <span className="text-cyan-400 text-xs ml-1 bg-cyan-400/10 px-2 py-0.5 rounded-full">Save 20%</span>
        </span>
      </motion.div>

      {/* ── Pricing Cards ── */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
        {plans.map((plan, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + (idx * 0.1) }}
            className={`relative rounded-3xl p-8 flex flex-col ${
              plan.highlighted 
                ? 'bg-gradient-to-b from-[#0F1E38] to-[#0A1322] border-2 border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.2)] md:-translate-y-4' 
                : 'bg-[#0A1322] border border-white/10'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full">
                Most Popular
              </div>
            )}
            <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
            <p className="text-slate-400 text-sm h-10 mb-6">{plan.desc}</p>
            
            <div className="mb-8">
              {plan.priceLabel ? (
                <>
                  <div className="text-4xl font-extrabold text-white">{plan.displayPrice}</div>
                  <span className="text-slate-400 text-sm mt-1 block">{plan.priceLabel}</span>
                </>
              ) : (
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.displayPrice}</span>
                  {plan.displayPrice !== "Custom" && (
                    <span className="text-slate-400 text-sm mb-1">/mo</span>
                  )}
                </div>
              )}
            </div>

            <Link
              to="/signup"
              className={`w-full py-3 rounded-full font-semibold text-center transition-all mb-8 ${
                plan.highlighted
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
              }`}
            >
              {plan.cta}
            </Link>

            <div className="space-y-4 mt-auto">
              {plan.features.map((feat, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm">{feat}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── FAQ ── */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <HelpCircle size={40} className="mx-auto text-blue-400 mb-4" />
          <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="bg-[#0A1322] border border-white/10 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-semibold text-white">{faq.q}</span>
                <ChevronDown 
                  size={20} 
                  className={`text-slate-400 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
