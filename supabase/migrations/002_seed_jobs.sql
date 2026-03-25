-- ============================================
-- KARMIO SEED DATA
-- Sample jobs for testing
-- Run this after 001_initial_schema.sql
-- ============================================

-- Insert sample jobs for US market
INSERT INTO public.job_postings (
  company_name, company_logo_url, title, description_raw, description_parsed,
  location, remote_type, salary_min, salary_max, salary_currency,
  source_url, source_type, dedup_hash, realness_score, sponsorship_status,
  experience_years_min, experience_years_max, country
) VALUES
-- Tech Jobs
(
  'Stripe',
  'https://logo.clearbit.com/stripe.com',
  'Software Engineer, Backend',
  'Join Stripe''s Backend team to build the infrastructure powering global payments. You''ll work on distributed systems, APIs, and scalable architecture serving millions of businesses worldwide.',
  '{"required_skills": ["Go", "Python", "Distributed Systems", "PostgreSQL", "API Design"], "preferred_skills": ["Kubernetes", "AWS", "gRPC"], "responsibilities": ["Design and implement scalable backend services", "Optimize database performance", "Write clean, tested code"], "education_requirements": ["BS in Computer Science or equivalent"], "experience_years": {"min": 3, "max": 7}, "keywords": ["backend", "distributed systems", "payments", "api"]}',
  'San Francisco, CA',
  'hybrid',
  150000, 220000, 'USD',
  'https://stripe.com/jobs/12345',
  'greenhouse',
  'stripe_swe_backend_sf_001',
  92,
  'yes',
  3, 7,
  'US'
),
(
  'Google',
  'https://logo.clearbit.com/google.com',
  'Software Engineer, Cloud Platform',
  'Help build Google Cloud Platform''s next generation infrastructure. Work on Kubernetes, compute, storage, and networking at planet scale.',
  '{"required_skills": ["Java", "C++", "Distributed Systems", "Linux"], "preferred_skills": ["Kubernetes", "Cloud Architecture", "Go"], "responsibilities": ["Design cloud infrastructure components", "Improve system reliability", "Mentor junior engineers"], "education_requirements": ["BS/MS in Computer Science"], "experience_years": {"min": 2, "max": 10}, "keywords": ["cloud", "infrastructure", "kubernetes", "google cloud"]}',
  'Mountain View, CA',
  'hybrid',
  180000, 280000, 'USD',
  'https://careers.google.com/jobs/123',
  'lever',
  'google_swe_cloud_mv_001',
  95,
  'yes',
  2, 10,
  'US'
),
(
  'OpenAI',
  'https://logo.clearbit.com/openai.com',
  'ML Engineer, Research',
  'Work on cutting-edge AI research and help deploy models that shape the future of artificial intelligence. Collaborate with world-class researchers on foundation models.',
  '{"required_skills": ["Python", "PyTorch", "Machine Learning", "Deep Learning", "Mathematics"], "preferred_skills": ["Transformers", "CUDA", "Distributed Training"], "responsibilities": ["Implement novel ML architectures", "Scale training pipelines", "Publish research papers"], "education_requirements": ["PhD in ML/AI or equivalent experience"], "experience_years": {"min": 2, "max": null}, "keywords": ["ml", "ai", "research", "llm", "transformers"]}',
  'San Francisco, CA',
  'hybrid',
  200000, 350000, 'USD',
  'https://openai.com/careers/ml-engineer',
  'greenhouse',
  'openai_ml_research_sf_001',
  98,
  'yes',
  2, null,
  'US'
),
(
  'Airbnb',
  'https://logo.clearbit.com/airbnb.com',
  'Senior Frontend Engineer',
  'Build the next generation of Airbnb''s web experience. Work on React, performance optimization, and design systems that serve millions of travelers.',
  '{"required_skills": ["React", "TypeScript", "CSS", "Performance Optimization"], "preferred_skills": ["GraphQL", "Node.js", "Testing"], "responsibilities": ["Build reusable UI components", "Optimize web performance", "Collaborate with designers"], "education_requirements": ["BS in CS or equivalent"], "experience_years": {"min": 5, "max": 10}, "keywords": ["frontend", "react", "typescript", "web"]}',
  'San Francisco, CA',
  'remote',
  180000, 260000, 'USD',
  'https://careers.airbnb.com/positions/123',
  'greenhouse',
  'airbnb_frontend_sf_001',
  90,
  'yes',
  5, 10,
  'US'
),
(
  'Meta',
  'https://logo.clearbit.com/meta.com',
  'Data Scientist, Ads',
  'Use data to drive decisions for Meta''s advertising products. Build models, run experiments, and influence product strategy for billions of users.',
  '{"required_skills": ["Python", "SQL", "Statistical Analysis", "Machine Learning", "A/B Testing"], "preferred_skills": ["Spark", "PyTorch", "Experimentation"], "responsibilities": ["Build predictive models", "Design and analyze experiments", "Present insights to stakeholders"], "education_requirements": ["MS/PhD in Statistics, Math, or CS"], "experience_years": {"min": 3, "max": 8}, "keywords": ["data science", "ads", "ml", "experimentation"]}',
  'Menlo Park, CA',
  'hybrid',
  160000, 240000, 'USD',
  'https://metacareers.com/jobs/123',
  'lever',
  'meta_ds_ads_mp_001',
  94,
  'yes',
  3, 8,
  'US'
),
-- Healthcare/Biotech Jobs
(
  'Genentech',
  'https://logo.clearbit.com/gene.com',
  'Bioinformatics Scientist',
  'Apply computational methods to drug discovery. Analyze genomic data, develop pipelines, and collaborate with research teams on breakthrough therapies.',
  '{"required_skills": ["Python", "R", "Genomics", "NGS Analysis", "Statistics"], "preferred_skills": ["Machine Learning", "Cloud Computing", "Single Cell"], "responsibilities": ["Analyze NGS data", "Build analysis pipelines", "Collaborate with biologists"], "education_requirements": ["PhD in Bioinformatics, Computational Biology"], "experience_years": {"min": 0, "max": 5}, "keywords": ["bioinformatics", "genomics", "drug discovery", "ngs"]}',
  'South San Francisco, CA',
  'hybrid',
  130000, 180000, 'USD',
  'https://careers.gene.com/jobs/123',
  'workday',
  'genentech_bioinfo_ssf_001',
  88,
  'yes',
  0, 5,
  'US'
),
(
  'Mayo Clinic',
  'https://logo.clearbit.com/mayoclinic.org',
  'Clinical Data Analyst',
  'Transform healthcare delivery through data. Analyze clinical outcomes, build dashboards, and support evidence-based medicine initiatives.',
  '{"required_skills": ["SQL", "Tableau", "Healthcare Data", "Statistical Analysis"], "preferred_skills": ["Python", "Epic", "FHIR"], "responsibilities": ["Build clinical dashboards", "Analyze patient outcomes", "Support quality initiatives"], "education_requirements": ["BS in Health Informatics, Statistics, or related"], "experience_years": {"min": 2, "max": 5}, "keywords": ["healthcare", "clinical", "data analysis", "ehr"]}',
  'Rochester, MN',
  'onsite',
  80000, 110000, 'USD',
  'https://jobs.mayoclinic.org/jobs/123',
  'workday',
  'mayo_data_analyst_roch_001',
  85,
  'unknown',
  2, 5,
  'US'
),
-- Finance Jobs
(
  'Goldman Sachs',
  'https://logo.clearbit.com/goldmansachs.com',
  'Quantitative Analyst, Strats',
  'Join the Strats team to build models that drive trading decisions. Work on derivatives pricing, risk management, and market making algorithms.',
  '{"required_skills": ["Python", "C++", "Mathematics", "Statistics", "Finance"], "preferred_skills": ["Machine Learning", "Time Series", "Options"], "responsibilities": ["Build pricing models", "Develop risk analytics", "Collaborate with traders"], "education_requirements": ["MS/PhD in Math, Physics, CS, or Finance"], "experience_years": {"min": 1, "max": 5}, "keywords": ["quant", "trading", "finance", "derivatives"]}',
  'New York, NY',
  'hybrid',
  150000, 250000, 'USD',
  'https://www.goldmansachs.com/careers/jobs/123',
  'greenhouse',
  'gs_quant_strats_nyc_001',
  91,
  'yes',
  1, 5,
  'US'
),
-- Startup Jobs
(
  'Notion',
  'https://logo.clearbit.com/notion.so',
  'Product Designer',
  'Shape how millions of people organize their work. Design features that balance power with simplicity in Notion''s collaborative workspace.',
  '{"required_skills": ["Figma", "User Research", "Prototyping", "Design Systems"], "preferred_skills": ["Motion Design", "Front-end Development"], "responsibilities": ["Design end-to-end features", "Conduct user research", "Build design systems"], "education_requirements": ["Portfolio demonstrating product design work"], "experience_years": {"min": 3, "max": 7}, "keywords": ["product design", "ux", "collaboration", "saas"]}',
  'San Francisco, CA',
  'hybrid',
  150000, 200000, 'USD',
  'https://notion.so/careers/designer',
  'ashby',
  'notion_product_design_sf_001',
  89,
  'yes',
  3, 7,
  'US'
),
(
  'Linear',
  'https://logo.clearbit.com/linear.app',
  'Full Stack Engineer',
  'Build the future of issue tracking. Work on a fast, beautiful product used by the best engineering teams. Small team, big impact.',
  '{"required_skills": ["TypeScript", "React", "Node.js", "PostgreSQL"], "preferred_skills": ["GraphQL", "Electron", "Real-time Systems"], "responsibilities": ["Build full-stack features", "Optimize performance", "Shape product direction"], "education_requirements": ["Strong portfolio or open source work"], "experience_years": {"min": 3, "max": 8}, "keywords": ["full stack", "typescript", "saas", "developer tools"]}',
  'Remote',
  'remote',
  150000, 220000, 'USD',
  'https://linear.app/careers/full-stack',
  'ashby',
  'linear_fullstack_remote_001',
  87,
  'yes',
  3, 8,
  'US'
),
-- Entry Level / Internship
(
  'Microsoft',
  'https://logo.clearbit.com/microsoft.com',
  'Software Engineer Intern',
  'Spend your summer building products used by billions. Work alongside senior engineers on real projects in Azure, Office, or Windows.',
  '{"required_skills": ["Programming", "Data Structures", "Algorithms", "Problem Solving"], "preferred_skills": ["C#", "Python", "Cloud"], "responsibilities": ["Complete intern project", "Present to leadership", "Learn from mentors"], "education_requirements": ["Currently pursuing BS/MS in CS"], "experience_years": {"min": 0, "max": 1}, "keywords": ["intern", "internship", "new grad", "student"]}',
  'Redmond, WA',
  'hybrid',
  7500, 10000, 'USD',
  'https://careers.microsoft.com/students/intern',
  'workday',
  'msft_swe_intern_redmond_001',
  96,
  'yes',
  0, 1,
  'US'
),
(
  'Amazon',
  'https://logo.clearbit.com/amazon.com',
  'Software Development Engineer, New Grad',
  'Start your career at Amazon. Work on services that handle millions of transactions per second. Grow fast in a team that ships to production daily.',
  '{"required_skills": ["Java", "Python", "Data Structures", "Algorithms", "System Design"], "preferred_skills": ["AWS", "Distributed Systems"], "responsibilities": ["Design and build services", "Write operational code", "Participate in on-call"], "education_requirements": ["BS/MS in CS, graduating 2024-2025"], "experience_years": {"min": 0, "max": 2}, "keywords": ["new grad", "sde", "entry level", "amazon"]}',
  'Seattle, WA',
  'hybrid',
  120000, 160000, 'USD',
  'https://amazon.jobs/new-grad',
  'greenhouse',
  'amazon_sde_newgrad_sea_001',
  93,
  'yes',
  0, 2,
  'US'
),
-- Government Jobs
(
  'U.S. Digital Service',
  'https://logo.clearbit.com/usds.gov',
  'Product Manager, Healthcare',
  'Improve how Americans access healthcare. Work on Medicare, VA health, or HHS digital services. High impact, civic tech.',
  '{"required_skills": ["Product Management", "Agile", "User Research", "Healthcare Domain"], "preferred_skills": ["Government Experience", "Health IT"], "responsibilities": ["Lead product strategy", "Work with agency partners", "Ship user-centered products"], "education_requirements": ["5+ years product experience"], "experience_years": {"min": 5, "max": 15}, "keywords": ["government", "civic tech", "healthcare", "product"]}',
  'Washington, DC',
  'hybrid',
  120000, 180000, 'USD',
  'https://usds.gov/apply',
  'usajobs',
  'usds_pm_healthcare_dc_001',
  84,
  'unknown',
  5, 15,
  'US'
);

-- Add job sources for traceability
INSERT INTO public.job_sources (job_id, platform, platform_url)
SELECT id, source_type, source_url FROM public.job_postings;

-- Insert sample jobs for India market
INSERT INTO public.job_postings (
  company_name, company_logo_url, title, description_raw, description_parsed,
  location, remote_type, salary_min, salary_max, salary_currency,
  source_url, source_type, dedup_hash, realness_score, sponsorship_status,
  experience_years_min, experience_years_max, country
) VALUES
(
  'Razorpay',
  'https://logo.clearbit.com/razorpay.com',
  'Software Engineer, Payments',
  'Build India''s payment infrastructure. Work on high-throughput transaction systems, APIs, and fintech innovation.',
  '{"required_skills": ["Go", "Python", "Distributed Systems", "MySQL"], "preferred_skills": ["Kubernetes", "AWS"], "responsibilities": ["Build payment systems", "Ensure reliability", "Scale to millions"], "education_requirements": ["BE/BTech in CS"], "experience_years": {"min": 2, "max": 6}, "keywords": ["payments", "fintech", "backend", "distributed"]}',
  'Bangalore, Karnataka',
  'hybrid',
  2000000, 4000000, 'INR',
  'https://razorpay.com/jobs/swe',
  'greenhouse',
  'razorpay_swe_payments_blr_001',
  90,
  'unknown',
  2, 6,
  'IN'
),
(
  'Flipkart',
  'https://logo.clearbit.com/flipkart.com',
  'Data Scientist, Supply Chain',
  'Optimize India''s largest e-commerce supply chain. Build ML models for demand forecasting, inventory, and logistics.',
  '{"required_skills": ["Python", "SQL", "Machine Learning", "Statistics"], "preferred_skills": ["Spark", "Deep Learning"], "responsibilities": ["Build forecasting models", "Optimize inventory", "Drive cost savings"], "education_requirements": ["MS in Statistics, CS, or Operations Research"], "experience_years": {"min": 3, "max": 7}, "keywords": ["data science", "supply chain", "ml", "e-commerce"]}',
  'Bangalore, Karnataka',
  'hybrid',
  2500000, 4500000, 'INR',
  'https://flipkartcareers.com/ds-supply',
  'freshteam',
  'flipkart_ds_supply_blr_001',
  88,
  'unknown',
  3, 7,
  'IN'
),
(
  'Zerodha',
  'https://logo.clearbit.com/zerodha.com',
  'Full Stack Developer',
  'Build trading platforms for millions of Indian investors. Work on low-latency systems that handle massive market data.',
  '{"required_skills": ["Go", "React", "PostgreSQL", "WebSockets"], "preferred_skills": ["Finance Knowledge", "Real-time Systems"], "responsibilities": ["Build trading interfaces", "Optimize latency", "Ensure reliability"], "education_requirements": ["Strong programming skills"], "experience_years": {"min": 2, "max": 5}, "keywords": ["trading", "fintech", "full stack", "low latency"]}',
  'Bangalore, Karnataka',
  'hybrid',
  1800000, 3500000, 'INR',
  'https://zerodha.com/careers/fullstack',
  'freshteam',
  'zerodha_fullstack_blr_001',
  86,
  'unknown',
  2, 5,
  'IN'
);

-- Add job sources for India jobs
INSERT INTO public.job_sources (job_id, platform, platform_url)
SELECT id, source_type, source_url FROM public.job_postings WHERE country = 'IN';
