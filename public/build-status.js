const badge = document.createElement('span');
badge.id = 'cfBuildStatus';
badge.className = 'eb-cf-build-status';
badge.title = 'Cloudflare deployment status';
badge.textContent = '● CF';

const header = document.querySelector('.eb-header-inner');
const brand = document.querySelector('.eb-brand');
if (header && brand) header.insertBefore(badge, brand);

const style = document.createElement('style');
style.textContent = `
.eb-cf-build-status{font-size:11px;white-space:nowrap;opacity:.9;cursor:default}
.eb-cf-build-status.is-error{opacity:.7}
`;
document.head.appendChild(style);

let currentVersion = null;

async function refreshBuildStatus() {
  try {
    const response = await fetch('/__build', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const build = await response.json();
    const version = build.version || build.tag || null;
    if (currentVersion && version && version !== currentVersion) {
      badge.textContent = '● UPDATED';
      badge.title = `New Cloudflare version deployed: ${version}`;
      window.setTimeout(() => window.location.reload(), 700);
      return;
    }
    currentVersion = version;
    badge.textContent = version ? `● CF LIVE ${version.slice(0, 8)}` : '● CF LIVE';
    badge.title = build.timestamp ? `Cloudflare deployed ${new Date(build.timestamp).toLocaleString()}` : 'Cloudflare deployment is live';
    badge.classList.remove('is-error');
  } catch (error) {
    badge.textContent = '○ CF';
    badge.title = `Cloudflare status unavailable: ${error.message}`;
    badge.classList.add('is-error');
  }
}

refreshBuildStatus();
window.setInterval(refreshBuildStatus, 5000);
