// api/fetch-jobs.js
// Matches your exact table structure

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Job data matching your table columns exactly
  const jobs = [
    // United Kingdom (GB)
    { title: 'Senior Software Engineer', company: 'Tech Innovations UK', location: 'London, UK', source_country: 'GB', source_name: 'Tech Jobs UK', description: 'Join our engineering team building next-gen cloud platforms.', salary_range: '£75,000 - £95,000', job_type: 'full-time' },
    { title: 'Full Stack Developer', company: 'Digital Agency London', location: 'London, UK', source_country: 'GB', source_name: 'Tech Jobs UK', description: 'Work on exciting client projects using React, Node.js.', salary_range: '£60,000 - £80,000', job_type: 'full-time' },
    { title: 'DevOps Engineer', company: 'Cloud Systems Ltd', location: 'Manchester, UK', source_country: 'GB', source_name: 'Tech Jobs UK', description: 'Manage AWS infrastructure and Kubernetes clusters.', salary_range: '£70,000 - £90,000', job_type: 'full-time' },
    // United States (US)
    { title: 'Senior Full Stack Engineer', company: 'Tech Giants Inc', location: 'San Francisco, CA', source_country: 'US', source_name: 'US Tech Jobs', description: 'Build scalable web applications using React, Node.js.', salary_range: '$150,000 - $200,000', job_type: 'full-time' },
    { title: 'Cloud Architect', company: 'AWS Solutions', location: 'Seattle, WA', source_country: 'US', source_name: 'US Tech Jobs', description: 'Design cloud architectures on AWS.', salary_range: '$160,000 - $210,000', job_type: 'full-time' },
    { title: 'DevOps Lead', company: 'Cloud Native', location: 'Austin, TX', source_country: 'US', source_name: 'US Tech Jobs', description: 'Lead DevOps team managing Kubernetes and CI/CD.', salary_range: '$140,000 - $180,000', job_type: 'full-time' },
    // Nigeria (NG)
    { title: 'Software Developer', company: 'Lagos Tech Hub', location: 'Lagos, Nigeria', source_country: 'NG', source_name: 'NG Jobs', description: 'Full-stack developer for fintech projects.', salary_range: '₦8,000,000 - ₦12,000,000', job_type: 'full-time' },
    { title: 'Product Designer', company: 'Creative Studio', location: 'Abuja, Nigeria', source_country: 'NG', source_name: 'NG Jobs', description: 'UI/UX designer with Figma expertise.', salary_range: '₦6,000,000 - ₦9,000,000', job_type: 'full-time' },
    { title: 'DevOps Engineer', company: 'Cloud Solutions NG', location: 'Lagos, Nigeria', source_country: 'NG', source_name: 'NG Jobs', description: 'AWS, Docker, CI/CD expertise required.', salary_range: '₦7,000,000 - ₦10,000,000', job_type: 'full-time' },
    // Canada (CA)
    { title: 'Senior Developer', company: 'Toronto Tech', location: 'Toronto, ON', source_country: 'CA', source_name: 'CA Jobs', description: 'React and Node.js developer for SaaS platform.', salary_range: 'CAD 120,000 - CAD 150,000', job_type: 'full-time' },
    { title: 'Cloud Engineer', company: 'Azure Solutions', location: 'Vancouver, BC', source_country: 'CA', source_name: 'CA Jobs', description: 'Azure cloud infrastructure management.', salary_range: 'CAD 110,000 - CAD 140,000', job_type: 'full-time' },
    { title: 'Data Scientist', company: 'AI Labs', location: 'Montreal, QC', source_country: 'CA', source_name: 'CA Jobs', description: 'Machine learning model development.', salary_range: 'CAD 130,000 - CAD 160,000', job_type: 'full-time' },
    // Australia (AU)
    { title: 'Full Stack Developer', company: 'Sydney Tech', location: 'Sydney, NSW', source_country: 'AU', source_name: 'AU Jobs', description: 'React and Node.js developer for fintech client.', salary_range: 'AUD 130,000 - AUD 160,000', job_type: 'full-time' },
    { title: 'Cloud Architect', company: 'AWS Partner', location: 'Melbourne, VIC', source_country: 'AU', source_name: 'AU Jobs', description: 'Design cloud solutions on AWS.', salary_range: 'AUD 150,000 - AUD 180,000', job_type: 'full-time' },
    { title: 'Data Engineer', company: 'Data Analytics', location: 'Brisbane, QLD', source_country: 'AU', source_name: 'AU Jobs', description: 'Build data pipelines using Python and Spark.', salary_range: 'AUD 120,000 - AUD 150,000', job_type: 'full-time' },
    // Germany (DE)
    { title: 'Softwareentwickler', company: 'Berlin Tech', location: 'Berlin, Germany', source_country: 'DE', source_name: 'DE Jobs', description: 'Full-stack developer for SaaS platform.', salary_range: '€70,000 - €90,000', job_type: 'full-time' },
    { title: 'DevOps Ingenieur', company: 'Cloud Solutions', location: 'Munich, Germany', source_country: 'DE', source_name: 'DE Jobs', description: 'AWS, Kubernetes, CI/CD expertise required.', salary_range: '€75,000 - €95,000', job_type: 'full-time' },
    { title: 'Data Scientist', company: 'AI Research', location: 'Hamburg, Germany', source_country: 'DE', source_name: 'DE Jobs', description: 'Machine learning model development.', salary_range: '€80,000 - €100,000', job_type: 'full-time' },
    // France (FR)
    { title: 'Développeur Full Stack', company: 'Paris Tech', location: 'Paris, France', source_country: 'FR', source_name: 'FR Jobs', description: 'React and Node.js developer for SaaS platform.', salary_range: '€65,000 - €85,000', job_type: 'full-time' },
    { title: 'Ingénieur DevOps', company: 'Cloud Solutions', location: 'Lyon, France', source_country: 'FR', source_name: 'FR Jobs', description: 'AWS, Kubernetes, CI/CD expertise required.', salary_range: '€70,000 - €90,000', job_type: 'full-time' },
    { title: 'Chef de Produit', company: 'Tech Startup', location: 'Paris, France', source_country: 'FR', source_name: 'FR Jobs', description: 'Lead product development for B2B platform.', salary_range: '€70,000 - €90,000', job_type: 'full-time' }
  ];
  
  return res.status(200).json({
    success: true,
    count: jobs.length,
    jobs: jobs
  });
}
