// api/fetch-jobs.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Mock job data for demonstration
  // In production, replace with actual API calls to government job portals
  const mockJobs = [
    {
      title: "Civil Service Policy Advisor",
      company: "UK Government",
      location: "London, UK",
      country: "GB",
      description: "Lead policy development for digital initiatives. Requires experience in public policy and stakeholder management.",
      salary_range: "£42,000 - £55,000",
      source_name: "Civil Service Jobs",
      job_type: "full-time",
      is_government: true
    },
    {
      title: "Federal IT Specialist",
      company: "US Department of Homeland Security",
      location: "Washington, DC, USA",
      country: "US",
      description: "Manage federal IT systems and cybersecurity initiatives. GS-13 level position.",
      salary_range: "$106,382 - $138,296",
      source_name: "USAJobs.gov",
      job_type: "full-time",
      is_government: true,
      grade_level: "GS-13"
    },
    {
      title: "Public Service Analyst",
      company: "Government of Canada",
      location: "Ottawa, ON, Canada",
      country: "CA",
      description: "Analyze public service delivery metrics and recommend improvements.",
      salary_range: "CAD 75,000 - CAD 95,000",
      source_name: "GC Jobs",
      job_type: "full-time",
      is_government: true
    },
    {
      title: "APS Graduate Program",
      company: "Australian Public Service",
      location: "Canberra, ACT, Australia",
      country: "AU",
      description: "Entry-level program for recent graduates. Rotations across departments.",
      salary_range: "AUD 70,000 - AUD 80,000",
      source_name: "APS Jobs",
      job_type: "full-time",
      is_government: true
    },
    {
      title: "IT-Referent (m/w/d)",
      company: "Bundesministerium des Innern",
      location: "Berlin, Germany",
      country: "DE",
      description: "Leitung von IT-Projekten im Bundesministerium.",
      salary_range: "€65,000 - €85,000",
      source_name: "Bund.de",
      job_type: "full-time",
      is_government: true,
      language: "DE"
    },
    {
      title: "Chargé de mission RH",
      company: "Ministère de l'Économie",
      location: "Paris, France",
      country: "FR",
      description: "Gestion administrative pour l'État français.",
      salary_range: "€45,000 - €60,000",
      source_name: "France Travail",
      job_type: "full-time",
      is_government: true,
      language: "FR"
    },
    {
      title: "Federal Civil Service Officer",
      company: "Federal Civil Service Commission",
      location: "Abuja, Nigeria",
      country: "NG",
      description: "Administrative officer position in federal civil service.",
      salary_range: "₦150,000 - ₦250,000",
      source_name: "Federal Civil Service",
      job_type: "full-time",
      is_government: true
    }
  ];
  
  // Also add some sample commercial jobs
  const commercialJobs = [
    {
      title: "Senior Software Engineer",
      company: "Tech Innovations",
      location: "Remote",
      country: "US",
      description: "Build scalable web applications using React and Node.js.",
      salary_range: "$120,000 - $160,000",
      source_name: "LinkedIn",
      job_type: "full-time",
      is_government: false
    },
    {
      title: "Product Manager",
      company: "Global Products Ltd",
      location: "London, UK",
      country: "GB",
      description: "Lead product development for B2B SaaS platform.",
      salary_range: "£75,000 - £95,000",
      source_name: "Indeed",
      job_type: "full-time",
      is_government: false
    }
  ];
  
  const allJobs = [...mockJobs, ...commercialJobs];
  
  console.log(`Returning ${allJobs.length} jobs`);
  
  return res.status(200).json({
    success: true,
    count: allJobs.length,
    jobs: allJobs,
    message: "Jobs fetched successfully"
  });
}
