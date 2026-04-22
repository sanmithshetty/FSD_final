// =============================================
// StudyHive Frontend Configuration
// =============================================
const CONFIG = {
  API_BASE: 'http://localhost:5000/api',
  // Change to your deployed backend URL in production
  // API_BASE: 'https://your-backend.railway.app/api',
};

const SUBJECTS = [
  'All', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'History', 'Geography', 'Economics',
  'English', 'Hindi', 'Other'
];

const BADGE_CONFIG = {
  newcomer:        { icon: '🌱', label: 'Newcomer',        color: '#4ade80' },
  curious:         { icon: '🔍', label: 'Curious Mind',    color: '#60a5fa' },
  helper:          { icon: '🤝', label: 'Helper',          color: '#a78bfa' },
  rising_star:     { icon: '⭐', label: 'Rising Star',     color: '#fbbf24' },
  expert:          { icon: '🏆', label: 'Expert',          color: '#f97316' },
  legend:          { icon: '👑', label: 'Legend',          color: '#ec4899' },
  verified_guru:   { icon: '✅', label: 'Verified Guru',   color: '#14b8a6' },
  top_contributor: { icon: '🔥', label: 'Top Contributor', color: '#ef4444' },
  streak_7:        { icon: '💫', label: '7-Day Streak',    color: '#8b5cf6' },
};

// Auth helpers
const Auth = {
  getToken: () => localStorage.getItem('sh_token'),
  getUser: () => {
    const u = localStorage.getItem('sh_user');
    return u ? JSON.parse(u) : null;
  },
  setSession: (token, user) => {
    localStorage.setItem('sh_token', token);
    localStorage.setItem('sh_user', JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem('sh_token');
    localStorage.removeItem('sh_user');
  },
  isLoggedIn: () => !!localStorage.getItem('sh_token'),
};

// API helper
async function api(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
    headers,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.errors?.[0]?.msg || 'Something went wrong');
  return data;
}

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Badge renderer
function renderBadges(badges = [], max = 3) {
  return badges.slice(0, max).map(b => {
    const cfg = BADGE_CONFIG[b.name] || { icon: '🏅', label: b.name, color: '#888' };
    return `<span class="badge-chip" style="--bc:${cfg.color}" title="${cfg.label}">${cfg.icon}</span>`;
  }).join('');
}

// Time ago
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}