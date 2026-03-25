'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

// ─── Career Fields (20+ fields, grouped) ───
const CAREER_FIELDS = [
  {
    group: 'Technology', fields: [
      { id: 'software_engineering', label: 'Software Engineering', icon: '💻' },
      { id: 'data_analytics', label: 'Data / Analytics', icon: '📊' },
      { id: 'devops_cloud', label: 'DevOps / Cloud', icon: '☁️' },
      { id: 'ai_ml', label: 'AI / Machine Learning', icon: '🤖' },
      { id: 'cybersecurity', label: 'Cybersecurity', icon: '🔒' },
    ]
  },
  {
    group: 'Healthcare & Life Sciences', fields: [
      { id: 'nursing_clinical', label: 'Nursing / Clinical', icon: '🏥' },
      { id: 'medicine', label: 'Medicine / Physician', icon: '⚕️' },
      { id: 'pharmacy', label: 'Pharmacy', icon: '💊' },
      { id: 'bioinformatics', label: 'Bioinformatics / Computational Biology', icon: '🧬' },
      { id: 'public_health', label: 'Public Health / Epidemiology', icon: '🌍' },
      { id: 'biomedical_engineering', label: 'Biomedical Engineering', icon: '🔬' },
      { id: 'health_administration', label: 'Health Administration', icon: '📋' },
    ]
  },
  {
    group: 'Business & Finance', fields: [
      { id: 'finance_accounting', label: 'Finance / Accounting', icon: '💰' },
      { id: 'consulting', label: 'Consulting', icon: '📈' },
      { id: 'marketing_growth', label: 'Marketing / Growth', icon: '📢' },
      { id: 'human_resources', label: 'Human Resources', icon: '👥' },
      { id: 'operations_supply_chain', label: 'Operations / Supply Chain', icon: '📦' },
      { id: 'product_management', label: 'Product Management', icon: '🎯' },
    ]
  },
  {
    group: 'Science & Research', fields: [
      { id: 'research_science', label: 'Research Science', icon: '🔬' },
      { id: 'environmental_science', label: 'Environmental Science', icon: '🌱' },
      { id: 'chemistry_materials', label: 'Chemistry / Materials', icon: '⚗️' },
      { id: 'physics', label: 'Physics / Applied Physics', icon: '⚛️' },
    ]
  },
  {
    group: 'Creative & Design', fields: [
      { id: 'ux_product_design', label: 'UX / Product Design', icon: '🎨' },
      { id: 'graphic_design', label: 'Graphic Design / Visual Arts', icon: '✏️' },
      { id: 'content_writing', label: 'Content / Technical Writing', icon: '✍️' },
    ]
  },
  {
    group: 'Legal & Policy', fields: [
      { id: 'law_legal', label: 'Law / Legal', icon: '⚖️' },
      { id: 'public_policy', label: 'Public Policy / Government', icon: '🏛️' },
    ]
  },
  {
    group: 'Education', fields: [
      { id: 'teaching', label: 'Teaching / Academia', icon: '📚' },
      { id: 'edtech', label: 'EdTech / Instructional Design', icon: '🖥️' },
    ]
  },
  {
    group: 'Engineering', fields: [
      { id: 'mechanical_engineering', label: 'Mechanical Engineering', icon: '⚙️' },
      { id: 'civil_engineering', label: 'Civil Engineering', icon: '🏗️' },
      { id: 'electrical_engineering', label: 'Electrical Engineering', icon: '⚡' },
    ]
  },
  {
    group: 'Other', fields: [
      { id: 'other', label: 'Other / Exploring', icon: '🌐' },
    ]
  },
];

// ─── Career Stages ───
const CAREER_STAGES = [
  { id: '2nd_year', label: '2nd year undergrad — seeking internship', desc: 'Unlocks: summer internship filters, campus recruiting, freshman-friendly roles', icon: '🎓' },
  { id: '3rd_year', label: '3rd year undergrad — seeking internship/co-op', desc: 'Unlocks: technical internships, leadership programs, return-offer focused matching', icon: '🎓' },
  { id: 'final_year', label: 'Final year — seeking new grad roles', desc: 'Unlocks: new grad programs, rotational programs, entry-level full-time', icon: '🎓' },
  { id: 'recent_grad', label: 'Recent graduate (0-1 year)', desc: 'Unlocks: entry-level roles, graduate training programs, boot camp friendly', icon: '🚀' },
  { id: 'early_career', label: 'Early career (1-3 years)', desc: 'Unlocks: mid-level roles, skill-growth positions, first promotion paths', icon: '📈' },
  { id: 'mid_career', label: 'Mid career (3-5 years)', desc: 'Unlocks: senior IC roles, team lead positions, specialization paths', icon: '💼' },
  { id: 'senior', label: 'Senior (5-10 years)', desc: 'Unlocks: Staff/Principal roles, management track, architecture positions', icon: '⭐' },
  { id: 'executive', label: 'Executive (10+ years)', desc: 'Unlocks: Director, VP, C-suite, advisory, board positions', icon: '👑' },
  { id: 'career_changer', label: 'Career changer — switching fields', desc: 'Unlocks: cross-functional roles, transferable skill emphasis, bridge positions', icon: '🔄' },
  { id: 'returning', label: 'Returning to workforce', desc: 'Unlocks: return-to-work programs, flexibility-first roles, phased re-entry', icon: '🌟' },
];

// ─── Job Types ───
const JOB_TYPES = [
  { id: 'internship', label: 'Summer internship', desc: '10-12 week programs, typically May–August', icon: '☀️' },
  { id: 'coop', label: 'Co-op / Semester-long', desc: '4-6 month rotations alongside studies', icon: '🔄' },
  { id: 'part_time', label: 'Part-time / Working student', desc: 'Flexible hours alongside studies', icon: '⏰' },
  { id: 'full_time', label: 'Full-time permanent', desc: 'Standard full-time employment', icon: '💼' },
  { id: 'contract', label: 'Contract / Freelance', desc: 'Project-based or temporary work', icon: '📝' },
  { id: 'open', label: 'Open to multiple', desc: 'Show me everything relevant', icon: '🌐' },
];

// ─── Dynamic Skills per Field ───
const SKILLS_BY_FIELD: Record<string, string[]> = {
  software_engineering: ['JavaScript/TypeScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS/Cloud', 'Docker/K8s', 'System Design', 'API Design', 'Git/CI-CD', 'Go/Rust', 'Mobile Development', 'GraphQL', 'Testing/QA'],
  data_analytics: ['SQL', 'Python', 'R', 'Tableau/Power BI', 'Statistical Analysis', 'ETL Pipelines', 'A/B Testing', 'Machine Learning', 'Data Modeling', 'Excel Advanced', 'Looker/Metabase', 'BigQuery/Snowflake', 'Data Storytelling', 'Predictive Modeling', 'Apache Spark'],
  devops_cloud: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD Pipelines', 'Linux Administration', 'Monitoring/Observability', 'Networking', 'Ansible/Chef', 'Serverless', 'Security', 'Infrastructure as Code', 'Site Reliability'],
  ai_ml: ['Python', 'TensorFlow/PyTorch', 'Deep Learning', 'NLP', 'Computer Vision', 'MLOps', 'Statistical Modeling', 'Feature Engineering', 'LLMs/Transformers', 'Reinforcement Learning', 'Data Pipeline', 'Research Methods', 'Model Deployment', 'A/B Testing', 'Mathematics'],
  cybersecurity: ['Network Security', 'Penetration Testing', 'SIEM Tools', 'Incident Response', 'Compliance (SOC2/HIPAA)', 'Cloud Security', 'Identity Management', 'Threat Analysis', 'Forensics', 'Vulnerability Assessment', 'Security Architecture', 'Risk Assessment', 'Encryption', 'Zero Trust', 'Security Automation'],
  nursing_clinical: ['Patient Assessment', 'EMR/EHR Systems', 'Clinical Procedures', 'Medication Administration', 'Care Planning', 'Telehealth', 'Infection Control', 'Patient Education', 'Vital Signs Monitoring', 'IV Therapy', 'Wound Care', 'CPR/BLS/ACLS', 'Critical Thinking', 'Team Communication', 'Documentation'],
  medicine: ['Clinical Diagnosis', 'Patient Management', 'EMR Systems', 'Research Methods', 'Evidence-Based Medicine', 'Surgical Skills', 'Medical Imaging', 'Lab Interpretation', 'Pharmacology', 'Telemedicine', 'Ethics', 'Leadership', 'Public Speaking', 'Medical Writing', 'Teaching'],
  pharmacy: ['Clinical Pharmacy', 'Pharmacokinetics', 'Drug Interactions', 'Compounding', 'Patient Counseling', 'Formulary Management', 'Regulatory Compliance', 'Medication Therapy', 'Inventory Management', 'Drug Information', 'Clinical Trials', 'Pharmacovigilance', 'Quality Assurance', 'Healthcare IT', 'Research'],
  bioinformatics: ['Python', 'R', 'Genomics/NGS Analysis', 'Biostatistics', 'Machine Learning', 'BLAST/HMMER', 'Clinical Data', 'EHR Systems', 'SQL', 'Cloud Computing', 'Molecular Biology', 'Proteomics', 'Pipeline Development', 'Data Visualization', 'Research Methods'],
  public_health: ['Epidemiology', 'Biostatistics', 'Health Policy', 'Community Health', 'Data Analysis', 'Grant Writing', 'Program Evaluation', 'Health Equity', 'Surveillance Systems', 'SAS/SPSS/R', 'Qualitative Research', 'Health Communication', 'Emergency Preparedness', 'GIS Mapping', 'Project Management'],
  biomedical_engineering: ['Medical Device Design', 'Biomechanics', 'Signal Processing', 'MATLAB', 'CAD/SolidWorks', 'Tissue Engineering', 'Regulatory (FDA)', 'Quality Systems', 'Imaging Systems', 'Biomaterials', 'Clinical Research', 'Python', 'Lab Skills', 'Statistics', 'Project Management'],
  health_administration: ['Healthcare Operations', 'Revenue Cycle Management', 'HIPAA Compliance', 'EMR/EHR Systems', 'Quality Improvement', 'Budget Management', 'Strategic Planning', 'Team Leadership', 'Patient Satisfaction', 'Data Analytics', 'Policy Analysis', 'Accreditation', 'Supply Chain', 'HR Management', 'Change Management'],
  finance_accounting: ['Financial Modeling', 'Excel/VBA', 'Bloomberg Terminal', 'Risk Assessment', 'Auditing', 'Tax Compliance', 'SAP/Oracle', 'Regulatory Knowledge', 'Valuation', 'Financial Statements', 'M&A Analysis', 'Portfolio Management', 'SQL', 'Python', 'CFA/CPA Preparation'],
  consulting: ['Strategy Development', 'Financial Analysis', 'Presentation Design', 'Client Management', 'Industry Research', 'Process Improvement', 'Project Management', 'Data Analysis', 'Problem Solving', 'Stakeholder Management', 'Excel/PowerPoint', 'Tableau', 'Workshop Facilitation', 'Change Management', 'Market Sizing'],
  marketing_growth: ['SEO/SEM', 'Google Analytics', 'Social Media Marketing', 'Content Strategy', 'A/B Testing', 'Email Marketing', 'CRM Tools (HubSpot/Salesforce)', 'Brand Strategy', 'Paid Advertising', 'Copywriting', 'Marketing Automation', 'Data Analysis', 'User Research', 'Product Marketing', 'Growth Hacking'],
  human_resources: ['Talent Acquisition', 'Employee Relations', 'HRIS Systems', 'Compensation & Benefits', 'Performance Management', 'Training & Development', 'Employment Law', 'DE&I Initiatives', 'Organizational Development', 'Workforce Planning', 'HR Analytics', 'Onboarding', 'Conflict Resolution', 'Change Management', 'Payroll'],
  operations_supply_chain: ['Supply Chain Management', 'Logistics', 'Inventory Management', 'Process Optimization', 'Six Sigma/Lean', 'ERP Systems (SAP)', 'Demand Forecasting', 'Vendor Management', 'Quality Control', 'Project Management', 'Data Analysis', 'Cost Reduction', 'Warehouse Management', 'Procurement', 'Risk Management'],
  product_management: ['User Research', 'Roadmap Planning', 'Agile/Scrum', 'Data Analysis', 'A/B Testing', 'Wireframing', 'Stakeholder Management', 'Competitive Analysis', 'SQL', 'Product Analytics', 'Go-to-Market Strategy', 'Feature Prioritization', 'OKR Setting', 'Technical Communication', 'Market Research'],
  research_science: ['Research Design', 'Statistical Analysis', 'Lab Techniques', 'Scientific Writing', 'Grant Writing', 'Data Analysis (Python/R)', 'Literature Review', 'Peer Review', 'Presentation Skills', 'Experimental Design', 'Reproducibility', 'Safety Protocols', 'Instrument Operation', 'Collaboration', 'Ethics'],
  environmental_science: ['Environmental Impact Assessment', 'GIS/Remote Sensing', 'Water Quality Analysis', 'Climate Modeling', 'Field Sampling', 'EPA Regulations', 'Data Analysis (R/Python)', 'Sustainability', 'Ecology', 'Soil Science', 'Environmental Policy', 'Project Management', 'Report Writing', 'Statistics', 'Public Communication'],
  chemistry_materials: ['Analytical Chemistry', 'Organic Synthesis', 'Spectroscopy (NMR/MS/IR)', 'Lab Safety', 'Quality Control', 'Materials Characterization', 'Polymer Science', 'Chemical Engineering', 'Python/MATLAB', 'Documentation', 'Scale-up Processes', 'R&D Methods', 'Regulatory Compliance', 'Data Analysis', 'Technical Writing'],
  physics: ['Mathematical Modeling', 'Data Analysis', 'Python/MATLAB', 'Lab Instrumentation', 'Simulation', 'Statistical Mechanics', 'Quantum Computing', 'Machine Learning', 'Signal Processing', 'Optics', 'Experimental Design', 'Technical Writing', 'Presentation', 'LaTeX', 'Problem Solving'],
  ux_product_design: ['User Research', 'Wireframing/Prototyping', 'Figma/Sketch', 'Usability Testing', 'Design Systems', 'Information Architecture', 'Interaction Design', 'Visual Design', 'Accessibility (WCAG)', 'Design Thinking', 'User Flows', 'A/B Testing', 'CSS/HTML', 'Motion Design', 'Stakeholder Presentation'],
  graphic_design: ['Adobe Creative Suite', 'Typography', 'Brand Identity', 'Layout Design', 'Color Theory', 'Print Production', 'Digital Illustration', 'Motion Graphics', 'Photography', 'Social Media Design', 'Packaging Design', 'Web Design', 'Figma', 'Art Direction', 'Client Communication'],
  content_writing: ['Technical Writing', 'Content Strategy', 'SEO Writing', 'Copywriting', 'Documentation', 'API Documentation', 'Markdown/RST', 'Editing/Proofreading', 'CMS Platforms', 'Analytics', 'UX Writing', 'Research', 'Style Guides', 'Localization', 'Storytelling'],
  law_legal: ['Legal Research', 'Contract Drafting', 'Compliance', 'Litigation', 'Due Diligence', 'Regulatory Affairs', 'Negotiation', 'Legal Writing', 'Corporate Law', 'IP Law', 'Employment Law', 'Client Management', 'E-Discovery', 'Case Management', 'Ethics'],
  public_policy: ['Policy Analysis', 'Legislative Research', 'Public Administration', 'Data Analysis', 'Stakeholder Engagement', 'Grant Writing', 'Budget Analysis', 'Program Evaluation', 'Public Speaking', 'Report Writing', 'Coalition Building', 'Regulatory Knowledge', 'Economics', 'Statistics', 'Communication'],
  teaching: ['Curriculum Design', 'Classroom Management', 'Student Assessment', 'Educational Technology', 'Differentiated Instruction', 'Special Education', 'Lesson Planning', 'Parent Communication', 'Mentoring', 'Research Methods', 'Grant Writing', 'Online Teaching', 'Data Analysis', 'Public Speaking', 'Cultural Competency'],
  edtech: ['Instructional Design', 'LMS Administration', 'E-Learning Development', 'Articulate/Captivate', 'Learning Analytics', 'Curriculum Design', 'Video Production', 'Assessment Design', 'UX for Learning', 'Accessibility', 'Project Management', 'HTML/CSS', 'SCORM/xAPI', 'User Research', 'Content Strategy'],
  mechanical_engineering: ['CAD (SolidWorks/AutoCAD)', 'FEA/CFD Simulation', 'Manufacturing Processes', 'Material Selection', 'Thermodynamics', 'MATLAB', 'GD&T', 'Prototyping', 'Quality Engineering', 'Project Management', 'Technical Drawing', 'Root Cause Analysis', 'Lean Manufacturing', 'Testing & Validation', 'Product Design'],
  civil_engineering: ['AutoCAD/Civil 3D', 'Structural Analysis', 'Geotechnical Engineering', 'Project Management', 'Building Codes', 'Surveying', 'Environmental Compliance', 'Construction Management', 'Hydrology', 'Transportation Design', 'BIM', 'Cost Estimation', 'Safety Regulations', 'Contract Management', 'GIS'],
  electrical_engineering: ['Circuit Design', 'PCB Layout', 'MATLAB/Simulink', 'Power Systems', 'Signal Processing', 'Embedded Systems', 'PLC Programming', 'Microcontrollers', 'FPGA', 'Control Systems', 'RF Engineering', 'Testing & Debugging', 'Schematic Design', 'Safety Standards', 'Python/C'],
  other: ['Communication', 'Problem Solving', 'Project Management', 'Data Analysis', 'Leadership', 'Team Collaboration', 'Microsoft Office', 'Research', 'Writing', 'Presentation', 'Critical Thinking', 'Time Management', 'Adaptability', 'Customer Service', 'Attention to Detail'],
};

// ─── Company Types ───
const COMPANY_TYPES = [
  { id: 'startup', label: 'Startup (under 50 people)', icon: '🚀' },
  { id: 'midsize', label: 'Mid-size company (50-500)', icon: '🏢' },
  { id: 'enterprise', label: 'Enterprise / Large corporation (500+)', icon: '🏙️' },
  { id: 'government', label: 'Government / Public sector', icon: '🏛️' },
  { id: 'university', label: 'University / Research institution', icon: '🎓' },
  { id: 'hospital', label: 'Hospital / Healthcare system', icon: '🏥' },
  { id: 'pharma', label: 'Pharma / Biotech', icon: '🧬' },
  { id: 'consulting', label: 'Consulting firm', icon: '📊' },
  { id: 'nonprofit', label: 'Non-profit / NGO', icon: '💚' },
  { id: 'finance', label: 'Financial institution / Bank', icon: '🏦' },
  { id: 'law_firm', label: 'Law firm', icon: '⚖️' },
  { id: 'no_preference', label: 'No preference', icon: '🌐' },
];

// ─── Work Authorization ───
const WORK_AUTH = [
  { id: 'citizen', label: 'Citizen / Permanent Resident' },
  { id: 'need_sponsorship', label: 'Need visa sponsorship (H1B, work permit)' },
  { id: 'student_visa', label: 'Student visa (OPT, CPT, post-study visa)' },
  { id: 'open_work', label: 'Open work permit' },
  { id: 'prefer_not_say', label: 'Prefer not to say' },
];

// ─── Role Suggestions ───
const ROLE_SUGGESTIONS: Record<string, { primary: string; alternatives: string[] }> = {
  software_engineering: { primary: 'Software Engineer', alternatives: ['Full Stack Developer', 'Frontend Engineer', 'Backend Engineer', 'Solutions Engineer'] },
  data_analytics: { primary: 'Data Analyst', alternatives: ['Business Analyst', 'Data Engineer', 'BI Developer', 'Analytics Engineer'] },
  devops_cloud: { primary: 'DevOps Engineer', alternatives: ['Site Reliability Engineer', 'Cloud Engineer', 'Platform Engineer', 'Infrastructure Engineer'] },
  ai_ml: { primary: 'ML Engineer', alternatives: ['AI Engineer', 'Data Scientist', 'Research Engineer', 'Applied Scientist'] },
  cybersecurity: { primary: 'Security Engineer', alternatives: ['Security Analyst', 'Penetration Tester', 'SOC Analyst', 'Security Architect'] },
  nursing_clinical: { primary: 'Registered Nurse', alternatives: ['Nurse Practitioner', 'Clinical Coordinator', 'Health Informatics Specialist', 'Telehealth Nurse'] },
  medicine: { primary: 'Physician', alternatives: ['Medical Resident', 'Clinical Researcher', 'Medical Director', 'Hospitalist'] },
  pharmacy: { primary: 'Pharmacist', alternatives: ['Clinical Pharmacist', 'Pharmacy Manager', 'Pharmaceutical Scientist', 'Drug Safety Specialist'] },
  bioinformatics: { primary: 'Bioinformatics Scientist', alternatives: ['Computational Biologist', 'Genomics Data Analyst', 'Bioinformatics Engineer', 'Clinical Data Scientist'] },
  public_health: { primary: 'Public Health Analyst', alternatives: ['Epidemiologist', 'Health Program Manager', 'Community Health Specialist', 'Research Coordinator'] },
  biomedical_engineering: { primary: 'Biomedical Engineer', alternatives: ['Medical Device Engineer', 'Clinical Engineer', 'Regulatory Affairs Specialist', 'R&D Engineer'] },
  health_administration: { primary: 'Healthcare Administrator', alternatives: ['Practice Manager', 'Health Services Manager', 'Operations Director', 'Revenue Cycle Manager'] },
  finance_accounting: { primary: 'Financial Analyst', alternatives: ['Investment Banking Analyst', 'Risk Analyst', 'FP&A Analyst', 'Portfolio Manager'] },
  consulting: { primary: 'Management Consultant', alternatives: ['Strategy Consultant', 'Business Analyst', 'Implementation Consultant', 'Associate'] },
  marketing_growth: { primary: 'Marketing Manager', alternatives: ['Growth Manager', 'Digital Marketing Specialist', 'Content Strategist', 'Brand Manager'] },
  human_resources: { primary: 'HR Generalist', alternatives: ['Recruiter', 'HR Business Partner', 'Compensation Analyst', 'Learning & Development Manager'] },
  operations_supply_chain: { primary: 'Operations Manager', alternatives: ['Supply Chain Analyst', 'Logistics Coordinator', 'Process Engineer', 'Procurement Specialist'] },
  product_management: { primary: 'Product Manager', alternatives: ['Technical Program Manager', 'Product Owner', 'Business Analyst', 'Product Strategist'] },
  research_science: { primary: 'Research Scientist', alternatives: ['Lab Manager', 'Research Associate', 'Postdoctoral Researcher', 'Science Writer'] },
  environmental_science: { primary: 'Environmental Scientist', alternatives: ['Sustainability Analyst', 'Environmental Consultant', 'Conservation Scientist', 'Climate Analyst'] },
  chemistry_materials: { primary: 'Chemist', alternatives: ['Materials Scientist', 'Quality Control Analyst', 'Process Chemist', 'Formulation Scientist'] },
  physics: { primary: 'Physicist', alternatives: ['Research Scientist', 'Optical Engineer', 'Quantitative Analyst', 'Simulation Engineer'] },
  ux_product_design: { primary: 'Product Designer', alternatives: ['UX Researcher', 'UI Designer', 'Design Systems Engineer', 'Interaction Designer'] },
  graphic_design: { primary: 'Graphic Designer', alternatives: ['Brand Designer', 'Art Director', 'Visual Designer', 'Motion Designer'] },
  content_writing: { primary: 'Technical Writer', alternatives: ['Content Strategist', 'UX Writer', 'Documentation Engineer', 'Copywriter'] },
  law_legal: { primary: 'Attorney', alternatives: ['Legal Analyst', 'Paralegal', 'Compliance Officer', 'Corporate Counsel'] },
  public_policy: { primary: 'Policy Analyst', alternatives: ['Legislative Assistant', 'Program Manager', 'Government Relations', 'Research Analyst'] },
  teaching: { primary: 'Teacher', alternatives: ['Professor', 'Academic Advisor', 'Curriculum Designer', 'Education Coordinator'] },
  edtech: { primary: 'Instructional Designer', alternatives: ['EdTech Product Manager', 'Learning Engineer', 'E-Learning Developer', 'Training Specialist'] },
  mechanical_engineering: { primary: 'Mechanical Engineer', alternatives: ['Design Engineer', 'Manufacturing Engineer', 'Quality Engineer', 'Test Engineer'] },
  civil_engineering: { primary: 'Civil Engineer', alternatives: ['Structural Engineer', 'Project Engineer', 'Construction Manager', 'Transportation Engineer'] },
  electrical_engineering: { primary: 'Electrical Engineer', alternatives: ['Hardware Engineer', 'Power Systems Engineer', 'Embedded Systems Engineer', 'RF Engineer'] },
  other: { primary: 'Professional', alternatives: ['Analyst', 'Coordinator', 'Specialist', 'Manager'] },
};

// ─── Question Config ───
interface Question {
  id: string;
  title: string;
  subtitle?: string;
  why: string;
  unlocking: string;
  type: 'single' | 'multi' | 'grouped';
  maxSelections?: number;
}

const QUESTIONS: Question[] = [
  {
    id: 'field',
    title: 'What is your primary field?',
    subtitle: 'Select the area that best describes your career focus',
    why: 'This determines which job boards we scan and how we match you with opportunities.',
    unlocking: 'Field-specific job feeds, targeted company lists, and relevant skill matching',
    type: 'grouped',
  },
  {
    id: 'career_stage',
    title: 'What best describes your current stage?',
    subtitle: 'This helps us calibrate everything for you',
    why: 'Students who specify their exact stage get 3× more relevant matches.',
    unlocking: 'Stage-appropriate roles, salary ranges, and application timelines',
    type: 'single',
  },
  {
    id: 'job_type',
    title: 'What type of opportunity are you looking for?',
    subtitle: 'You can always change this later',
    why: 'Internships and full-time roles have different application timelines — we\'ll alert you when hiring windows open.',
    unlocking: 'Timing-aware alerts, program-specific filters, and deadline tracking',
    type: 'single',
  },
  {
    id: 'skills',
    title: 'Select your strongest skills',
    subtitle: 'Pick up to 8 — these power your AI resume tailoring',
    why: 'Your skills directly power our AI resume matching — the more you add, the stronger your tailored resumes.',
    unlocking: 'Keyword-optimized resumes, skill-gap analysis, and learning recommendations',
    type: 'multi',
    maxSelections: 8,
  },
  {
    id: 'company_type',
    title: 'What kind of organization do you prefer?',
    subtitle: 'Select all that appeal to you',
    why: 'We prioritize job sources that match your preferred work environment.',
    unlocking: 'Curated company lists, culture-fit matching, and targeted career pages',
    type: 'multi',
    maxSelections: 5,
  },
  {
    id: 'work_auth',
    title: 'What is your work authorization status?',
    subtitle: 'This helps filter roles you\'re eligible for',
    why: 'This filters out roles that don\'t match your authorization — no more wasted applications.',
    unlocking: 'Sponsorship filters, visa-friendly employer lists, and compliance-aware matching',
    type: 'single',
  },
];

// ─── Component ───
export default function AssessmentPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResults, setShowResults] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const router = useRouter();

  const currentQ = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  // Dynamic skills based on field
  const currentSkills = useMemo(() => {
    const field = answers.field as string;
    return SKILLS_BY_FIELD[field] || SKILLS_BY_FIELD.other;
  }, [answers.field]);

  // Get options for current question
  const getOptions = () => {
    switch (currentQ.id) {
      case 'career_stage': return CAREER_STAGES;
      case 'job_type': return JOB_TYPES;
      case 'company_type': return COMPANY_TYPES;
      case 'work_auth': return WORK_AUTH.map(w => ({ ...w, icon: undefined, desc: undefined }));
      default: return [];
    }
  };

  // Show animated confirmation then advance
  const showConfirmAndAdvance = (message: string) => {
    setShowConfirmation(message);
    setTimeout(() => {
      setShowConfirmation('');
      if (step < totalSteps - 1) {
        setStep(step + 1);
      } else {
        setShowResults(true);
      }
    }, 800);
  };

  const handleSingleSelect = (value: string) => {
    setAnswers({ ...answers, [currentQ.id]: value });

    const label = currentQ.id === 'field'
      ? CAREER_FIELDS.flatMap(g => g.fields).find(f => f.id === value)?.label
      : currentQ.id === 'career_stage'
        ? CAREER_STAGES.find(s => s.id === value)?.label
        : currentQ.id === 'job_type'
          ? JOB_TYPES.find(j => j.id === value)?.label
          : value;

    showConfirmAndAdvance(`✓ Great choice — we'll optimize for ${label?.split('—')[0].trim() || value}`);
  };

  const handleMultiSelect = (value: string) => {
    const current = (answers[currentQ.id] as string[]) || [];
    const max = currentQ.maxSelections || 10;
    if (current.includes(value)) {
      setAnswers({ ...answers, [currentQ.id]: current.filter(v => v !== value) });
    } else if (current.length < max) {
      setAnswers({ ...answers, [currentQ.id]: [...current, value] });
    }
  };

  const handleMultiContinue = () => {
    const selected = (answers[currentQ.id] as string[]) || [];
    showConfirmAndAdvance(`✓ ${selected.length} selections saved — building your profile`);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => router.push('/onboarding/profile-setup');

  // ─── Save and Continue ───
  const handleSaveAndContinue = async () => {
    setLoading(true);
    setSaveError('');

    const field = (answers.field as string) || 'other';
    const suggestion = ROLE_SUGGESTIONS[field] || ROLE_SUGGESTIONS.other;
    const stage = answers.career_stage as string;

    // Add internship suffix for student stages
    const isStudent = ['2nd_year', '3rd_year', 'final_year'].includes(stage);
    const primaryRole = isStudent ? `${suggestion.primary} Intern` : suggestion.primary;
    const alternativeRoles = isStudent
      ? suggestion.alternatives.map(r => `${r} Intern`)
      : suggestion.alternatives;

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_profile: {
            profile_name: primaryRole,
            target_titles: [primaryRole, ...alternativeRoles.slice(0, 3)],
            priority_skills: (answers.skills as string[]) || [],
            is_primary: true,
          },
        }),
      });

      if (res.status === 401) {
        setSaveError('Your session has expired. Redirecting to sign in...');
        setTimeout(() => router.push('/auth-pages/login'), 1500);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error('Assessment save error:', json);
      }
    } catch (err) {
      console.error('Assessment save error:', err);
    }

    router.push('/onboarding/profile-setup');
  };

  // ─── Results Screen ───
  if (showResults) {
    const field = (answers.field as string) || 'other';
    const suggestion = ROLE_SUGGESTIONS[field] || ROLE_SUGGESTIONS.other;
    const stage = answers.career_stage as string;
    const isStudent = ['2nd_year', '3rd_year', 'final_year'].includes(stage);
    const primaryRole = isStudent ? `${suggestion.primary} Intern` : suggestion.primary;
    const alternativeRoles = isStudent
      ? suggestion.alternatives.map(r => `${r} Intern`)
      : suggestion.alternatives;
    const skills = (answers.skills as string[]) || [];
    const answeredCount = Object.keys(answers).length;
    const profileStrength = Math.min(100, Math.round((answeredCount / totalSteps) * 80 + (skills.length > 3 ? 20 : skills.length * 5)));

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
        <div className="max-w-lg mx-auto animate-fade-in-up">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25 animate-bounce-in">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">🎯 Your Career Profile is Ready</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Based on your answers, here&apos;s your personalized plan</p>
          </div>

          {/* Profile Strength */}
          <div className="glass rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Profile strength</span>
              <span className="text-xs font-semibold text-karmio-500">{profileStrength}%</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-karmio-500 to-emerald-500 rounded-full transition-all duration-1000 progress-glow" style={{ width: `${profileStrength}%` }} />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Complete your profile in the next step to reach 100%</p>
          </div>

          {/* Primary Target */}
          <div className="glass rounded-2xl p-5 mb-4">
            <p className="text-xs text-slate-500 mb-1.5">Primary target role</p>
            <p className="text-xl font-semibold gradient-text">{primaryRole}</p>
          </div>

          {/* Alternative Roles */}
          <div className="glass rounded-2xl p-5 mb-4">
            <p className="text-xs text-slate-500 mb-3">Also consider these roles</p>
            <div className="space-y-2">
              {alternativeRoles.map((role) => (
                <div key={role} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-karmio-500 flex-shrink-0"><path d="M3 8l3 3 7-7" /></svg>
                  {role}
                </div>
              ))}
            </div>
          </div>

          {/* What we'll do */}
          <div className="glass rounded-2xl p-5 mb-6">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-3">What Karmio will do for you</p>
            <div className="space-y-2.5">
              {[
                'Scan verified job boards daily for matching roles',
                'AI-tailor your resume for each application',
                isStudent ? 'Alert you when internship hiring windows open' : 'Track your applications from saved to offer',
                'Suggest networking contacts at target companies',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-red-500 text-center mb-3">{saveError}</p>
          )}

          <Button variant="primary" fullWidth onClick={handleSaveAndContinue} loading={loading} size="lg">
            Save and continue →
          </Button>
        </div>
      </div>
    );
  }

  // ─── Confirmation overlay ───
  if (showConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="text-center animate-scale-in">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{showConfirmation}</p>
        </div>
      </div>
    );
  }

  // ─── Question Renderer ───
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-5">
          <p className="text-xs text-karmio-500 font-medium mb-2">Step 2 of 3 — Question {step + 1} of {totalSteps}</p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white animate-fade-in">{currentQ.title}</h1>
          {currentQ.subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{currentQ.subtitle}</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-karmio-500 to-karmio-400 rounded-full transition-all duration-500 progress-glow" style={{ width: `${progress}%` }} />
        </div>

        {/* Why + Unlocking */}
        <div className="glass rounded-xl p-4 mb-5 space-y-2 animate-fade-in">
          <div className="flex items-start gap-2">
            <span className="text-sm mt-0.5">💡</span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed"><strong className="text-slate-700 dark:text-slate-300">Why:</strong> {currentQ.why}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm mt-0.5">🔓</span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed"><strong className="text-slate-700 dark:text-slate-300">Unlocking:</strong> {currentQ.unlocking}</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2 mb-5 animate-fade-in-up">
          {currentQ.id === 'field' ? (
            // Grouped career fields
            <div className="space-y-4">
              {CAREER_FIELDS.map(group => (
                <div key={group.group}>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">{group.group}</p>
                  <div className="space-y-1.5">
                    {group.fields.map(field => (
                      <button
                        key={field.id}
                        onClick={() => handleSingleSelect(field.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 flex items-center gap-3 card-hover ${answers.field === field.id
                            ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20 text-karmio-700 dark:text-karmio-300 font-medium shadow-sm'
                            : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <span className="text-lg">{field.icon}</span>
                        {field.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : currentQ.id === 'skills' ? (
            // Skills (dynamic, multi-select)
            <div className="flex flex-wrap gap-2">
              {currentSkills.map(skill => {
                const selected = ((answers.skills as string[]) || []).includes(skill);
                return (
                  <button
                    key={skill}
                    onClick={() => handleMultiSelect(skill)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${selected
                        ? 'bg-karmio-500 text-white border-karmio-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/50 hover:border-karmio-300'
                      }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          ) : currentQ.type === 'single' ? (
            // Single select with descriptions
            getOptions().map((option: any) => (
              <button
                key={option.id}
                onClick={() => handleSingleSelect(option.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 card-hover ${answers[currentQ.id] === option.id
                    ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20 text-karmio-700 dark:text-karmio-300 font-medium shadow-sm'
                    : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {option.icon && <span className="text-lg">{option.icon}</span>}
                  <div>
                    <p>{option.label}</p>
                    {option.desc && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{option.desc}</p>}
                  </div>
                </div>
              </button>
            ))
          ) : (
            // Multi-select for company types
            getOptions().map((option: any) => {
              const selected = ((answers[currentQ.id] as string[]) || []).includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleMultiSelect(option.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 card-hover ${selected
                      ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20 text-karmio-700 dark:text-karmio-300 font-medium shadow-sm'
                      : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {option.icon && <span className="text-lg">{option.icon}</span>}
                    {option.label}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Multi-select continue button */}
        {(currentQ.type === 'multi') && (
          <Button
            variant="primary"
            fullWidth
            onClick={handleMultiContinue}
            disabled={!answers[currentQ.id] || (answers[currentQ.id] as string[]).length === 0}
            size="lg"
          >
            Continue ({((answers[currentQ.id] as string[]) || []).length} selected)
          </Button>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          {step > 0 ? (
            <button onClick={handleBack} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              ← Back
            </button>
          ) : <div />}
          <button onClick={handleSkip} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Skip assessment
          </button>
        </div>
      </div>
    </div>
  );
}