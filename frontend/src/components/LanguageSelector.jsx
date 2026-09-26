import React from 'react';
import { Languages } from 'lucide-react';

export const LANGUAGE_OPTIONS = [
  ['auto', 'Match my input'],
  ['english', 'English'],
  ['hindi', 'हिन्दी'],
  ['bengali', 'বাংলা'],
  ['telugu', 'తెలుగు'],
  ['marathi', 'मराठी'],
  ['tamil', 'தமிழ்'],
  ['gujarati', 'ગુજરાતી'],
  ['kannada', 'ಕನ್ನಡ'],
  ['malayalam', 'മലയാളം'],
  ['punjabi', 'ਪੰਜਾਬੀ'],
  ['odia', 'ଓଡ଼ିଆ'],
  ['assamese', 'অসমীয়া'],
  ['urdu', 'اردو'],
];

const languageKey = (studentId) => `nexora:output-language:${studentId || 'default'}`;

export const loadOutputLanguage = (studentId) => {
  const saved = localStorage.getItem(languageKey(studentId)) || 'auto';
  return LANGUAGE_OPTIONS.some(([value]) => value === saved) ? saved : 'auto';
};

export const saveOutputLanguage = (studentId, language) => {
  localStorage.setItem(languageKey(studentId), language);
};

export default function LanguageSelector({ value, onChange, compact = false }) {
  return (
    <label className={`language-selector ${compact ? 'language-selector--compact' : ''}`}>
      <span><Languages size={15} /> Output language</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Output language">
        {LANGUAGE_OPTIONS.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
      </select>
      {!compact && <small>Type your query in any language. Auto replies in the language you use.</small>}
    </label>
  );
}
