import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Clock, Scale, ShieldCheck, Zap, LineChart } from 'lucide-react';

const Home = () => {
  return (
    <div className="w-full bg-[#050B14]">
      {/* ── 1. Hero Section (Video Background) ── */}
      <section className="relative h-[90vh] min-h-[600px] w-full flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050B14]/80 via-[#050B14]/40 to-[#050B14] z-10" />
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-60"
            poster="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80"
          >
            <source
              src="https://cdn.coverr.co/videos/coverr-a-beautiful-modern-house-5192/1080p.mp4"
              type="video/mp4"
            />
          </video>
        </div>

        {/* Hero Content */}
        <div className="relative z-20 max-w-5xl mx-auto px-6 text-center pt-20">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1]"
          >
            The intelligence OS for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              distressed property.
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-light"
          >
            Resolve data friction and information asymmetry. GoAuct normalizes thousands of county datasets into a unified operational command center for institutional investors.
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
              Start Free Trial
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

      {/* ── 2. Feature Cards (Overlapping Hero) ── */}
      <section className="relative z-30 -mt-24 max-w-7xl mx-auto px-6 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Smart AI Deal Finder",
              desc: "Predictive A+ to F opportunity scoring powered by our normalized intelligence engine.",
              icon: <Zap className="text-blue-400" size={32} />,
            },
            {
              title: "Redemption Intelligence",
              desc: "State-by-state statutory redemption boards to guarantee compliance and accurate timelines.",
              icon: <Scale className="text-cyan-400" size={32} />,
            },
            {
              title: "Live Ticker Tape",
              desc: "Real-time auction countdowns with instant property metrics and ARV estimates.",
              icon: <Clock className="text-blue-300" size={32} />,
            }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: idx * 0.2 }}
              whileHover={{ y: -10 }}
              className="bg-[#0A1322]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl group transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 3. Marquee (Social Proof) ── */}
      <section className="py-12 border-y border-white/5 bg-[#03060A]/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
          <p className="text-sm font-semibold tracking-wider text-slate-500 uppercase">
            Trusted by top real estate firms worldwide
          </p>
        </div>
        <div className="flex whitespace-nowrap animate-marquee">
          {/* Using generic finance/real-estate placeholder names */}
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-16 px-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <span className="text-2xl font-bold text-white">Vanguard Capital</span>
              <span className="text-2xl font-bold text-white tracking-tighter">Apex Institutional</span>
              <span className="text-2xl font-bold text-white italic">Crest Holdings</span>
              <span className="text-2xl font-bold text-white">NovaRealty Funds</span>
              <span className="text-2xl font-bold text-white tracking-widest">BRIDGEWATER</span>
              <span className="text-2xl font-bold text-white">Blackstone Group Partners</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Bento Grid (Solutions) ── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">A unified ecosystem for your operations</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">From field agent due diligence tasks to automated PDF flyer exports. GoAuct handles the heavy lifting.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
          {/* Big Item */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="md:col-span-2 md:row-span-2 rounded-3xl bg-gradient-to-br from-[#0D182A] to-[#0A1322] border border-white/10 p-10 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-500/20 transition-all" />
            <div className="relative z-10">
              <BarChart3 className="text-blue-400 mb-6" size={40} />
              <h3 className="text-3xl font-bold text-white mb-4">Property Comps & Estimates</h3>
              <p className="text-slate-400 text-lg max-w-md">Instantly evaluate After Repair Value (ARV) and Rent Estimates with our dynamically updated comparables engine. Reduce underwriting time from hours to seconds.</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-3xl bg-[#0D182A] border border-white/10 p-8 relative overflow-hidden"
          >
            <ShieldCheck className="text-cyan-400 mb-4" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">Strict Multi-Tenant Isolation</h3>
            <p className="text-slate-400">Your proprietary deal flow is securely siloed. GPS-verified field tasks ensure data truth.</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-3xl bg-[#0D182A] border border-white/10 p-8 relative overflow-hidden"
          >
            <LineChart className="text-blue-300 mb-4" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">Automated Exports</h3>
            <p className="text-slate-400">Generate PDF property flyers with QR codes directly from the command center.</p>
          </motion.div>
        </div>
      </section>

      {/* ── 5. By the Numbers ── */}
      <section className="py-24 bg-[#03060A] border-y border-white/5 relative overflow-hidden">
        {/* Removed the Agora Cloudinary background entirely for a cleaner, darker look */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/5 to-transparent z-0" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-16">Empowering institutional success</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "50", label: "States Covered" },
              { value: "3,100+", label: "Counties Mapped" },
              { value: "120k+", label: "Distressed Parcels" },
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

      {/* ── 6. Bottom CTA ── */}
      <section className="py-24 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">Ready to scale your property operations?</h2>
        <p className="text-xl text-slate-400 mb-10">Join the top investors predicting winning bids with GoAuct.</p>
        <Link
          to="/signup"
          className="inline-flex items-center justify-center bg-white text-[#050B14] px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        >
          Start Your Free Trial
        </Link>
      </section>
    </div>
  );
};

export default Home;
