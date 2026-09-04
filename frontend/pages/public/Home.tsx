import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe2, Briefcase, Camera, ShieldCheck, Map, Activity, Hammer, Lock, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const Home = () => {
  const { t } = useLanguage();
  return (
    <div className="w-full bg-[#050B14]">
      {/* ── 1. Hero Section (Video Background) ── */}
      <section className="relative h-[90vh] min-h-[600px] w-full flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050B14]/80 via-[#050B14]/40 to-[#050B14] z-10" />
          <img
            src="/img_7507.png"
            alt="Hero Background"
            className="w-full h-full object-cover object-center opacity-60"
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 max-w-5xl mx-auto px-6 text-center pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            End-to-End Tax Property Intelligence
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1]"
          >
            Bridging Data with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Real-World Execution
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-light"
          >
            GoAuct is a vertical PropTech ecosystem designed to solve the critical gap between fragmented public auction records and actionable real-world investments.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/signup"
              className="group flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] w-full sm:w-auto"
            >
              {t('auth.signupTitle')}
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </Link>
            <Link
              to="/pricing"
              className="flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all w-full sm:w-auto"
            >
              See Pricing
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── 2. The Ecosystem Trifecta ── */}
      <section className="relative z-30 -mt-24 max-w-7xl mx-auto px-6 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Investor Persona */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            whileHover={{ y: -10 }}
            className="bg-[#0A1322]/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-8 shadow-[0_10px_40px_-10px_rgba(37,99,235,0.2)] group transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Globe2 className="text-blue-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Global Investors</h3>
            <p className="text-sm font-semibold text-blue-400 mb-4 uppercase tracking-wider">No Experience Required</p>
            <p className="text-slate-400 leading-relaxed">
              Identify top-tier deals with our Smart AI Deal Finder. GoAuct organizes chaotic county announcements into clean, actionable intelligence. Acquire US tax properties from anywhere in the world.
            </p>
          </motion.div>

          {/* Realtor Persona */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -10 }}
            className="bg-[#0A1322]/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-[0_10px_40px_-10px_rgba(6,182,212,0.2)] group transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Briefcase className="text-cyan-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Licensed Realtors</h3>
            <p className="text-sm font-semibold text-cyan-400 mb-4 uppercase tracking-wider">US License Required</p>
            <p className="text-slate-400 leading-relaxed">
              Act as premium consultants and brokers within our ecosystem. Offer your services directly to investors, coordinate post-auction property listings, and facilitate secure real estate transactions.
            </p>
          </motion.div>

          {/* Field Agent Persona */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ y: -10 }}
            className="bg-[#0A1322]/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.2)] group transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Camera className="text-emerald-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Field Agents</h3>
            <p className="text-sm font-semibold text-emerald-400 mb-4 uppercase tracking-wider">US Work Permit Required</p>
            <p className="text-slate-400 leading-relaxed">
              Earn extra income performing localized Due Diligence tasks. Accept micro-tasks to photograph properties and assess structural conditions. All data is securely mediated and GPS geo-validated.
            </p>
          </motion.div>

        </div>
      </section>

      {/* ── 3. The GoAuct Engine (Platform Capabilities) ── */}

      {/* ── 4. The GoAuct Master Plan (Roadmap) ── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-sm font-black uppercase tracking-widest text-blue-500 mb-2 block">Our Vision</span>
          <h2 className="text-4xl font-bold text-white mb-4">The GoAuct Master Plan</h2>
          <p className="text-slate-400 max-w-3xl mx-auto">
            We are building the first fully decentralized, end-to-end operational network for property acquisition, management, and frictionless transfer.
          </p>
        </div>

        <div className="relative border-l-2 border-white/10 ml-4 md:ml-12 space-y-12 pb-12">
          
          {/* Phase 1: Data Intelligence (Current) */}
          <div className="relative pl-8 md:pl-16">
            <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center border-4 border-[#050B14]">
              <span className="w-2 h-2 rounded-full bg-white"></span>
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1">
                <span className="text-blue-400 font-bold text-sm uppercase tracking-wider">Phase 1 (Current)</span>
                <h3 className="text-2xl font-bold text-white mt-1 mb-3">Discovery & Intelligence</h3>
                <p className="text-slate-400 leading-relaxed">
                  Transforming chaotic county tax auction announcements into organized, queryable data. We aggregate property details, owner information, and A+ to F AI scoring to surface the best deals instantly.
                </p>
              </div>
              <div className="md:w-1/3 w-full bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
                <Map className="text-blue-400 shrink-0" size={28} />
                <span className="text-sm text-slate-300">Live property maps, Tax Records, and GPS field verification.</span>
              </div>
            </div>
          </div>

          {/* Phase 2: Acquisition & ROI Tracking */}
          <div className="relative pl-8 md:pl-16">
            <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border-4 border-[#050B14]">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1">
                <span className="text-slate-500 font-bold text-sm uppercase tracking-wider">Phase 2 (In Development)</span>
                <h3 className="text-2xl font-bold text-white mt-1 mb-3">Acquisition & Asset Management</h3>
                <p className="text-slate-400 leading-relaxed">
                  Users can execute property acquisitions directly through the GoAuct team. Once acquired, properties enter a private digital vault where investors can manage them, track ROI, and monitor ongoing renovations.
                </p>
              </div>
              <div className="md:w-1/3 w-full bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
                <Activity className="text-slate-400 shrink-0" size={28} />
                <span className="text-sm text-slate-300">Financial dashboards tracking costs, ROI, and property yield.</span>
              </div>
            </div>
          </div>

          {/* Phase 3: The Maintenance Marketplace */}
          <div className="relative pl-8 md:pl-16">
            <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border-4 border-[#050B14]">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1">
                <span className="text-slate-500 font-bold text-sm uppercase tracking-wider">Phase 3 (Upcoming)</span>
                <h3 className="text-2xl font-bold text-white mt-1 mb-3">The Service Marketplace</h3>
                <p className="text-slate-400 leading-relaxed">
                  Connecting property owners with certified, licensed maintenance businesses. Need a plumber, electrician, earthmoving, or a general contractor for your new asset? Hire and pay verified professionals straight from the app.
                </p>
              </div>
              <div className="md:w-1/3 w-full bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
                <Hammer className="text-slate-400 shrink-0" size={28} />
                <span className="text-sm text-slate-300">Licensed tradesmen network: Gardeners, Carpenters, Builders, and Funds.</span>
              </div>
            </div>
          </div>

          {/* Phase 4: Tokenization & Frictionless Transfer */}
          <div className="relative pl-8 md:pl-16">
            <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border-4 border-[#050B14]">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1">
                <span className="text-slate-500 font-bold text-sm uppercase tracking-wider">Phase 4 (Future Vision)</span>
                <h3 className="text-2xl font-bold text-white mt-1 mb-3">Frictionless Property Transfer</h3>
                <p className="text-slate-400 leading-relaxed">
                  We verify proof of ownership (Title/Deed) and lock documentation into a secure vault, issuing a tokenized representation. Aligned with Title & Insurance companies, investors will trade properties held under an LLC/Corp instantly with zero bureaucracy.
                </p>
              </div>
              <div className="md:w-1/3 w-full bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
                <Lock className="text-slate-400 shrink-0" size={28} />
                <span className="text-sm text-slate-300">Secure Vault documentation, Token Generation, and Title alignment.</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. By the Numbers (Metrics) ── */}
      <section className="py-24 bg-[#03060A] border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/5 to-transparent z-0" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-16">Scaling across the nation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "50", label: "States Covered" },
              { value: "3,100+", label: "Counties Mapped" },
              { value: "600k+", label: "Auction Parcels" },
              { value: "$4B+", label: "Asset Value Monitored" },
            ].map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-cyan-200 mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400 font-medium uppercase tracking-wider text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Bottom CTA ── */}
      <section className="py-24 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">Join the real estate revolution.</h2>
        <p className="text-xl text-slate-400 mb-10">Whether you're an investor, a licensed realtor, or looking to earn as a field agent, GoAuct is your command center.</p>
        <Link
          to="/signup"
          className="inline-flex items-center justify-center gap-2 bg-white text-[#050B14] px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        >
          {t('auth.signupTitle')} <ArrowUpRight size={20} />
        </Link>
      </section>
    </div>
  );
};

export default Home;
