import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';

const articles = [
  { 
    id: 1, 
    title: 'The Future of AI in HR', 
    date: 'Apr 28, 2026', 
    excerpt: 'How artificial intelligence is transforming human resources and creating new opportunities for HR professionals.',
    category: 'AI & Technology'
  },
  { 
    id: 2, 
    title: 'New Employment Laws 2026', 
    date: 'Apr 25, 2026', 
    excerpt: 'Stay compliant with the latest employment regulations across multiple jurisdictions and avoid costly penalties.',
    category: 'Compliance'
  },
  { 
    id: 3, 
    title: 'Skill Trust Score Explained', 
    date: 'Apr 22, 2026', 
    excerpt: 'Understanding how our verification system builds trust between professionals and employers.',
    category: 'Platform'
  },
];

export default function FeaturedResources() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            News & Articles
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-slate-400 max-w-2xl mx-auto"
          >
            Stay informed with the latest insights from ODUSBABA
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {articles.map((article, index) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    {article.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {article.date}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  {article.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {article.excerpt}
                </p>
                <Link 
                  to={`/news/${article.id}`} 
                  className="inline-flex items-center gap-1 text-emerald-400 text-sm font-medium hover:gap-2 transition-all"
                >
                  Read more <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link to="/news" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            View all articles <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
