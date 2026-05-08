// api/fetch-jobs.js
// Returns sample job data (replace with real API calls later)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Sample job data (matching your table structure)
  const jobs = [
    // United Kingdom
    { title: 'Senior Software Engineer', company: 'Tech Innovations UK', location: 'London, UK', source_country: 'GB', source_name: 'Tech Jobs UK', description: 'Join our engineering team building next-gen cloud platforms.', salary_range: '£75,000 - £95,000', job_type: 'full-time' },
    { title: 'Full Stack Developer', company: 'Digital Agency London', location: 'London, UK', source_country: 'GB', source_name: 'Tech Jobs UK', description: 'Work on exciting client projects.', salary_range: '£60,000 - £80,000', job_type: 'full-time' },
    // United States
    { title: 'Senior Full Stack Engineer', company: 'Tech Giants Inc', location: 'San Francisco, CA', source_country: 'US', source_name: 'US Tech Jobs', description: 'Build scalable web applications.', salary_range: '$150,000 - $200,000', job_type: 'full-time' },
    { title: 'Cloud Architect', company: 'AWS Solutions', location: 'Seattle, WA', source_country: 'US', source_name: 'US Tech Jobs', description: 'Design cloud architectures on AWS.', salary_range: '$160,000 - $210,000', job_type: 'full-time' },
    // Nigeria
    { title: 'Software Developer', company: 'Lagos Tech Hub', location: 'Lagos, Nigeria', source_country: 'NG', source_name: 'NG Jobs', description: 'Full-stack developer for fintech projects.', salary_range: '₦8,000,000 - ₦12,000,000', job_type: 'full-time' },
    { title: 'Product Designer', company: 'Creative Studio', location: 'Abuja, Nigeria', source_country: 'NG', source_name: 'NG Jobs', description: 'UI/UX designer needed.', salary_range: '₦6,000,000 - ₦9,000,000', job_type: 'full-time' },
    // Canada
    { title: 'Senior Developer', company: 'Toronto Tech', location: 'Toronto, ON', source_country: 'CA', source_name: 'CA Jobs', description: 'React and Node.js developer.', salary_range: 'CAD 120,000 - CAD 150,000', job_type: 'full-time' },
    { title: 'Cloud Engineer', company: 'Azure Solutions', location: 'Vancouver, BC', source_country: 'CA', source_name: 'CA Jobs', description: 'Azure cloud infrastructure.', salary_range: 'CAD 110,000 - CAD 140,000', job_type: 'full-time' },
    // Australia
    { title: 'Full Stack Developer', company: 'Sydney Tech', location: 'Sydney, NSW', source_country: 'AU', source_name: 'AU Jobs', description: 'React and Node.js developer.', salary_range: 'AUD 130,000 - AUD 160,000', job_type: 'full-time' },
    { title: 'Cloud Architect', company: 'AWS Partner', location: 'Melbourne, VIC', source_country: 'AU', source_name: 'AU Jobs', description: 'Design cloud solutions.', salary_range: 'AUD 150,000 - AUD 180,000', job_type: 'full-time' },
    // Germany
    { title: 'Softwareentwickler', company: 'Berlin Tech', location: 'Berlin, Germany', source_country: 'DE', source_name: 'DE Jobs', description: 'Full-stack developer needed.', salary_range: '€70,000 - €90,000', job_type: 'full-time' },
    { title: 'DevOps Ingenieur', company: 'Cloud Solutions', location: 'Munich, Germany', source_country: 'DE', source_name: 'DE Jobs', description: 'AWS, Kubernetes expertise.', salary_range: '€75,000 - €95,000', job_type: 'full-time' },
    // France
    { title: 'Développeur Full Stack', company: 'Paris Tech', location: 'Paris, France', source_country: 'FR', source_name: 'FR Jobs', description: 'React and Node.js developer.', salary_range: '€65,000 - €85,000', job_type: 'full-time' },
    { title: 'Ingénieur DevOps', company: 'Cloud Solutions', location: 'Lyon, France', source_country: 'FR', source_name: 'FR Jobs', description: 'AWS, Kubernetes expertise.', salary_range: '€70,000 - €90,000', job_type: 'full-time' }
  ];
  
  return res.status(200).json({
    success: true,
    count: jobs.length,
    jobs: jobs
  });
}
