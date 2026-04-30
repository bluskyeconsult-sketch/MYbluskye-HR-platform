const plans = [
  { name: 'Free', price: '$0', features: ['Browse jobs', 'View marketplace', 'Basic AI demo'], tier: 'free' },
  { name: 'Registered', price: '$0', features: ['Apply to jobs', 'Submit skills', 'Basic chat'], tier: 'registered' },
  { name: 'Professional', price: '$29.99', features: ['Unlimited applications', 'Advanced AI', 'CV optimization'], tier: 'professional' },
  { name: 'Employer', price: '$99.99', features: ['Post jobs', 'View applicants', 'Contact candidates'], tier: 'employer' },
  { name: 'Business', price: '$499.99', features: ['Unlimited posts', 'Bulk export', 'Analytics'], tier: 'business' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Pricing Plans</h1>
        <p className="text-slate-400 text-center mb-12">Choose the plan that works for you</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {plans.map(plan => (
            <div key={plan.name} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
              <h2 className="text-xl font-bold text-white">{plan.name}</h2>
              <div className="mt-2">
                <span className="text-2xl font-bold text-emerald-400">{plan.price}</span>
                {plan.price !== '$0' && <span className="text-slate-400">/month</span>}
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map(f => <li key={f} className="text-sm text-slate-300">✓ {f}</li>)}
              </ul>
              <button className="mt-6 w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">Get Started</button>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-sm">All prices are in USD. Geo-pricing available for different regions.</p>
        </div>
      </div>
    </div>
  );
}
