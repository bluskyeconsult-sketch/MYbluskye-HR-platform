// api/fetch-jobs.js
// Vercel Serverless Function - Copy this entire file to /api/fetch-jobs.js

export default async function handler(req, res) {
  // Enable CORS for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Rich sample job data - 40+ latest vacancies from all 7 countries
    const jobs = [
      // ========== UNITED KINGDOM (GB) - 6 jobs ==========
      { title: 'Senior Software Engineer', company: 'Tech Innovations UK', location: 'London, UK', country: 'GB', description: 'Join our engineering team building next-gen cloud platforms. React, Node.js, AWS experience required.', salary_range: '£75,000 - £95,000', source_name: 'Tech Jobs UK', job_type: 'full-time', is_government: false },
      { title: 'Full Stack Developer', company: 'Digital Agency London', location: 'London, UK', country: 'GB', description: 'Work on exciting client projects using React, Node.js, and TypeScript.', salary_range: '£60,000 - £80,000', source_name: 'Tech Jobs UK', job_type: 'full-time', is_government: false },
      { title: 'DevOps Engineer', company: 'Cloud Systems Ltd', location: 'Manchester, UK', country: 'GB', description: 'Manage AWS infrastructure, CI/CD pipelines, and Kubernetes clusters.', salary_range: '£70,000 - £90,000', source_name: 'Tech Jobs UK', job_type: 'full-time', is_government: false },
      { title: 'Product Manager', company: 'SaaS Startup', location: 'Remote, UK', country: 'GB', description: 'Lead product development for B2B SaaS platform. 3+ years product experience required.', salary_range: '£65,000 - £85,000', source_name: 'Tech Jobs UK', job_type: 'remote', is_government: false },
      { title: 'Data Scientist', company: 'AI Analytics', location: 'Edinburgh, UK', country: 'GB', description: 'Analyze complex datasets and build ML models using Python and TensorFlow.', salary_range: '£65,000 - £85,000', source_name: 'Tech Jobs UK', job_type: 'full-time', is_government: false },
      { title: 'HR Business Partner', company: 'Global Recruitment', location: 'Birmingham, UK', country: 'GB', description: 'Strategic HR role supporting business growth. CIPD qualified preferred.', salary_range: '£50,000 - £65,000', source_name: 'UK Jobs', job_type: 'full-time', is_government: false },
      
      // ========== UNITED STATES (US) - 6 jobs ==========
      { title: 'Senior Full Stack Engineer', company: 'Tech Giants Inc', location: 'San Francisco, CA', country: 'US', description: 'Build scalable web applications using React, Node.js, and GraphQL.', salary_range: '$150,000 - $200,000', source_name: 'US Tech Jobs', job_type: 'full-time', is_government: false },
      { title: 'Cloud Architect', company: 'AWS Solutions', location: 'Seattle, WA', country: 'US', description: 'Design and implement cloud architectures on AWS. Certification preferred.', salary_range: '$160,000 - $210,000', source_name: 'US Tech Jobs', job_type: 'full-time', is_government: false },
      { title: 'DevOps Lead', company: 'Cloud Native', location: 'Austin, TX', country: 'US', description: 'Lead DevOps team managing Kubernetes, Terraform, and CI/CD pipelines.', salary_range: '$140,000 - $180,000', source_name: 'US Tech Jobs', job_type: 'full-time', is_government: false },
      { title: 'Product Designer', company: 'Creative Studio', location: 'New York, NY', country: 'US', description: 'UI/UX designer with Figma expertise. Portfolio required.', salary_range: '$120,000 - $160,000', source_name: 'US Tech Jobs', job_type: 'full-time', is_government: false },
      { title: 'Data Engineer', company: 'Data Pipeline Inc', location: 'Boston, MA', country: 'US', description: 'Build data pipelines using Python, Spark, and Airflow.', salary_range: '$130,000 - $170,000', source_name: 'US Tech Jobs', job_type: 'full-time', is_government: false },
      { title: 'Security Engineer', company: 'Cyber Defense', location: 'Washington, DC', country: 'US', description: 'Implement security controls and respond to incidents.', salary_range: '$140,000 - $180,000', source_name: 'US Tech Jobs', job_type: 'full-time', is_government: false },
      
      // ========== NIGERIA (NG) - 6 jobs ==========
      { title: 'Software Developer', company: 'Lagos Tech Hub', location: 'Lagos, Nigeria', country: 'NG', description: 'Full-stack developer needed for fintech projects. React and Node.js skills required.', salary_range: '₦8,000,000 - ₦12,000,000', source_name: 'NG Jobs', job_type: 'full-time', is_government: false },
      { title: 'Product Designer', company: 'Creative Studio', location: 'Abuja, Nigeria', country: 'NG', description: 'UI/UX designer with Figma expertise.', salary_range: '₦6,000,000 - ₦9,000,000', source_name: 'NG Jobs', job_type: 'full-time', is_government: false },
      { title: 'DevOps Engineer', company: 'Cloud Solutions NG', location: 'Lagos, Nigeria', country: 'NG', description: 'AWS, Docker, and CI/CD expertise required.', salary_range: '₦7,000,000 - ₦10,000,000', source_name: 'NG Jobs', job_type: 'full-time', is_government: false },
      { title: 'Data Analyst', company: 'Analytics Firm', location: 'Abuja, Nigeria', country: 'NG', description: 'Analyze business data using SQL and Python.', salary_range: '₦5,000,000 - ₦7,000,000', source_name: 'NG Jobs', job_type: 'full-time', is_government: false },
      { title: 'Marketing Manager', company: 'Digital Agency', location: 'Lagos, Nigeria', country: 'NG', description: 'Lead marketing campaigns for top brands.', salary_range: '₦6,000,000 - ₦9,000,000', source_name: 'NG Jobs', job_type: 'full-time', is_government: false },
      { title: 'HR Manager', company: 'Corporate Services', location: 'Port Harcourt, Nigeria', country: 'NG', description: 'Manage HR operations and recruitment.', salary_range: '₦5,000,000 - ₦8,000,000', source_name: 'NG Jobs', job_type: 'full-time', is_government: false },
      
      // ========== CANADA (CA) - 5 jobs ==========
      { title: 'Senior Developer', company: 'Toronto Tech', location: 'Toronto, ON', country: 'CA', description: 'React and Node.js developer for SaaS platform.', salary_range: 'CAD 120,000 - CAD 150,000', source_name: 'CA Jobs', job_type: 'full-time', is_government: false },
      { title: 'Cloud Engineer', company: 'Azure Solutions', location: 'Vancouver, BC', country: 'CA', description: 'Azure cloud infrastructure management.', salary_range: 'CAD 110,000 - CAD 140,000', source_name: 'CA Jobs', job_type: 'full-time', is_government: false },
      { title: 'Data Scientist', company: 'AI Labs', location: 'Montreal, QC', country: 'CA', description: 'Machine learning model development.', salary_range: 'CAD 130,000 - CAD 160,000', source_name: 'CA Jobs', job_type: 'full-time', is_government: false },
      { title: 'Product Manager', company: 'Tech Startup', location: 'Ottawa, ON', country: 'CA', description: 'Lead product strategy and development.', salary_range: 'CAD 100,000 - CAD 130,000', source_name: 'CA Jobs', job_type: 'full-time', is_government: false },
      { title: 'DevOps Engineer', company: 'Cloud Native', location: 'Calgary, AB', country: 'CA', description: 'Kubernetes and CI/CD pipeline management.', salary_range: 'CAD 115,000 - CAD 145,000', source_name: 'CA Jobs', job_type: 'full-time', is_government: false },
      
      // ========== AUSTRALIA (AU) - 5 jobs ==========
      { title: 'Full Stack Developer', company: 'Sydney Tech', location: 'Sydney, NSW', country: 'AU', description: 'React and Node.js developer for fintech client.', salary_range: 'AUD 130,000 - AUD 160,000', source_name: 'AU Jobs', job_type: 'full-time', is_government: false },
      { title: 'Cloud Architect', company: 'AWS Partner', location: 'Melbourne, VIC', country: 'AU', description: 'Design cloud solutions on AWS.', salary_range: 'AUD 150,000 - AUD 180,000', source_name: 'AU Jobs', job_type: 'full-time', is_government: false },
      { title: 'Data Engineer', company: 'Data Analytics', location: 'Brisbane, QLD', country: 'AU', description: 'Build data pipelines using Python and Spark.', salary_range: 'AUD 120,000 - AUD 150,000', source_name: 'AU Jobs', job_type: 'full-time', is_government: false },
      { title: 'Product Manager', company: 'SaaS Startup', location: 'Perth, WA', country: 'AU', description: 'Product strategy and roadmap planning.', salary_range: 'AUD 140,000 - AUD 170,000', source_name: 'AU Jobs', job_type: 'full-time', is_government: false },
      { title: 'Security Engineer', company: 'Cyber Security', location: 'Canberra, ACT', country: 'AU', description: 'Security monitoring and incident response.', salary_range: 'AUD 130,000 - AUD 160,000', source_name: 'AU Jobs', job_type: 'full-time', is_government: false },
      
      // ========== GERMANY (DE) - 6 jobs ==========
      { title: 'Softwareentwickler', company: 'Berlin Tech', location: 'Berlin, Germany', country: 'DE', description: 'Full-stack developer for SaaS platform. React and Node.js skills required.', salary_range: '€70,000 - €90,000', source_name: 'DE Jobs', job_type: 'full-time', is_government: false, language: 'DE/EN' },
      { title: 'DevOps Ingenieur', company: 'Cloud Solutions', location: 'Munich, Germany', country: 'DE', description: 'AWS, Kubernetes, and CI/CD expertise required.', salary_range: '€75,000 - €95,000', source_name: 'DE Jobs', job_type: 'full-time', is_government: false, language: 'DE/EN' },
      { title: 'Data Scientist', company: 'AI Research', location: 'Hamburg, Germany', country: 'DE', description: 'Machine learning model development using Python.', salary_range: '€80,000 - €100,000', source_name: 'DE Jobs', job_type: 'full-time', is_government: false, language: 'EN' },
      { title: 'Produktmanager', company: 'Tech Startup', location: 'Berlin, Germany', country: 'DE', description: 'Lead product development for B2B platform.', salary_range: '€70,000 - €90,000', source_name: 'DE Jobs', job_type: 'full-time', is_government: false, language: 'DE/EN' },
      { title: 'UX/UI Designer', company: 'Creative Agency', location: 'Cologne, Germany', country: 'DE', description: 'Design user interfaces for web applications.', salary_range: '€55,000 - €75,000', source_name: 'DE Jobs', job_type: 'full-time', is_government: false, language: 'DE/EN' },
      { title: 'IT-Projektmanager', company: 'IT Services', location: 'Frankfurt, Germany', country: 'DE', description: 'Manage IT projects for enterprise clients.', salary_range: '€80,000 - €100,000', source_name: 'DE Jobs', job_type: 'full-time', is_government: false, language: 'DE' },
      
      // ========== FRANCE (FR) - 6 jobs ==========
      { title: 'Développeur Full Stack', company: 'Paris Tech', location: 'Paris, France', country: 'FR', description: 'React and Node.js developer for SaaS platform.', salary_range: '€65,000 - €85,000', source_name: 'FR Jobs', job_type: 'full-time', is_government: false, language: 'FR/EN' },
      { title: 'Ingénieur DevOps', company: 'Cloud Solutions', location: 'Lyon, France', country: 'FR', description: 'AWS, Kubernetes, CI/CD expertise required.', salary_range: '€70,000 - €90,000', source_name: 'FR Jobs', job_type: 'full-time', is_government: false, language: 'FR/EN' },
      { title: 'Chef de Produit', company: 'Tech Startup', location: 'Paris, France', country: 'FR', description: 'Lead product development for B2B platform.', salary_range: '€70,000 - €90,000', source_name: 'FR Jobs', job_type: 'full-time', is_government: false, language: 'FR' },
      { title: 'Data Analyst', company: 'Analytics Firm', location: 'Bordeaux, France', country: 'FR', description: 'Analyze business data using SQL and Python.', salary_range: '€50,000 - €70,000', source_name: 'FR Jobs', job_type: 'full-time', is_government: false, language: 'FR/EN' },
      { title: 'Designer UX/UI', company: 'Creative Agency', location: 'Paris, France', country: 'FR', description: 'Design user interfaces for web applications.', salary_range: '€50,000 - €70,000', source_name: 'FR Jobs', job_type: 'full-time', is_government: false, language: 'FR' },
      { title: 'Responsable Marketing', company: 'Digital Agency', location: 'Marseille, France', country: 'FR', description: 'Lead marketing strategy for digital products.', salary_range: '€60,000 - €80,000', source_name: 'FR Jobs', job_type: 'full-time', is_government: false, language: 'FR' }
    ];
    
    console.log(`✅ API returning ${jobs.length} jobs`);
    
    return res.status(200).json({
      success: true,
      count: jobs.length,
      sources: 1,
      message: 'Jobs fetched successfully',
      jobs: jobs
    });
    
  } catch (error) {
    console.error('❌ API error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      jobs: []
    });
  }
}
