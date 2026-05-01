import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const resources = [
  {
    title: 'CV Revamp Standard',
    description: 'Professional rewrite of your curriculum vitae to meet industry standards.',
    price: '$15',
    link: '/hire-va',
    tag: 'HIRE VA'
  },
  {
    title: 'CV Revamp Professional',
    description: 'ATS-optimized CV revamp including keyword targeting for senior roles.',
    price: '$25',
    link: '/hire-va',
    tag: 'HIRE VA'
  },
  {
    title: 'HR Policy Draft',
    description: 'Custom drafted HR policy document for your organization.',
    price: '$45',
    link: '/hire-va',
    tag: 'HIRE VA'
  }
];

export default function FeaturedResources() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-2">Featured Resources</h2>
          <p className="text-slate-400">Accelerate your growth with our premium selection of tools, books, and courses.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {resources.map((resource, index) => (
            <div key={index} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 transition-all hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">{resource.tag}</span>
                <span className="text-2xl font-bold text-emerald-400">{resource.price}</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{resource.title}</h3>
              <p className="text-slate-400 text-sm mb-4">{resource.description}</p>
              <Link to={resource.link} className="inline-flex items-center gap-1 text-emerald-400 text-sm hover:gap-2 transition-all">
                Learn More <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
