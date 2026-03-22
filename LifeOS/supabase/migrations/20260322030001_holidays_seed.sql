-- Holiday Seed Data
-- LOG-25: Seed public holidays for US, GB, AU, IN, DE, FR — 2026 & 2027
-- Covers national/federal public holidays only.

insert into public.holidays (country_code, name, date) values

-- ============================================================
-- UNITED STATES
-- ============================================================
-- 2026
('US', 'New Year''s Day',       '2026-01-01'),
('US', 'Martin Luther King Jr. Day', '2026-01-19'),
('US', 'Presidents'' Day',      '2026-02-16'),
('US', 'Memorial Day',          '2026-05-25'),
('US', 'Juneteenth',            '2026-06-19'),
('US', 'Independence Day',      '2026-07-04'),
('US', 'Labor Day',             '2026-09-07'),
('US', 'Columbus Day',          '2026-10-12'),
('US', 'Veterans Day',          '2026-11-11'),
('US', 'Thanksgiving Day',      '2026-11-26'),
('US', 'Christmas Day',         '2026-12-25'),
-- 2027
('US', 'New Year''s Day',       '2027-01-01'),
('US', 'Martin Luther King Jr. Day', '2027-01-18'),
('US', 'Presidents'' Day',      '2027-02-15'),
('US', 'Memorial Day',          '2027-05-31'),
('US', 'Juneteenth',            '2027-06-19'),
('US', 'Independence Day',      '2027-07-04'),
('US', 'Labor Day',             '2027-09-06'),
('US', 'Columbus Day',          '2027-10-11'),
('US', 'Veterans Day',          '2027-11-11'),
('US', 'Thanksgiving Day',      '2027-11-25'),
('US', 'Christmas Day',         '2027-12-25'),

-- ============================================================
-- UNITED KINGDOM
-- ============================================================
-- 2026 (Easter Sunday = 5 Apr 2026)
('GB', 'New Year''s Day',        '2026-01-01'),
('GB', 'Good Friday',            '2026-04-03'),
('GB', 'Easter Monday',          '2026-04-06'),
('GB', 'Early May Bank Holiday', '2026-05-04'),
('GB', 'Spring Bank Holiday',    '2026-05-25'),
('GB', 'Summer Bank Holiday',    '2026-08-31'),
('GB', 'Christmas Day',          '2026-12-25'),
('GB', 'Boxing Day',             '2026-12-26'),
-- 2027 (Easter Sunday = 28 Mar 2027)
('GB', 'New Year''s Day',        '2027-01-01'),
('GB', 'Good Friday',            '2027-03-26'),
('GB', 'Easter Monday',          '2027-03-29'),
('GB', 'Early May Bank Holiday', '2027-05-03'),
('GB', 'Spring Bank Holiday',    '2027-05-31'),
('GB', 'Summer Bank Holiday',    '2027-08-30'),
('GB', 'Christmas Day',          '2027-12-25'),
('GB', 'Boxing Day',             '2027-12-27'),

-- ============================================================
-- AUSTRALIA (national holidays only)
-- ============================================================
-- 2026 (Easter Sunday = 5 Apr 2026)
('AU', 'New Year''s Day',    '2026-01-01'),
('AU', 'Australia Day',      '2026-01-26'),
('AU', 'Good Friday',        '2026-04-03'),
('AU', 'Easter Saturday',    '2026-04-04'),
('AU', 'Easter Sunday',      '2026-04-05'),
('AU', 'Easter Monday',      '2026-04-06'),
('AU', 'Anzac Day',          '2026-04-25'),
('AU', 'Christmas Day',      '2026-12-25'),
('AU', 'Boxing Day',         '2026-12-26'),
-- 2027 (Easter Sunday = 28 Mar 2027)
('AU', 'New Year''s Day',    '2027-01-01'),
('AU', 'Australia Day',      '2027-01-26'),
('AU', 'Good Friday',        '2027-03-26'),
('AU', 'Easter Saturday',    '2027-03-27'),
('AU', 'Easter Sunday',      '2027-03-28'),
('AU', 'Easter Monday',      '2027-03-29'),
('AU', 'Anzac Day',          '2027-04-25'),
('AU', 'Christmas Day',      '2027-12-25'),
('AU', 'Boxing Day',         '2027-12-27'),

-- ============================================================
-- INDIA (central gazetted holidays)
-- ============================================================
-- 2026
('IN', 'New Year''s Day',          '2026-01-01'),
('IN', 'Republic Day',             '2026-01-26'),
('IN', 'Holi',                     '2026-03-04'),
('IN', 'Good Friday',              '2026-04-03'),
('IN', 'Dr. Ambedkar Jayanti',     '2026-04-14'),
('IN', 'Eid ul-Fitr',              '2026-03-21'),
('IN', 'Eid ul-Adha',              '2026-05-28'),
('IN', 'Independence Day',         '2026-08-15'),
('IN', 'Janmashtami',              '2026-08-24'),
('IN', 'Gandhi Jayanti',           '2026-10-02'),
('IN', 'Dussehra',                 '2026-10-20'),
('IN', 'Diwali',                   '2026-11-09'),
('IN', 'Christmas Day',            '2026-12-25'),
-- 2027
('IN', 'New Year''s Day',          '2027-01-01'),
('IN', 'Republic Day',             '2027-01-26'),
('IN', 'Holi',                     '2027-03-23'),
('IN', 'Good Friday',              '2027-03-26'),
('IN', 'Dr. Ambedkar Jayanti',     '2027-04-14'),
('IN', 'Eid ul-Fitr',              '2027-03-10'),
('IN', 'Eid ul-Adha',              '2027-05-17'),
('IN', 'Independence Day',         '2027-08-15'),
('IN', 'Janmashtami',              '2027-08-13'),
('IN', 'Gandhi Jayanti',           '2027-10-02'),
('IN', 'Dussehra',                 '2027-10-10'),
('IN', 'Diwali',                   '2027-10-29'),
('IN', 'Christmas Day',            '2027-12-25'),

-- ============================================================
-- GERMANY (national holidays; Bundesfeiertage)
-- ============================================================
-- 2026 (Easter Sunday = 5 Apr 2026)
('DE', 'Neujahrstag',              '2026-01-01'),
('DE', 'Karfreitag',               '2026-04-03'),
('DE', 'Ostermontag',              '2026-04-06'),
('DE', 'Tag der Arbeit',           '2026-05-01'),
('DE', 'Christi Himmelfahrt',      '2026-05-14'),
('DE', 'Pfingstmontag',            '2026-05-25'),
('DE', 'Tag der Deutschen Einheit','2026-10-03'),
('DE', '1. Weihnachtstag',         '2026-12-25'),
('DE', '2. Weihnachtstag',         '2026-12-26'),
-- 2027 (Easter Sunday = 28 Mar 2027)
('DE', 'Neujahrstag',              '2027-01-01'),
('DE', 'Karfreitag',               '2027-03-26'),
('DE', 'Ostermontag',              '2027-03-29'),
('DE', 'Tag der Arbeit',           '2027-05-01'),
('DE', 'Christi Himmelfahrt',      '2027-05-06'),
('DE', 'Pfingstmontag',            '2027-05-17'),
('DE', 'Tag der Deutschen Einheit','2027-10-03'),
('DE', '1. Weihnachtstag',         '2027-12-25'),
('DE', '2. Weihnachtstag',         '2027-12-26'),

-- ============================================================
-- FRANCE (jours fériés nationaux)
-- ============================================================
-- 2026 (Easter Sunday = 5 Apr 2026)
('FR', 'Jour de l''An',                      '2026-01-01'),
('FR', 'Lundi de Pâques',                    '2026-04-06'),
('FR', 'Fête du Travail',                    '2026-05-01'),
('FR', 'Victoire 1945',                      '2026-05-08'),
('FR', 'Ascension',                          '2026-05-14'),
('FR', 'Lundi de Pentecôte',                 '2026-05-25'),
('FR', 'Fête Nationale',                     '2026-07-14'),
('FR', 'Assomption',                         '2026-08-15'),
('FR', 'Toussaint',                          '2026-11-01'),
('FR', 'Armistice',                          '2026-11-11'),
('FR', 'Noël',                               '2026-12-25'),
-- 2027 (Easter Sunday = 28 Mar 2027)
('FR', 'Jour de l''An',                      '2027-01-01'),
('FR', 'Lundi de Pâques',                    '2027-03-29'),
('FR', 'Fête du Travail',                    '2027-05-01'),
('FR', 'Victoire 1945',                      '2027-05-08'),
('FR', 'Ascension',                          '2027-05-06'),
('FR', 'Lundi de Pentecôte',                 '2027-05-17'),
('FR', 'Fête Nationale',                     '2027-07-14'),
('FR', 'Assomption',                         '2027-08-15'),
('FR', 'Toussaint',                          '2027-11-01'),
('FR', 'Armistice',                          '2027-11-11'),
('FR', 'Noël',                               '2027-12-25')

on conflict (country_code, date, name) do nothing;
