import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = __dirname; // frontend/ lives beside integration/

// =============================================================================
// DOMAIN MODELS & TYPES
// =============================================================================
interface User {
  userId: number;
  fullName: string;
  normalizedName: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface UserSession {
  token: string;
  userId: number;
  fullName: string;
  normalizedName: string;
  email: string;
  createdAt: number;
}

interface Company {
  companyId: number;
  name: string;
  location: string;
  roleOffered: string;
  contactEmail: string;
}

interface Application {
  applicationId: number;
  companyId: number;
  role: string;
  type: string; // 'Job' | 'Internship'
  appliedDate: string;
  status: string; // 'Applied' | 'Shortlisted' | 'Interview Scheduled' | 'Offered' | 'Rejected'
  followUpDate: string | null;
}

interface Interview {
  interviewId: number;
  applicationId: number;
  interviewDate: string;
  round: string; // 'Aptitude' | 'Technical' | 'HR'
  result: string; // 'Pending' | 'Cleared' | 'Rejected'
}

interface Offer {
  offerId: number;
  applicationId: number;
  packageLpa: number;
  deadline: string;
  offerStatus: string; // 'Pending' | 'Accepted' | 'Rejected'
}

// =============================================================================
// PASSWORD SECURITY UTILITY (PBKDF2WithHmacSHA256 & CONSTANT-TIME VERIFY)
// =============================================================================
const ITERATIONS = 65536;
const KEY_LENGTH = 32; // 256 bits

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  return `${ITERATIONS}:${salt.toString('base64')}:${hash.toString('base64')}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;

  try {
    const iterations = parseInt(parts[0], 10);
    const salt = Buffer.from(parts[1], 'base64');
    const expectedHash = Buffer.from(parts[2], 'base64');
    const actualHash = crypto.pbkdf2Sync(password, salt, iterations, expectedHash.length, 'sha256');

    // Constant-time buffer comparison prevents timing attacks
    return crypto.timingSafeEqual(expectedHash, actualHash);
  } catch (err) {
    return false;
  }
}

/**
 * Normalizes account name:
 * Trims leading/trailing spaces, collapses repeated internal spaces, and lowercases.
 * E.g. "  Ramya   " -> "ramya", "Ramya" -> "ramya".
 */
function normalizeAccountName(rawName: string): string {
  if (!rawName) return '';
  return rawName.trim().replace(/\s+/g, ' ').toLowerCase();
}

// =============================================================================
// DATABASE STATE
// =============================================================================
let users: User[] = [
  {
    userId: 1,
    fullName: 'Ramya Ranjith',
    normalizedName: 'ramya ranjith',
    email: 'ramya@college.edu',
    passwordHash: hashPassword('password123'),
    createdAt: new Date().toISOString()
  }
];
let nextUserId = 2;

// Active sessions indexed by unpredictable 256-bit token
const activeSessions = new Map<string, UserSession>();
const SESSION_COOKIE_NAME = 'CT_SESSION';

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function getSession(req: Request): UserSession | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawKey, ...valParts] = cookie.trim().split('=');
    if (rawKey === SESSION_COOKIE_NAME) {
      const token = valParts.join('=');
      const session = activeSessions.get(token);
      if (session) return session;
    }
  }
  return null;
}

let companies: Company[] = [
  { companyId: 1, name: 'ABC Technologies', location: 'Chennai, India', roleOffered: 'Software Developer Intern', contactEmail: 'hr@abctech.com' },
  { companyId: 2, name: 'XYZ Solutions', location: 'Bangalore, India', roleOffered: 'Graduate Engineer Trainee', contactEmail: 'careers@xyz.com' },
  { companyId: 3, name: 'BrightSoft', location: 'Hyderabad, India', roleOffered: 'Java Developer Intern', contactEmail: 'hr@brightsoft.com' },
  { companyId: 4, name: 'Nexa Systems', location: 'Chennai, India', roleOffered: 'Associate Engineer', contactEmail: 'jobs@nexa.com' },
  { companyId: 5, name: 'TechCorp', location: 'Pune, India', roleOffered: 'Data Analyst', contactEmail: 'hr@techcorp.com' },
  { companyId: 6, name: 'CodeLabs', location: 'Delhi, India', roleOffered: 'Web Development Intern', contactEmail: 'careers@codelabs.com' }
];

let applications: Application[] = [
  { applicationId: 1, companyId: 1, role: 'Software Developer Intern', type: 'Internship', appliedDate: '2026-10-15', status: 'Applied', followUpDate: '2026-10-20' },
  { applicationId: 2, companyId: 2, role: 'Graduate Engineer Trainee', type: 'Job', appliedDate: '2026-10-12', status: 'Interview Scheduled', followUpDate: '2026-10-25' },
  { applicationId: 3, companyId: 3, role: 'Java Developer Intern', type: 'Internship', appliedDate: '2026-10-10', status: 'Shortlisted', followUpDate: '2026-10-18' },
  { applicationId: 4, companyId: 4, role: 'Associate Engineer', type: 'Job', appliedDate: '2026-10-08', status: 'Rejected', followUpDate: null },
  { applicationId: 5, companyId: 5, role: 'Data Analyst', type: 'Job', appliedDate: '2026-10-05', status: 'Applied', followUpDate: '2026-10-15' },
  { applicationId: 6, companyId: 6, role: 'Web Development Intern', type: 'Internship', appliedDate: '2026-10-01', status: 'Interview Scheduled', followUpDate: '2026-10-22' },
  { applicationId: 7, companyId: 1, role: 'Product Intern', type: 'Internship', appliedDate: '2026-09-28', status: 'Offered', followUpDate: '2026-10-10' },
  { applicationId: 8, companyId: 2, role: 'Backend Developer', type: 'Job', appliedDate: '2026-09-25', status: 'Offered', followUpDate: null }
];

let interviews: Interview[] = [
  { interviewId: 1, applicationId: 1, interviewDate: '2026-10-22', round: 'Technical', result: 'Pending' },
  { interviewId: 2, applicationId: 2, interviewDate: '2026-10-24', round: 'HR', result: 'Pending' },
  { interviewId: 3, applicationId: 3, interviewDate: '2026-10-18', round: 'Aptitude', result: 'Cleared' },
  { interviewId: 4, applicationId: 6, interviewDate: '2026-10-28', round: 'Technical', result: 'Pending' },
  { interviewId: 5, applicationId: 5, interviewDate: '2026-10-15', round: 'HR', result: 'Rejected' }
];

let offers: Offer[] = [
  { offerId: 1, applicationId: 7, packageLpa: 12.00, deadline: '2026-10-30', offerStatus: 'Accepted' },
  { offerId: 2, applicationId: 8, packageLpa: 8.50, deadline: '2026-10-28', offerStatus: 'Pending' }
];

let nextCompanyId = 7;
let nextApplicationId = 9;
let nextInterviewId = 6;
let nextOfferId = 3;

// =============================================================================
// HTML ESCAPING & RENDER HELPERS
// =============================================================================
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBadgeClassForStatus(status: string): string {
  switch ((status || '').trim()) {
    case 'Shortlisted': return 'badge-shortlisted';
    case 'Interview Scheduled': return 'badge-interview';
    case 'Offered': return 'badge-offered';
    case 'Rejected': return 'badge-rejected';
    case 'Applied':
    default: return 'badge-applied';
  }
}

function getCompanyName(companyId: number): string {
  const c = companies.find((item) => item.companyId === companyId);
  return c ? c.name : 'Unknown Company';
}

function getRoleAndCompany(applicationId: number): string {
  const a = applications.find((item) => item.applicationId === applicationId);
  if (!a) return 'Application #' + applicationId;
  return `${a.role} (${getCompanyName(a.companyId)})`;
}

function renderCompaniesTable(list: Company[]): string {
  if (list.length === 0) {
    return "<tr><td colspan='5' style='text-align:center;padding:24px;color:#66758A;'>No companies recorded yet. Add your first company using the form on the left.</td></tr>";
  }
  let sb = '';
  let idx = 1;
  for (const c of list) {
    sb += `<tr>
      <td>${idx++}</td>
      <td class='primary-cell-text'>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.location)}</td>
      <td>${escapeHtml(c.contactEmail)}</td>
      <td style='text-align: right;'>
        <div class='actions-cell' style='justify-content: flex-end;'>
          <a href='#modal-update-company' class='btn-icon-only' title='Edit Company' style='text-decoration:none;display:inline-flex;align-items:center;justify-content:center;color:#2563A6;background:#F0F6FD;'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'></path><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'></path></svg>
          </a>
          <form action='/delete-company' method='POST' style='display:inline;'>
            <input type='hidden' name='companyId' value='${c.companyId}'>
            <button type='submit' class='btn-icon-only btn-delete' title='Delete Company'>
              <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='3 6 5 6 21 6'></polyline><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path></svg>
            </button>
          </form>
        </div>
      </td>
    </tr>`;
  }
  return sb;
}

function renderCompanyOptions(list: Company[]): string {
  let sb = "<option value=''>Select Company</option>";
  for (const c of list) {
    sb += `<option value='${c.companyId}'>${escapeHtml(c.name)}</option>`;
  }
  return sb;
}

function renderApplicationsTable(list: Application[]): string {
  if (list.length === 0) {
    return "<tr><td colspan='8' style='text-align:center;padding:24px;color:#66758A;'>No applications found matching criteria.</td></tr>";
  }
  let sb = '';
  let idx = 1;
  for (const a of list) {
    const followUpText = a.followUpDate ? a.followUpDate : '-';
    sb += `<tr>
      <td>${idx++}</td>
      <td class='primary-cell-text'>${escapeHtml(a.role)}</td>
      <td>${escapeHtml(getCompanyName(a.companyId))}</td>
      <td><span class='badge-type-pill'>${escapeHtml(a.type)}</span></td>
      <td>${a.appliedDate || '-'}</td>
      <td>
        <form action='/update-application-status' method='POST' class='table-status-form'>
          <input type='hidden' name='applicationId' value='${a.applicationId}'>
          <select name='status' class='select-table-status'>
            <option value='Applied'${a.status === 'Applied' ? ' selected' : ''}>Applied</option>
            <option value='Shortlisted'${a.status === 'Shortlisted' ? ' selected' : ''}>Shortlisted</option>
            <option value='Interview Scheduled'${a.status === 'Interview Scheduled' ? ' selected' : ''}>Interview Scheduled</option>
            <option value='Offered'${a.status === 'Offered' ? ' selected' : ''}>Offered</option>
            <option value='Rejected'${a.status === 'Rejected' ? ' selected' : ''}>Rejected</option>
          </select>
          <button type='submit' class='btn-table-action' title='Update Status'>Update</button>
        </form>
      </td>
      <td>${followUpText}</td>
      <td style='text-align: right;'>
        <div class='actions-cell' style='justify-content: flex-end;'>
          <a href='#modal-update-app' class='btn-icon-only' title='Edit Application' style='text-decoration:none;display:inline-flex;align-items:center;justify-content:center;color:#2563A6;background:#F0F6FD;'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'></path><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'></path></svg>
          </a>
          <form action='/delete-application' method='POST' style='display:inline;'>
            <input type='hidden' name='applicationId' value='${a.applicationId}'>
            <button type='submit' class='btn-icon-only btn-delete' title='Delete Application'>
              <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='3 6 5 6 21 6'></polyline><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path></svg>
            </button>
          </form>
        </div>
      </td>
    </tr>`;
  }
  return sb;
}

function renderApplicationOptions(list: Application[]): string {
  let sb = "<option value=''>Select Application</option>";
  for (const a of list) {
    sb += `<option value='${a.applicationId}'>${escapeHtml(a.role)} &mdash; ${escapeHtml(getCompanyName(a.companyId))}</option>`;
  }
  return sb;
}

function renderInterviewsTable(list: Interview[]): string {
  if (list.length === 0) {
    return "<tr><td colspan='6' style='text-align:center;padding:24px;color:#66758A;'>No interviews scheduled yet.</td></tr>";
  }
  let sb = '';
  let idx = 1;
  for (const iv of list) {
    sb += `<tr>
      <td>${idx++}</td>
      <td><div class='primary-cell-text'>${escapeHtml(getRoleAndCompany(iv.applicationId))}</div></td>
      <td>${iv.interviewDate || '-'}</td>
      <td>${escapeHtml(iv.round)}</td>
      <td>
        <form action='/update-interview-result' method='POST' class='table-status-form'>
          <input type='hidden' name='interviewId' value='${iv.interviewId}'>
          <select name='result' class='select-table-status'>
            <option value='Pending'${iv.result === 'Pending' ? ' selected' : ''}>Pending</option>
            <option value='Cleared'${iv.result === 'Cleared' ? ' selected' : ''}>Cleared</option>
            <option value='Rejected'${iv.result === 'Rejected' ? ' selected' : ''}>Rejected</option>
          </select>
          <button type='submit' class='btn-table-action' title='Update Result'>Update</button>
        </form>
      </td>
      <td style='text-align: right;'>
        <div class='actions-cell' style='justify-content: flex-end;'>
          <form action='/delete-interview' method='POST' style='display:inline;'>
            <input type='hidden' name='interviewId' value='${iv.interviewId}'>
            <button type='submit' class='btn-icon-only btn-delete' title='Delete Interview'>
              <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='3 6 5 6 21 6'></polyline><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path></svg>
            </button>
          </form>
        </div>
      </td>
    </tr>`;
  }
  return sb;
}

function renderFollowUpsRows(list: Application[], isOverdue: boolean): string {
  if (list.length === 0) {
    return "<tr><td colspan='3' style='text-align:center;padding:16px;color:#66758A;'>None found</td></tr>";
  }
  let sb = '';
  let idx = 1;
  for (const a of list) {
    const badge = isOverdue ? 'badge-rejected' : 'badge-applied';
    sb += `<tr>
      <td>${idx++}</td>
      <td><div class='primary-cell-text'>${escapeHtml(a.role)}</div><div class='secondary-cell-text'>${escapeHtml(getCompanyName(a.companyId))}</div></td>
      <td><span class='badge ${badge}'>${a.followUpDate || '-'}</span></td>
    </tr>`;
  }
  return sb;
}

function renderUpcomingInterviews(list: Interview[]): string {
  if (list.length === 0) {
    return "<tr><td colspan='3' style='text-align:center;padding:16px;color:#66758A;'>No upcoming interviews</td></tr>";
  }
  let sb = '';
  const upcoming = list.slice(0, 4);
  for (const iv of upcoming) {
    sb += `<tr>
      <td><div class='primary-cell-text'>${escapeHtml(getRoleAndCompany(iv.applicationId))}</div></td>
      <td>${iv.interviewDate || '-'}</td>
      <td><span class='badge badge-applied'>${escapeHtml(iv.round)}</span></td>
    </tr>`;
  }
  return sb;
}

function renderRecentApplications(list: Application[]): string {
  if (list.length === 0) {
    return "<tr><td colspan='5' style='text-align:center;padding:16px;color:#66758A;'>No recent applications</td></tr>";
  }
  let sb = '';
  const recent = list.slice(0, 4);
  for (const a of recent) {
    sb += `<tr>
      <td class='primary-cell-text'>${escapeHtml(a.role)}</td>
      <td>${escapeHtml(getCompanyName(a.companyId))}</td>
      <td><span class='badge-type-pill'>${escapeHtml(a.type)}</span></td>
      <td>${a.appliedDate || '-'}</td>
      <td><span class='badge ${getBadgeClassForStatus(a.status)}'>${escapeHtml(a.status)}</span></td>
    </tr>`;
  }
  return sb;
}

function renderOffersTable(list: Offer[]): string {
  if (list.length === 0) {
    return "<tr><td colspan='6' style='text-align:center;padding:24px;color:#66758A;'>No offers recorded yet.</td></tr>";
  }
  let sb = '';
  let idx = 1;
  for (const o of list) {
    sb += `<tr>
      <td>${idx++}</td>
      <td><div class='primary-cell-text'>${escapeHtml(getRoleAndCompany(o.applicationId))}</div></td>
      <td><strong>${o.packageLpa.toFixed(2)}</strong></td>
      <td>${o.deadline || '-'}</td>
      <td>
        <form action='/update-offer-status' method='POST' class='table-status-form'>
          <input type='hidden' name='offerId' value='${o.offerId}'>
          <select name='offerStatus' class='select-table-status'>
            <option value='Pending'${o.offerStatus === 'Pending' ? ' selected' : ''}>Pending</option>
            <option value='Accepted'${o.offerStatus === 'Accepted' ? ' selected' : ''}>Accepted</option>
            <option value='Rejected'${o.offerStatus === 'Rejected' ? ' selected' : ''}>Rejected</option>
          </select>
          <button type='submit' class='btn-table-action' title='Update Decision'>Update</button>
        </form>
      </td>
      <td style='text-align: right;'>
        <div class='actions-cell' style='justify-content: flex-end;'>
          <form action='/delete-offer' method='POST' style='display:inline;'>
            <input type='hidden' name='offerId' value='${o.offerId}'>
            <button type='submit' class='btn-icon-only btn-delete' title='Delete Offer'>
              <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='3 6 5 6 21 6'></polyline><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path></svg>
            </button>
          </form>
        </div>
      </td>
    </tr>`;
  }
  return sb;
}

function renderHighestPackageBanner(list: Offer[]): string {
  if (list.length === 0) {
    return "<div class='highest-package-card' style='background:#F8FAFC;border-color:#E2E8F0;'>" +
           "<div class='highest-package-content'><div>" +
           "<div class='highest-package-label' style='color:#64748B;'>Highest Package</div>" +
           "<div class='highest-package-amount' style='color:#64748B;'>No offers yet</div>" +
           "</div></div></div>";
  }
  const best = [...list].sort((a, b) => b.packageLpa - a.packageLpa)[0];
  return `<div class='highest-package-card'>
    <div class='highest-package-content'>
      <div class='trophy-badge'>
        <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='8' r='6'></circle><path d='M15.477 12.89L17 22l-5-3-5 3 1.523-9.11'></path></svg>
      </div>
      <div>
        <div class='highest-package-label'>Highest Package</div>
        <div class='highest-package-amount'>&#8377; ${best.packageLpa.toFixed(2)} LPA</div>
        <div class='highest-package-company'>${escapeHtml(getRoleAndCompany(best.applicationId))}</div>
      </div>
    </div>
    <div style='color: #16A34A;'>
      <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'><polyline points='9 18 15 12 9 6'></polyline></svg>
    </div>
  </div>`;
}

function renderStatusBars(apps: Application[]): string {
  const total = apps.length;
  if (total === 0) return "<p style='color:#66758A;'>No application data yet.</p>";
  const statuses = ['Applied', 'Shortlisted', 'Interview Scheduled', 'Offered', 'Rejected'];
  const colors = ['bar-blue', 'bar-purple', 'bar-amber', 'bar-mint', 'bar-pink'];

  let sb = '';
  for (let i = 0; i < statuses.length; i++) {
    const st = statuses[i];
    const count = apps.filter((a) => a.status.toLowerCase() === st.toLowerCase()).length;
    const pct = Math.round((count * 100) / total);
    sb += `<div class='report-stat-row'>
      <div class='report-stat-name'><span class='badge ${getBadgeClassForStatus(st)}'>${st}</span></div>
      <div class='bar-track'><div class='bar-fill ${colors[i]}' style='width: ${pct}%;'></div></div>
      <div class='report-count'>${count}</div>
    </div>`;
  }
  return sb;
}

function renderCompanyBars(apps: Application[]): string {
  const total = apps.length;
  if (total === 0) return "<p style='color:#66758A;'>No company applications yet.</p>";

  const companyCounts: { [name: string]: number } = {};
  for (const a of apps) {
    const cName = getCompanyName(a.companyId);
    companyCounts[cName] = (companyCounts[cName] || 0) + 1;
  }

  let sb = '';
  for (const [cName, count] of Object.entries(companyCounts)) {
    const pct = Math.round((count * 100) / total);
    sb += `<div class='report-stat-row'>
      <div class='report-stat-name' style='width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'>${escapeHtml(cName)}</div>
      <div class='bar-track'><div class='bar-fill bar-blue' style='width: ${pct}%;'></div></div>
      <div class='report-count'>${count}</div>
    </div>`;
  }
  return sb;
}

// =============================================================================
// AUTHENTICATION PAGES (SIGN IN & REGISTER USER HTML BUILDERS)
// =============================================================================
function renderSignInPage(error?: string, registered?: boolean): string {
  let alertHtml = '';
  if (registered) {
    alertHtml += `<div class='alert-banner alert-success'>
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'></path><polyline points='22 4 12 14.01 9 11.01'></polyline></svg>
      <span>Account registered successfully! Please sign in below.</span>
    </div>`;
  }
  if (error) {
    alertHtml += `<div class='alert-banner alert-error'>
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='10'></circle><line x1='12' y1='8' x2='12' y2='12'></line><line x1='12' y1='16' x2='12.01' y2='16'></line></svg>
      <span>${escapeHtml(error)}</span>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Sign In — CareerTrack</title>
  <link rel='icon' type='image/png' href='/mascot.png'>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary-navy: #142D4E;
      --primary-blue: #1765D1;
      --btn-blue: #1765D1;
      --btn-blue-hover: #1352AA;
      --page-bg: #F3F6FA;
      --card-white: #FFFFFF;
      --border-gray: #DCE4EE;
      --text-dark: #1E293B;
      --text-muted: #64748B;
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 18px;
      --font-stack: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    body {
      font-family: var(--font-stack);
      background-color: var(--page-bg);
      color: var(--text-dark);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .auth-split-card {
      width: 100%;
      max-width: 1060px;
      background: var(--card-white);
      border: 1px solid var(--border-gray);
      border-radius: var(--radius-lg);
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      display: flex;
      overflow: hidden;
    }
    .auth-hero-pane {
      flex: 1.15;
      background: #0B2342;
      position: relative;
      overflow: hidden;
      display: flex;
      min-height: 580px;
    }
    .auth-hero-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: left center;
      display: block;
    }
    .auth-form-pane {
      flex: 1;
      padding: 38px 42px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: #FFFFFF;
      position: relative;
    }
    .auth-top-quote {
      text-align: right;
      font-size: 11.5px;
      color: var(--text-muted);
      font-style: italic;
      margin-bottom: 20px;
      line-height: 1.35;
    }
    .auth-top-quote-bar {
      width: 24px;
      height: 2px;
      background: var(--primary-blue);
      margin-left: auto;
      margin-top: 4px;
      border-radius: 2px;
    }
    .auth-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--primary-navy);
      letter-spacing: -0.4px;
      margin-bottom: 6px;
    }
    .auth-subtitle {
      font-size: 13.5px;
      color: var(--text-muted);
      margin-bottom: 22px;
      line-height: 1.45;
    }
    .auth-toggle-group {
      display: flex;
      background: #F1F5F9;
      padding: 4px;
      border-radius: 10px;
      margin-bottom: 22px;
      border: 1px solid #E2E8F0;
    }
    .auth-toggle-btn {
      flex: 1;
      text-align: center;
      padding: 8px 14px;
      font-size: 13.5px;
      font-weight: 600;
      color: #64748B;
      text-decoration: none;
      border-radius: 7px;
      transition: all 0.15s ease;
    }
    .auth-toggle-btn.active {
      background: var(--primary-blue);
      color: #FFFFFF;
      box-shadow: 0 2px 6px rgba(23, 101, 209, 0.25);
    }
    .auth-toggle-btn:not(.active):hover {
      color: var(--text-dark);
      background: rgba(255, 255, 255, 0.6);
    }
    .alert-banner {
      padding: 11px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
      line-height: 1.4;
    }
    .alert-error {
      background-color: #FFF0F3;
      border: 1px solid #FECDD3;
      color: #BE123C;
    }
    .alert-success {
      background-color: #EAF8F0;
      border: 1px solid #BBF7D0;
      color: #15803D;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-dark);
    }
    .form-link-muted {
      font-size: 12px;
      color: var(--primary-blue);
      text-decoration: none;
    }
    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .field-icon {
      position: absolute;
      left: 13px;
      width: 17px;
      height: 17px;
      stroke: #94A3B8;
      pointer-events: none;
    }
    .form-input {
      width: 100%;
      padding: 10.5px 14px 10.5px 38px;
      border: 1px solid var(--border-gray);
      border-radius: var(--radius-sm);
      font-size: 13.5px;
      color: var(--text-dark);
      background-color: #FAFCFE;
      outline: none;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .form-input:focus {
      background-color: #FFFFFF;
      border-color: var(--primary-blue);
      box-shadow: 0 0 0 3px rgba(23, 101, 209, 0.14);
    }
    .remember-row {
      display: flex;
      align-items: center;
      margin-bottom: 18px;
      margin-top: 4px;
    }
    .remember-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-dark);
      cursor: pointer;
      user-select: none;
    }
    .remember-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--primary-blue);
      cursor: pointer;
    }
    .btn-submit {
      width: 100%;
      padding: 11.5px;
      background-color: var(--btn-blue);
      color: #FFFFFF;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease, transform 0.05s ease;
      font-family: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-submit:hover {
      background-color: var(--btn-blue-hover);
    }
    .btn-submit:active {
      transform: scale(0.99);
    }
    .auth-divider {
      display: flex;
      align-items: center;
      margin: 20px 0;
      color: #94A3B8;
      font-size: 12px;
    }
    .auth-divider::before, .auth-divider::after {
      content: "";
      flex: 1;
      height: 1px;
      background: #E2E8F0;
    }
    .auth-divider span {
      padding: 0 10px;
    }
    .btn-create-account {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10.5px;
      background: #FFFFFF;
      color: var(--primary-blue);
      border: 1px solid #BFDBFE;
      border-radius: var(--radius-sm);
      font-size: 13.5px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-create-account:hover {
      background: #F0F6FD;
      border-color: #93C5FD;
    }
    .demo-box {
      background: #F0F6FD;
      border: 1px solid #BFDBFE;
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      margin-bottom: 18px;
    }
    .demo-box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .demo-box-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 700;
      color: #1E40AF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .demo-icon {
      width: 14px;
      height: 14px;
      stroke: #2563EB;
    }
    .demo-file-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: #FFFFFF;
      border: 1px solid #93C5FD;
      border-radius: 4px;
      color: #1D4ED8;
      font-size: 11px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .demo-file-chip:hover {
      background: #DBEAFE;
      color: #1E40AF;
    }
    .demo-box-creds {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      margin-bottom: 10px;
      color: #334155;
    }
    .demo-cred-row {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .demo-cred-lbl {
      color: #64748B;
      font-size: 11px;
    }
    .demo-cred-val {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #FFFFFF;
      padding: 1.5px 6px;
      border-radius: 4px;
      border: 1px solid #CBD5E1;
      font-weight: 600;
      color: #0F172A;
      font-size: 11.5px;
    }
    .demo-actions {
      display: flex;
      gap: 8px;
    }
    .btn-demo-fill {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6.5px 10px;
      background: #FFFFFF;
      color: #1D4ED8;
      border: 1px solid #93C5FD;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .btn-demo-fill:hover {
      background: #EFF6FF;
      border-color: #60A5FA;
    }
    .btn-demo-quick-login {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6.5px 10px;
      background: #1765D1;
      color: #FFFFFF;
      border: 1px solid #1765D1;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .btn-demo-quick-login:hover {
      background: #1352AA;
    }
    @media (max-width: 900px) {
      .auth-split-card {
        flex-direction: column;
        max-width: 480px;
      }
      .auth-hero-pane {
        min-height: 220px;
        max-height: 250px;
      }
      .auth-hero-img {
        object-position: 22% 40%;
      }
      .auth-form-pane {
        padding: 28px 24px;
      }
    }
  </style>
</head>
<body>
  <div class="auth-split-card">
    <!-- Visual Hero Column with User Image -->
    <div class="auth-hero-pane">
      <img src="/assets/aistudio/image_103eb014.png" alt="CareerTrack — Track Your Applications. Build Your Future." class="auth-hero-img">
    </div>

    <!-- Interactive Authentication Form Column -->
    <div class="auth-form-pane">
      <div class="auth-top-quote">
        <div>Small steps today,</div>
        <div>big opportunities tomorrow.</div>
        <div class="auth-top-quote-bar"></div>
      </div>

      <h2 class="auth-title">Welcome to CareerTrack</h2>
      <p class="auth-subtitle">Sign in to your account or create a new one to start tracking your career journey.</p>

      <!-- Toggle Tabs -->
      <div class="auth-toggle-group">
        <a href="/signin" class="auth-toggle-btn active">Sign In</a>
        <a href="/signup" class="auth-toggle-btn">Register</a>
      </div>

      <!-- Demo Account Card & Quick Auto-Fill (demo-file) -->
      <div class="demo-box">
        <div class="demo-box-header">
          <div class="demo-box-title">
            <svg class="demo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <span>Demo Account Credentials</span>
          </div>
          <a href="/demo-file" target="_blank" class="demo-file-chip" title="View demo credentials file (demo-file.json)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            <span>demo-file</span>
          </a>
        </div>
        <div class="demo-box-creds">
          <div class="demo-cred-row">
            <span class="demo-cred-lbl">Email:</span>
            <span class="demo-cred-val">ramya@college.edu</span>
          </div>
          <div class="demo-cred-row">
            <span class="demo-cred-lbl">Password:</span>
            <span class="demo-cred-val">password123</span>
          </div>
        </div>
        <div class="demo-actions">
          <button type="button" class="btn-demo-fill" onclick="autoFillDemo()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Auto-Fill Demo</span>
          </button>
          <button type="button" class="btn-demo-quick-login" onclick="quickDemoSignIn()">
            <span>Quick 1-Click Sign In</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
      </div>

      ${alertHtml}

      <form method="POST" action="/signin" autocomplete="on">
        <div class="form-group">
          <label class="form-label" for="email">Email Address</label>
          <div class="input-with-icon" style="margin-top: 6px;">
            <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <input type="email" id="email" name="email" class="form-input" placeholder="Enter your email" required autofocus>
          </div>
        </div>

        <div class="form-group">
          <div class="form-label-row">
            <label class="form-label" for="password">Password</label>
            <span class="form-link-muted" title="Contact administrator if reset is needed">Forgot password?</span>
          </div>
          <div class="input-with-icon">
            <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <input type="password" id="password" name="password" class="form-input" placeholder="Enter your password" required>
          </div>
        </div>

        <div class="remember-row">
          <label class="remember-label">
            <input type="checkbox" name="rememberMe" checked>
            <span>Remember me</span>
          </label>
        </div>

        <button type="submit" class="btn-submit">
          <span>Sign In</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      </form>

      <div class="auth-divider"><span>or</span></div>

      <a href="/signup" class="btn-create-account">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7.5" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
        <span>Create New Account</span>
      </a>
    </div>
  </div>

  <script>
    function autoFillDemo() {
      var email = document.getElementById('email');
      var pwd = document.getElementById('password');
      if (email) email.value = 'ramya@college.edu';
      if (pwd) pwd.value = 'password123';
      if (email) email.focus();
    }
    function quickDemoSignIn() {
      autoFillDemo();
      var form = document.querySelector('form');
      if (form) form.submit();
    }
  </script>
</body>
</html>`;
}

function renderSignUpPage(error?: string): string {
  let alertHtml = '';
  if (error) {
    alertHtml += `<div class='alert-banner alert-error'>
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='10'></circle><line x1='12' y1='8' x2='12' y2='12'></line><line x1='12' y1='16' x2='12.01' y2='16'></line></svg>
      <span>${escapeHtml(error)}</span>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Register User — CareerTrack</title>
  <link rel='icon' type='image/png' href='/mascot.png'>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary-navy: #142D4E;
      --primary-blue: #1765D1;
      --btn-blue: #1765D1;
      --btn-blue-hover: #1352AA;
      --page-bg: #F3F6FA;
      --card-white: #FFFFFF;
      --border-gray: #DCE4EE;
      --text-dark: #1E293B;
      --text-muted: #64748B;
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 18px;
      --font-stack: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    body {
      font-family: var(--font-stack);
      background-color: var(--page-bg);
      color: var(--text-dark);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .auth-split-card {
      width: 100%;
      max-width: 1060px;
      background: var(--card-white);
      border: 1px solid var(--border-gray);
      border-radius: var(--radius-lg);
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      display: flex;
      overflow: hidden;
    }
    .auth-hero-pane {
      flex: 1.15;
      background: #0B2342;
      position: relative;
      overflow: hidden;
      display: flex;
      min-height: 620px;
    }
    .auth-hero-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: left center;
      display: block;
    }
    .auth-form-pane {
      flex: 1;
      padding: 36px 42px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: #FFFFFF;
      position: relative;
    }
    .auth-top-quote {
      text-align: right;
      font-size: 11.5px;
      color: var(--text-muted);
      font-style: italic;
      margin-bottom: 18px;
      line-height: 1.35;
    }
    .auth-top-quote-bar {
      width: 24px;
      height: 2px;
      background: var(--primary-blue);
      margin-left: auto;
      margin-top: 4px;
      border-radius: 2px;
    }
    .auth-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--primary-navy);
      letter-spacing: -0.4px;
      margin-bottom: 6px;
    }
    .auth-subtitle {
      font-size: 13.5px;
      color: var(--text-muted);
      margin-bottom: 20px;
      line-height: 1.45;
    }
    .auth-toggle-group {
      display: flex;
      background: #F1F5F9;
      padding: 4px;
      border-radius: 10px;
      margin-bottom: 20px;
      border: 1px solid #E2E8F0;
    }
    .auth-toggle-btn {
      flex: 1;
      text-align: center;
      padding: 8px 14px;
      font-size: 13.5px;
      font-weight: 600;
      color: #64748B;
      text-decoration: none;
      border-radius: 7px;
      transition: all 0.15s ease;
    }
    .auth-toggle-btn.active {
      background: var(--primary-blue);
      color: #FFFFFF;
      box-shadow: 0 2px 6px rgba(23, 101, 209, 0.25);
    }
    .auth-toggle-btn:not(.active):hover {
      color: var(--text-dark);
      background: rgba(255, 255, 255, 0.6);
    }
    .alert-banner {
      padding: 11px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      line-height: 1.4;
    }
    .alert-error {
      background-color: #FFF0F3;
      border: 1px solid #FECDD3;
      color: #BE123C;
    }
    .form-group {
      margin-bottom: 13px;
    }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-dark);
      margin-bottom: 5px;
    }
    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .field-icon {
      position: absolute;
      left: 13px;
      width: 17px;
      height: 17px;
      stroke: #94A3B8;
      pointer-events: none;
    }
    .form-input {
      width: 100%;
      padding: 10px 14px 10px 38px;
      border: 1px solid var(--border-gray);
      border-radius: var(--radius-sm);
      font-size: 13.5px;
      color: var(--text-dark);
      background-color: #FAFCFE;
      outline: none;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .form-input:focus {
      background-color: #FFFFFF;
      border-color: var(--primary-blue);
      box-shadow: 0 0 0 3px rgba(23, 101, 209, 0.14);
    }
    .btn-submit {
      width: 100%;
      padding: 11.5px;
      background-color: var(--btn-blue);
      color: #FFFFFF;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease, transform 0.05s ease;
      font-family: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 6px;
    }
    .btn-submit:hover {
      background-color: var(--btn-blue-hover);
    }
    .btn-submit:active {
      transform: scale(0.99);
    }
    .auth-divider {
      display: flex;
      align-items: center;
      margin: 18px 0;
      color: #94A3B8;
      font-size: 12px;
    }
    .auth-divider::before, .auth-divider::after {
      content: "";
      flex: 1;
      height: 1px;
      background: #E2E8F0;
    }
    .auth-divider span {
      padding: 0 10px;
    }
    .btn-create-account {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10.5px;
      background: #FFFFFF;
      color: var(--primary-blue);
      border: 1px solid #BFDBFE;
      border-radius: var(--radius-sm);
      font-size: 13.5px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-create-account:hover {
      background: #F0F6FD;
      border-color: #93C5FD;
    }
    .demo-box {
      background: #F0F6FD;
      border: 1px solid #BFDBFE;
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      margin-bottom: 18px;
    }
    .demo-box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .demo-box-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 700;
      color: #1E40AF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .demo-icon {
      width: 14px;
      height: 14px;
      stroke: #2563EB;
    }
    .demo-file-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: #FFFFFF;
      border: 1px solid #93C5FD;
      border-radius: 4px;
      color: #1D4ED8;
      font-size: 11px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .demo-file-chip:hover {
      background: #DBEAFE;
      color: #1E40AF;
    }
    .demo-actions {
      display: flex;
      gap: 8px;
    }
    .btn-demo-quick-login {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6.5px 10px;
      background: #1765D1;
      color: #FFFFFF;
      border: 1px solid #1765D1;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .btn-demo-quick-login:hover {
      background: #1352AA;
    }
    @media (max-width: 900px) {
      .auth-split-card {
        flex-direction: column;
        max-width: 480px;
      }
      .auth-hero-pane {
        min-height: 220px;
        max-height: 250px;
      }
      .auth-hero-img {
        object-position: 22% 40%;
      }
      .auth-form-pane {
        padding: 28px 24px;
      }
    }
  </style>
</head>
<body>
  <div class="auth-split-card">
    <!-- Visual Hero Column with User Image -->
    <div class="auth-hero-pane">
      <img src="/assets/aistudio/image_103eb014.png" alt="CareerTrack — Track Your Applications. Build Your Future." class="auth-hero-img">
    </div>

    <!-- Interactive Registration Form Column -->
    <div class="auth-form-pane">
      <div class="auth-top-quote">
        <div>Small steps today,</div>
        <div>big opportunities tomorrow.</div>
        <div class="auth-top-quote-bar"></div>
      </div>

      <h2 class="auth-title">Register User</h2>
      <p class="auth-subtitle">Create your personal account to organize and track career applications.</p>

      <!-- Toggle Tabs -->
      <div class="auth-toggle-group">
        <a href="/signin" class="auth-toggle-btn">Sign In</a>
        <a href="/signup" class="auth-toggle-btn active">Register</a>
      </div>

      <!-- Demo Info Notice (demo-file) -->
      <div class="demo-box" style="margin-bottom: 16px;">
        <div class="demo-box-header">
          <div class="demo-box-title">
            <svg class="demo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <span>Demo Account Ready</span>
          </div>
          <a href="/demo-file" target="_blank" class="demo-file-chip" title="View demo credentials file (demo-file.json)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            <span>demo-file</span>
          </a>
        </div>
        <p style="font-size: 12px; color: #475569; margin-bottom: 8px; line-height: 1.45;">
          A test account (<strong>ramya@college.edu</strong> / <strong>password123</strong>) is already seeded. You can sign in directly or register a new custom profile below.
        </p>
        <div class="demo-actions">
          <a href="/signin" class="btn-demo-quick-login">
            <span>Use Demo Account on Sign In &rarr;</span>
          </a>
        </div>
      </div>

      ${alertHtml}

      <form method="POST" action="/signup" autocomplete="on">
        <div class="form-group">
          <label class="form-label" for="fullName">Full Name</label>
          <div class="input-with-icon">
            <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <input type="text" id="fullName" name="fullName" class="form-input" placeholder="e.g. Ramya Ranjith" required autofocus>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="email">Email Address</label>
          <div class="input-with-icon">
            <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <input type="email" id="email" name="email" class="form-input" placeholder="ramya@college.edu" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <div class="input-with-icon">
            <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <input type="password" id="password" name="password" class="form-input" placeholder="Minimum 6 characters" minlength="6" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="confirmPassword">Confirm Password</label>
          <div class="input-with-icon">
            <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <input type="password" id="confirmPassword" name="confirmPassword" class="form-input" placeholder="Re-enter your password" minlength="6" required>
          </div>
        </div>

        <button type="submit" class="btn-submit">
          <span>Register User</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      </form>

      <div class="auth-divider"><span>or</span></div>

      <a href="/signin" class="btn-create-account">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
        <span>Already have an account? Sign In</span>
      </a>
    </div>
  </div>
</body>
</html>`;
}

// =============================================================================
// EXPRESS APP INITIALIZATION
// =============================================================================
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.urlencoded({ extended: true }));

// Helper to set session cookie
function setSessionCookie(res: Response, req: Request, token: string, remove = false) {
  const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.secure;
  let cookieVal = `${SESSION_COOKIE_NAME}=${remove ? '' : token}; Path=/; HttpOnly; SameSite=Lax`;
  if (remove) {
    cookieVal += '; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } else {
    cookieVal += '; Max-Age=86400';
  }
  if (isHttps) {
    cookieVal += '; Secure';
  }
  res.setHeader('Set-Cookie', cookieVal);
}

// Authentication Guard Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = getSession(req);
  if (!session) {
    return res.redirect(303, '/signin');
  }
  next();
}

// Serve mascot.png (Public)
app.get('/mascot.png', (req: Request, res: Response) => {
  const file = path.resolve(FRONTEND_DIR, 'mascot.png');
  const fallback = path.resolve(FRONTEND_DIR, 'mascot.png');
  if (fs.existsSync(file)) {
    res.type('image/png').sendFile(file);
  } else if (fs.existsSync(fallback)) {
    res.type('image/png').sendFile(fallback);
  } else {
    res.status(404).end();
  }
});

// Serve assets & public folders (Public)
app.use('/assets', express.static(path.resolve(FRONTEND_DIR, 'public/assets')));
app.use('/public', express.static(path.resolve(FRONTEND_DIR, 'public')));

// Explicit route for sign-in / registration dashboard image asset
app.get('/assets/aistudio/image_103eb014.png', (req: Request, res: Response) => {
  const p1 = path.resolve(FRONTEND_DIR, 'public/assets/aistudio/image_103eb014.png');
  const p2 = path.resolve(FRONTEND_DIR, 'assets/aistudio/image_103eb014.png');
  const p3 = path.resolve(FRONTEND_DIR, 'assets/aistudio/image_103eb014.png');
  if (fs.existsSync(p1)) return res.type('image/png').sendFile(p1);
  if (fs.existsSync(p2)) return res.type('image/png').sendFile(p2);
  if (fs.existsSync(p3)) return res.type('image/png').sendFile(p3);
  res.status(404).end();
});

// Demo file endpoint for sign-in (/demo-file, /demo-file.json, /demo-account.json)
app.get(['/demo-file', '/demo-file.json', '/demo-account.json'], (req: Request, res: Response) => {
  const p1 = path.resolve(FRONTEND_DIR, 'public/demo-file.json');
  const p2 = path.resolve(__dirname, 'demo-file.json');
  if (fs.existsSync(p1)) return res.type('application/json; charset=UTF-8').sendFile(p1);
  if (fs.existsSync(p2)) return res.type('application/json; charset=UTF-8').sendFile(p2);
  res.json({
    system: "CareerTrack Application Tracker",
    demoUser: {
      fullName: "Ramya Ranjith",
      email: "ramya@college.edu",
      password: "password123"
    }
  });
});

// =============================================================================
// AUTHENTICATION ROUTES (GET /signin, POST /signin, GET /signup, POST /signup, POST /logout)
// =============================================================================

// GET /signin
app.get('/signin', (req: Request, res: Response) => {
  if (getSession(req)) {
    return res.redirect(303, '/');
  }
  const error = req.query.error ? String(req.query.error) : undefined;
  const registered = req.query.registered === 'true';
  res.type('text/html; charset=UTF-8').send(renderSignInPage(error, registered));
});

// POST /signin
app.post('/signin', (req: Request, res: Response) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.redirect(303, '/signin?error=' + encodeURIComponent('Please enter both email and password.'));
  }

  const user = users.find((u) => u.email === email);
  if (user && verifyPassword(password, user.passwordHash)) {
    const token = generateSessionToken();
    activeSessions.set(token, {
      token,
      userId: user.userId,
      fullName: user.fullName,
      normalizedName: user.normalizedName,
      email: user.email,
      createdAt: Date.now()
    });

    setSessionCookie(res, req, token);
    return res.redirect(303, '/');
  }

  // Generic invalid credentials message
  return res.redirect(303, '/signin?error=' + encodeURIComponent('Invalid email or password. Please try again.'));
});

// GET /signup
app.get('/signup', (req: Request, res: Response) => {
  if (getSession(req)) {
    return res.redirect(303, '/');
  }
  const error = req.query.error ? String(req.query.error) : undefined;
  res.type('text/html; charset=UTF-8').send(renderSignUpPage(error));
});

// POST /signup (Register User)
app.post('/signup', (req: Request, res: Response) => {
  const rawFullName = String(req.body.fullName || '');
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  if (!rawFullName.trim()) {
    return res.redirect(303, '/signup?error=' + encodeURIComponent('Please enter your full name.'));
  }
  if (!email || !email.includes('@') || !email.includes('.')) {
    return res.redirect(303, '/signup?error=' + encodeURIComponent('Please enter a valid email address.'));
  }
  if (password.length < 6) {
    return res.redirect(303, '/signup?error=' + encodeURIComponent('Password must be at least 6 characters long.'));
  }
  if (password !== confirmPassword) {
    return res.redirect(303, '/signup?error=' + encodeURIComponent('Passwords do not match. Please try again.'));
  }

  // Account Name Normalization:
  // Trim leading/trailing spaces, collapse repeated internal spaces, and lowercase
  const normalizedName = normalizeAccountName(rawFullName);
  const trimmedFullName = rawFullName.trim().replace(/\s+/g, ' ');

  if (!normalizedName) {
    return res.redirect(303, '/signup?error=' + encodeURIComponent('Please enter a valid name.'));
  }

  // 1. Check whether normalized account name already exists (unique name enforcement)
  if (users.some((u) => u.normalizedName === normalizedName)) {
    return res.redirect(303, '/signup?error=' + encodeURIComponent('This account name is already taken. Please choose a different name.'));
  }

  // 2. Check whether email already exists (unique email enforcement)
  if (users.some((u) => u.email === email)) {
    return res.redirect(303, '/signup?error=' + encodeURIComponent('This email address is already registered. Please sign in instead.'));
  }

  // Securely hash password with PBKDF2
  const passwordHash = hashPassword(password);
  const newUser: User = {
    userId: nextUserId++,
    fullName: trimmedFullName,
    normalizedName,
    email,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  return res.redirect(303, '/signin?registered=true');
});

// POST /logout (and GET /logout fallback)
app.post('/logout', (req: Request, res: Response) => {
  const session = getSession(req);
  if (session) {
    activeSessions.delete(session.token);
  }
  setSessionCookie(res, req, '', true);
  res.redirect(303, '/signin');
});

app.get('/logout', (req: Request, res: Response) => {
  const session = getSession(req);
  if (session) {
    activeSessions.delete(session.token);
  }
  setSessionCookie(res, req, '', true);
  res.redirect(303, '/signin');
});

// =============================================================================
// GET / - Root Server Render Handler (Protected by requireAuth)
// =============================================================================
app.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const session = getSession(req)!;

    let htmlPath = path.resolve(FRONTEND_DIR, 'index.html');
    if (!fs.existsSync(htmlPath)) {
      htmlPath = path.resolve(FRONTEND_DIR, 'index.html');
    }
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // Query parameters
    const rawSearch = String(req.query.search || '').trim();
    const rawStatus = String(req.query.status || '').trim();
    const rawType = String(req.query.type || '').trim();

    const search = rawSearch.toLowerCase();
    const statusFilter = rawStatus.toLowerCase();
    const typeFilter = rawType.toLowerCase();

    // Filter applications if search or filter is provided
    let displayedApps = applications;
    if (search || statusFilter || typeFilter) {
      displayedApps = applications.filter((a) => {
        const cName = getCompanyName(a.companyId).toLowerCase();
        const role = a.role.toLowerCase();
        const matchesSearch = !search || role.includes(search) || cName.includes(search);
        const matchesStatus = !statusFilter || a.status.toLowerCase() === statusFilter;
        const matchesType = !typeFilter || a.type.toLowerCase() === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
      });
    }

    // Analytics calculations
    const totalApps = applications.length;
    const totalInterviews = interviews.length;
    const totalOffers = offers.length;
    const totalRejections = applications.filter((a) => a.status.toLowerCase() === 'rejected').length;
    const offerRate = totalApps > 0 ? ((totalOffers / totalApps) * 100).toFixed(1) : '0.0';
    const highestOffer = offers.length > 0 ? Math.max(...offers.map((o) => o.packageLpa)) : 0.0;

    // Follow-ups calculations
    const today = new Date().toISOString().split('T')[0];
    const overdueApps = applications
      .filter(
        (a) => a.followUpDate && a.followUpDate <= today && a.status.toLowerCase() !== 'rejected' && a.status.toLowerCase() !== 'offered'
      )
      .sort((a, b) => (a.followUpDate! > b.followUpDate! ? 1 : -1));
    const upcomingApps = applications
      .filter(
        (a) => a.followUpDate && a.followUpDate > today && a.status.toLowerCase() !== 'rejected' && a.status.toLowerCase() !== 'offered'
      )
      .sort((a, b) => (a.followUpDate! > b.followUpDate! ? 1 : -1));

    const overdueCount = overdueApps.length;
    const overdueBadge = overdueCount > 0
      ? `<span class='badge badge-danger-alert'>${overdueCount} overdue</span>`
      : `<span class='badge badge-applied'>All clear</span>`;

    const interviewSubtext = totalInterviews > 0 ? `${totalInterviews} scheduled` : 'No interviews yet';
    const offersSubtext = totalOffers > 0 ? `${totalOffers} recorded` : 'No offers yet';

    const hasFilter = Boolean(rawSearch || rawStatus || rawType);
    const viewOverride = hasFilter
      ? `<style>
    #dashboard { display: none !important; }
    #applications { display: block !important; }
    .nav-dashboard { background-color: transparent !important; color: #94A3B8 !important; }
    .nav-applications { background-color: var(--sidebar-active) !important; color: #FFFFFF !important; }
  </style>`
      : '';

    // Build dynamic rows
    const companiesTableRows = renderCompaniesTable(companies);
    const companySelectOptions = renderCompanyOptions(companies);
    const applicationsTableRows = renderApplicationsTable(displayedApps);
    const applicationSelectOptions = renderApplicationOptions(applications);
    const interviewsTableRows = renderInterviewsTable(interviews);
    const overdueFollowupsRows = renderFollowUpsRows(overdueApps, true);
    const upcomingFollowupsRows = renderFollowUpsRows(upcomingApps, false);
    const offersTableRows = renderOffersTable(offers);
    const highestPackageHtml = renderHighestPackageBanner(offers);
    const statusBreakdownHtml = renderStatusBars(applications);
    const companyBreakdownHtml = renderCompanyBars(applications);
    const recentApplicationsRows = renderRecentApplications(applications);
    const upcomingInterviewsRows = renderUpcomingInterviews(interviews);

    // Replace Authenticated User Profile details
    const userName = session.fullName;
    const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';
    const userEmail = session.email;

    html = html
      .replace(/{{USER_NAME}}/g, escapeHtml(userName))
      .replace(/{{USER_INITIAL}}/g, escapeHtml(userInitial))
      .replace(/{{USER_EMAIL}}/g, escapeHtml(userEmail));

    // Replace Dashboard Metric Numbers & Subtexts
    html = html
      .replace(/{{TOTAL_APPS}}/g, String(totalApps))
      .replace(/{{TOTAL_INTERVIEWS}}/g, String(totalInterviews))
      .replace(/{{TOTAL_OFFERS}}/g, String(totalOffers))
      .replace(/{{TOTAL_REJECTIONS}}/g, String(totalRejections))
      .replace(/{{OFFER_RATE}}/g, offerRate)
      .replace(/{{HIGHEST_PACKAGE}}/g, highestOffer.toFixed(2))
      .replace(/{{INTERVIEWS_SUBTEXT}}/g, escapeHtml(interviewSubtext))
      .replace(/{{OFFERS_SUBTEXT}}/g, escapeHtml(offersSubtext))
      .replace(/{{OVERDUE_COUNT_BADGE}}/g, overdueBadge);

    // Replace Search / Filter Persistence
    html = html
      .replace('<!-- DYNAMIC_VIEW_OVERRIDE -->', viewOverride)
      .replace('{{SEARCH_QUERY}}', escapeHtml(rawSearch))
      .replace('{{STATUS_APPLIED_SELECTED}}', rawStatus === 'Applied' ? 'selected' : '')
      .replace('{{STATUS_SHORTLISTED_SELECTED}}', rawStatus === 'Shortlisted' ? 'selected' : '')
      .replace('{{STATUS_INTERVIEW_SELECTED}}', rawStatus === 'Interview Scheduled' ? 'selected' : '')
      .replace('{{STATUS_OFFERED_SELECTED}}', rawStatus === 'Offered' ? 'selected' : '')
      .replace('{{STATUS_REJECTED_SELECTED}}', rawStatus === 'Rejected' ? 'selected' : '')
      .replace('{{TYPE_JOB_SELECTED}}', rawType === 'Job' ? 'selected' : '')
      .replace('{{TYPE_INTERNSHIP_SELECTED}}', rawType === 'Internship' ? 'selected' : '');

    // Replace Tables & Dropdown Placeholders
    html = html
      .replace('<!-- DYNAMIC_COMPANIES_ROWS -->', companiesTableRows)
      .replace(/<!-- DYNAMIC_COMPANY_OPTIONS -->/g, companySelectOptions)
      .replace('<!-- DYNAMIC_APPLICATIONS_ROWS -->', applicationsTableRows)
      .replace('<!-- DYNAMIC_RECENT_APPLICATIONS -->', recentApplicationsRows)
      .replace(/<!-- DYNAMIC_APPLICATION_OPTIONS -->/g, applicationSelectOptions)
      .replace('<!-- DYNAMIC_INTERVIEWS_ROWS -->', interviewsTableRows)
      .replace('<!-- DYNAMIC_UPCOMING_INTERVIEWS -->', upcomingInterviewsRows)
      .replace('<!-- DYNAMIC_OVERDUE_FOLLOWUPS -->', overdueFollowupsRows)
      .replace('<!-- DYNAMIC_UPCOMING_FOLLOWUPS -->', upcomingFollowupsRows)
      .replace('<!-- DYNAMIC_OFFERS_ROWS -->', offersTableRows)
      .replace(/<!-- DYNAMIC_HIGHEST_PACKAGE -->/g, highestPackageHtml)
      .replace('<!-- DYNAMIC_STATUS_BREAKDOWN -->', statusBreakdownHtml)
      .replace('<!-- DYNAMIC_COMPANY_BREAKDOWN -->', companyBreakdownHtml);

    res.type('text/html; charset=UTF-8').send(html);
  } catch (err: any) {
    res.status(500).send(`<html><body><h2>Server Error</h2><p>${escapeHtml(err.message)}</p></body></html>`);
  }
});

// =============================================================================
// POST HANDLERS FOR COMPANIES (PROTECTED)
// =============================================================================
app.post('/add-company', requireAuth, (req: Request, res: Response) => {
  const { name, location, roleOffered, contactEmail } = req.body;
  if (name && contactEmail) {
    companies.push({
      companyId: nextCompanyId++,
      name: String(name).trim(),
      location: String(location || 'India').trim(),
      roleOffered: String(roleOffered || '').trim(),
      contactEmail: String(contactEmail).trim()
    });
  }
  res.redirect(303, '/#companies');
});

app.post('/update-company', requireAuth, (req: Request, res: Response) => {
  const { companyId, name, location, roleOffered, contactEmail } = req.body;
  const id = parseInt(companyId, 10);
  const c = companies.find((item) => item.companyId === id);
  if (c) {
    c.name = String(name).trim();
    c.location = String(location).trim();
    c.roleOffered = String(roleOffered).trim();
    c.contactEmail = String(contactEmail).trim();
  }
  res.redirect(303, '/#companies');
});

app.post('/delete-company', requireAuth, (req: Request, res: Response) => {
  const id = parseInt(req.body.companyId, 10);
  companies = companies.filter((c) => c.companyId !== id);
  // ON DELETE CASCADE
  const removedAppIds = applications.filter((a) => a.companyId === id).map((a) => a.applicationId);
  applications = applications.filter((a) => a.companyId !== id);
  interviews = interviews.filter((iv) => !removedAppIds.includes(iv.applicationId));
  offers = offers.filter((o) => !removedAppIds.includes(o.applicationId));
  res.redirect(303, '/#companies');
});

// =============================================================================
// POST HANDLERS FOR APPLICATIONS (PROTECTED)
// =============================================================================
app.post('/add-application', requireAuth, (req: Request, res: Response) => {
  const { companyId, role, type, appliedDate, status, followUpDate } = req.body;
  if (role) {
    applications.unshift({
      applicationId: nextApplicationId++,
      companyId: parseInt(companyId, 10) || 1,
      role: String(role).trim(),
      type: String(type || 'Job').trim(),
      appliedDate: String(appliedDate || new Date().toISOString().split('T')[0]),
      status: String(status || 'Applied').trim(),
      followUpDate: followUpDate ? String(followUpDate).trim() : null
    });
  }
  res.redirect(303, '/#applications');
});

app.post('/update-application-status', requireAuth, (req: Request, res: Response) => {
  const id = parseInt(req.body.applicationId, 10);
  const status = String(req.body.status || 'Applied').trim();
  const a = applications.find((item) => item.applicationId === id);
  if (a) {
    a.status = status;
  }
  res.redirect(303, '/#applications');
});

app.post('/update-application', requireAuth, (req: Request, res: Response) => {
  const { applicationId, companyId, role, type, appliedDate, status, followUpDate } = req.body;
  const id = parseInt(applicationId, 10);
  const a = applications.find((item) => item.applicationId === id);
  if (a) {
    if (companyId) a.companyId = parseInt(companyId, 10);
    if (role) a.role = String(role).trim();
    if (type) a.type = String(type).trim();
    if (appliedDate) a.appliedDate = String(appliedDate).trim();
    if (status) a.status = String(status).trim();
    a.followUpDate = followUpDate ? String(followUpDate).trim() : null;
  }
  res.redirect(303, '/#applications');
});

app.post('/delete-application', requireAuth, (req: Request, res: Response) => {
  const id = parseInt(req.body.applicationId, 10);
  applications = applications.filter((a) => a.applicationId !== id);
  interviews = interviews.filter((iv) => iv.applicationId !== id);
  offers = offers.filter((o) => o.applicationId !== id);
  res.redirect(303, '/#applications');
});

// =============================================================================
// POST HANDLERS FOR INTERVIEWS (PROTECTED)
// =============================================================================
app.post('/add-interview', requireAuth, (req: Request, res: Response) => {
  const { applicationId, interviewDate, round, result } = req.body;
  const appId = parseInt(applicationId, 10);
  if (appId) {
    interviews.unshift({
      interviewId: nextInterviewId++,
      applicationId: appId,
      interviewDate: String(interviewDate || new Date().toISOString().split('T')[0]),
      round: String(round || 'Technical').trim(),
      result: String(result || 'Pending').trim()
    });
  }
  res.redirect(303, '/#interviews');
});

app.post('/update-interview-result', requireAuth, (req: Request, res: Response) => {
  const id = parseInt(req.body.interviewId, 10);
  const result = String(req.body.result || 'Pending').trim();
  const iv = interviews.find((item) => item.interviewId === id);
  if (iv) {
    iv.result = result;
  }
  res.redirect(303, '/#interviews');
});

app.post('/delete-interview', requireAuth, (req: Request, res: Response) => {
  const id = parseInt(req.body.interviewId, 10);
  interviews = interviews.filter((iv) => iv.interviewId !== id);
  res.redirect(303, '/#interviews');
});

// =============================================================================
// POST HANDLERS FOR FOLLOW-UPS (PROTECTED)
// =============================================================================
app.post('/add-followup', requireAuth, (req: Request, res: Response) => {
  const appId = parseInt(req.body.applicationId, 10);
  const fDate = String(req.body.followUpDate || '').trim();
  const a = applications.find((item) => item.applicationId === appId);
  if (a) {
    a.followUpDate = fDate || null;
  }
  res.redirect(303, '/#followups');
});

// =============================================================================
// POST HANDLERS FOR OFFERS (WITH TRIGGER SIMULATION) (PROTECTED)
// =============================================================================
app.post('/add-offer', requireAuth, (req: Request, res: Response) => {
  const { applicationId, packageLpa, deadline, offerStatus } = req.body;
  const appId = parseInt(applicationId, 10);
  const pkg = parseFloat(packageLpa) || 0.0;
  if (appId && pkg > 0) {
    // Check if offer already exists for this application (1-to-1 UNIQUE constraint)
    offers = offers.filter((o) => o.applicationId !== appId);
    offers.unshift({
      offerId: nextOfferId++,
      applicationId: appId,
      packageLpa: pkg,
      deadline: String(deadline || new Date().toISOString().split('T')[0]),
      offerStatus: String(offerStatus || 'Pending').trim()
    });

    // PL/SQL Trigger Simulation: trg_after_offer_insert
    const a = applications.find((item) => item.applicationId === appId);
    if (a) {
      a.status = 'Offered';
    }
  }
  res.redirect(303, '/#offers');
});

app.post('/update-offer-status', requireAuth, (req: Request, res: Response) => {
  const id = parseInt(req.body.offerId, 10);
  const status = String(req.body.offerStatus || 'Pending').trim();
  const o = offers.find((item) => item.offerId === id);
  if (o) {
    o.offerStatus = status;
  }
  res.redirect(303, '/#offers');
});

app.post('/delete-offer', requireAuth, (req: Request, res: Response) => {
  const id = parseInt(req.body.offerId, 10);
  offers = offers.filter((o) => o.offerId !== id);
  res.redirect(303, '/#offers');
});

// =============================================================================
// START SERVER
// =============================================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CareerTrack Server running on http://0.0.0.0:${PORT}`);
});
