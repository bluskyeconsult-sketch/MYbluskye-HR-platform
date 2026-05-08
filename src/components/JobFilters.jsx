// src/components/JobFilters.jsx
import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

const COUNTRIES = [
  { code: 'all', name: 'All Countries', flag: '🌍' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' }
];

const JOB_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'remote', label: 'Remote' }
];

const EXPERIENCE_LEVELS = [
  { value: 'all', label: 'Any Experience' },
  { value: 'entry', label: 'Entry Level (0-2 years)' },
  { value: 'mid', label: 'Mid Level (3-5 years)' },
  { value: 'senior', label: 'Senior Level (6-9 years)' },
  { value: 'executive', label: 'Executive (10+ years)' }
];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'salary_desc', label: 'Highest Salary' },
  { value: 'salary_asc', label: 'Lowest Salary' }
];

export default function JobFilters({ filters, onFilterChange, onSortChange, onSearchChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const FilterSection = ({ title, children }) => (
    <div className="border-b border-slate-800 py-4">
      <button
        onClick={() => setExpandedSection(expandedSection === title ? null : title)}
        className="flex justify-between items-center w-full text-left"
      >
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {expandedSection === title ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expandedSection === title && <div className="mt-3">{children}</div>}
    </div>
  );

  return (
    <>
      {/* Mobile Filter Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-20 right-6 z-40 p-3 bg-primary-600 rounded-full shadow-lg"
      >
        <Filter className="w-5 h-5 text-white" />
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        <div className="sticky top-24 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Filters</h2>
          
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search jobs..."
              value={filters.search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
            />
          </div>
          
          <FilterSection title="Job Type">
            <div className="space-y-2">
              {JOB_TYPES.map(type => (
                <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="jobType"
                    value={type.value}
                    checked={filters.jobType === type.value}
                    onChange={() => onFilterChange('jobType', type.value)}
                    className="rounded-full border-slate-600 text-primary-500"
                  />
                  <span className="text-sm text-slate-300">{type.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>
          
          <FilterSection title="Country">
            <div className="space-y-2">
              {COUNTRIES.map(country => (
                <label key={country.code} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="country"
                    value={country.code}
                    checked={filters.country === country.code}
                    onChange={() => onFilterChange('country', country.code)}
                    className="rounded-full border-slate-600 text-primary-500"
                  />
                  <span className="text-sm text-slate-300">
                    <span className="mr-1">{country.flag}</span> {country.name}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>
          
          <FilterSection title="Experience Level">
            <div className="space-y-2">
              {EXPERIENCE_LEVELS.map(level => (
                <label key={level.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="experience"
                    value={level.value}
                    checked={filters.experience === level.value}
                    onChange={() => onFilterChange('experience', level.value)}
                    className="rounded-full border-slate-600 text-primary-500"
                  />
                  <span className="text-sm text-slate-300">{level.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>
          
          {/* Sort */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-3">Sort By</h3>
            <select
              value={filters.sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          {/* Reset Filters */}
          {(filters.country !== 'all' || filters.jobType !== 'all' || filters.experience !== 'all' || filters.search) && (
            <button
              onClick={() => {
                onFilterChange('reset');
                onSearchChange('');
              }}
              className="mt-4 text-sm text-primary-400 hover:text-primary-300"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900 shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Filters</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {/* Same filter content as desktop */}
              <input
                type="text"
                placeholder="Search jobs..."
                value={filters.search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white mb-4"
              />
              
              <div className="space-y-4">
                <div><h3 className="text-sm font-semibold text-white mb-2">Job Type</h3>{JOB_TYPES.map(type => (
                  <label key={type.value} className="flex items-center gap-2 py-1"><input type="radio" name="mobileJobType" value={type.value} checked={filters.jobType === type.value} onChange={() => onFilterChange('jobType', type.value)} className="rounded-full border-slate-600 text-primary-500" /><span className="text-sm text-slate-300">{type.label}</span></label>
                ))}</div>
                
                <div><h3 className="text-sm font-semibold text-white mb-2">Country</h3>{COUNTRIES.map(country => (
                  <label key={country.code} className="flex items-center gap-2 py-1"><input type="radio" name="mobileCountry" value={country.code} checked={filters.country === country.code} onChange={() => onFilterChange('country', country.code)} className="rounded-full border-slate-600 text-primary-500" /><span className="text-sm text-slate-300"><span className="mr-1">{country.flag}</span> {country.name}</span></label>
                ))}</div>
                
                <div><h3 className="text-sm font-semibold text-white mb-2">Sort By</h3><select value={filters.sortBy} onChange={(e) => onSortChange(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">{SORT_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}</select></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
