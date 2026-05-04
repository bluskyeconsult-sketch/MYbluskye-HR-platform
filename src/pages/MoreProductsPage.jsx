import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Code2, 
  Palette, 
  CheckCircle, 
  Star, 
  Users,
  Clock,
  Shield,
  Zap,
  BarChart3,
  Mail,
  Phone,
  ChevronRight,
  ArrowRight,
  Briefcase,
  Globe,
  Database,
  Lock,
  Headphones,
  Cloud,
  Cpu,
  TrendingUp
} from 'lucide-react';

export default function MoreProductsPage() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    product: ''
  });
  const [formStatus, setFormStatus] = useState(null);

  const products = [
    {
      id: 'enterprise',
      name: "Enterprise HR Suite",
      icon: Building2,
      price: "Custom",
      description: "Complete HR management solution for large organizations",
      features: [
        "AI-powered recruitment automation",
        "Advanced analytics & reporting dashboard",
        "Custom workflow automation",
        "Multi-country compliance management",
        "Dedicated account manager",
        "24/7 priority support",
        "Custom integration capabilities",
        "Unlimited user seats",
        "SLA guarantees (99.99% uptime)"
      ],
      targetAudience: "Companies with 500+ employees",
      implementation: "4-6 weeks",
      certifications: ["SOC2", "GDPR", "ISO 27001"],
      popular: true
    },
    {
      id: 'api',
      name: "API Access",
      icon: Code2,
      price: "$199/mo",
      description: "Programmatic access to ODUSBABA's powerful AI and data",
      features: [
        "RESTful API with GraphQL support",
        "Up to 100,000 API calls/month",
        "Real-time data streaming",
        "Webhook notifications",
        "API key management dashboard",
        "Rate limiting controls",
        "Comprehensive API documentation",
        "Developer support forum",
        "Sandbox environment for testing"
      ],
      targetAudience: "Developers & Tech Teams",
      implementation: "Same day",
      certifications: ["OpenAPI 3.0", "RESTful", "GraphQL"],
      popular: false
    },
    {
      id: 'whitelabel',
      name: "White Label Solution",
      icon: Palette,
      price: "Custom",
      description: "Fully branded platform for your company",
      features: [
        "Complete branding customization",
        "Custom domain & subdomain",
        "Modular component library",
        "Custom workflow builder",
        "User management system",
        "Analytics & reporting suite",
        "Mobile-responsive design",
        "Regular feature updates",
        "Source code access available"
      ],
      targetAudience: "Agencies & Enterprises",
      implementation: "8-12 weeks",
      certifications: ["Customizable", "Scalable", "Secure"],
      popular: false
    }
  ];

  const handleContactSales = (productId, productName) => {
    setSelectedProduct(productId);
    setFormData(prev => ({ ...prev, product: productName }));
    setShowContactForm(true);
    document.getElementById('contact-form').scrollIntoView({ behavior: 'smooth' });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormStatus('loading');
    
    // Simulate API call - Replace with actual backend
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Here you would send to Supabase or email service
    console.log('Sales Inquiry:', formData);
    
    setFormStatus('success');
    setTimeout(() => {
      setShowContactForm(false);
      setFormStatus(null);
      setFormData({ name: '', email: '', company: '', message: '', product: '' });
    }, 3000);
  };

  const enterpriseBenefits = [
    { icon: Shield, title: "Enterprise Security", description: "Bank-grade encryption & compliance" },
    { icon: Users, title: "Dedicated Support", description: "24/7 priority support team" },
    { icon: Zap, title: "Rapid Deployment", description: "Quick implementation & onboarding" },
    { icon: BarChart3, title: "Advanced Analytics", description: "Custom reporting & insights" }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CTO",
      company: "TechCorp International",
      image: "https://ui-avatars.com/api/?name=Sarah+Johnson&background=6366f1&color=fff",
      quote: "The Enterprise HR Suite transformed our hiring process. We reduced time-to-hire by 60%.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Lead Developer",
      company: "InnovateLabs",
      image: "https://ui-avatars.com/api/?name=Michael+Chen&background=6366f1&color=fff",
      quote: "The API is incredibly well-documented and easy to integrate. Best API we've worked with.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20" />
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Enterprise Solutions
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Scalable solutions for organizations of all sizes. Choose the perfect plan for your needs.
            </p>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <div
              key={product.id}
              className={`relative bg-slate-900 border rounded-xl overflow-hidden transition-all hover:-translate-y-2 ${
                product.popular
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'border-slate-800 hover:border-purple-500/30'
              }`}
            >
              {product.popular && (
                <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              
              <div className="p-6">
                <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                  <product.icon className="w-6 h-6 text-purple-400" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">{product.name}</h2>
                <p className="text-3xl font-bold text-purple-400 mb-2">{product.price}</p>
                <p className="text-slate-400 text-sm mb-4">{product.description}</p>
                
                <div className="border-t border-slate-800 my-4" />
                
                <ul className="space-y-2 mb-6">
                  {product.features.slice(0, 5).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {product.features.length > 5 && (
                    <li className="text-sm text-slate-500 pl-6">
                      +{product.features.length - 5} more features
                    </li>
                  )}
                </ul>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Target Audience:</span>
                    <span className="text-slate-300">{product.targetAudience}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Implementation:</span>
                    <span className="text-slate-300">{product.implementation}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleContactSales(product.id, product.name)}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
                >
                  Contact Sales
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why Choose Enterprise Section */}
      <div className="bg-slate-900/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose Enterprise?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Get the full power of ODUSBABA with enterprise-grade features and support
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {enterpriseBenefits.map((benefit, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-slate-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Trusted by Industry Leaders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, idx) => (
            <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h4 className="font-semibold text-white">{testimonial.name}</h4>
                  <p className="text-sm text-slate-400">{testimonial.role} at {testimonial.company}</p>
                </div>
              </div>
              <div className="flex gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 italic">"{testimonial.quote}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Partners */}
      <div className="bg-slate-900/30 py-16 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Seamless Integrations</h2>
          <p className="text-slate-400 mb-8">Connect with your favorite tools and platforms</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-60">
            <Cloud className="w-12 h-12 text-slate-400" />
            <Database className="w-12 h-12 text-slate-400" />
            <Cpu className="w-12 h-12 text-slate-400" />
            <TrendingUp className="w-12 h-12 text-slate-400" />
            <Briefcase className="w-12 h-12 text-slate-400" />
            <Globe className="w-12 h-12 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Contact Sales Form */}
      {showContactForm && (
        <div id="contact-form" className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Contact Sales</h2>
            <p className="text-slate-400 mb-6">
              Interested in {formData.product}? Fill out the form and our team will get back to you within 24 hours.
            </p>
            
            {formStatus === 'success' ? (
              <div className="bg-green-600/10 border border-green-500/20 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-green-400">Thank you! Our sales team will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Tell us about your requirements..."
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={formStatus === 'loading'}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {formStatus === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Submit Inquiry
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="bg-slate-900/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h3>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-purple-400">Can I upgrade/downgrade my plan?</h4>
              <p className="text-sm text-slate-400">Yes, you can upgrade or downgrade at any time. Changes take effect immediately.</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-purple-400">Is there a setup fee?</h4>
              <p className="text-sm text-slate-400">No setup fees for any plan. You only pay for what you use.</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-purple-400">What support is included?</h4>
              <p className="text-sm text-slate-400">24/7 email support for API, dedicated support for enterprise plans.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
