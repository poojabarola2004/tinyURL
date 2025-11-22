// public/app.js
const API_BASE = '/api';
const BASE_URL = (window.BASE_URL || '');

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return { status: res.status, json: text ? JSON.parse(text) : null };
  } catch (e) {
    return { status: res.status, text };
  }
}

function createRow(link) {
  const container = document.createElement('div');
  container.className = 'row';
  const short = document.createElement('div');
  short.innerHTML = `<a href="/${link.code}" target="_blank">${link.code}</a>`;
  const url = document.createElement('div');
  url.textContent = link.target_url;
  const clicks = document.createElement('div');
  clicks.textContent = link.clicks || 0;
  const last = document.createElement('div');
  last.textContent = link.last_clicked ? new Date(link.last_clicked).toLocaleString() : '-';
  const actions = document.createElement('div');
  actions.innerHTML = `
    <button class="btn stats" data-code="${link.code}">Stats</button>
    <button class="btn copy" data-url="${link.target_url}">Copy URL</button>
    <button class="btn del" data-code="${link.code}">Delete</button>
  `;
  container.appendChild(short);
  container.appendChild(url);
  container.appendChild(clicks);
  container.appendChild(last);
  container.appendChild(actions);
  return container;
}

/* DASHBOARD logic */
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
  document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('createForm');
    const createMsg = document.getElementById('createMsg');
    const tableContainer = document.getElementById('tableContainer');
    const searchInput = document.getElementById('search');

    async function load() {
      tableContainer.innerHTML = 'Loading...';
      const r = await fetchJSON(`${API_BASE}/links`);
      if (r.status !== 200) {
        tableContainer.textContent = 'Failed to load links';
        return;
      }
      renderTable(r.json);
    }

    function renderTable(list) {
      const holder = document.createElement('div');
      holder.className = 'table';
      // header
      const header = document.createElement('div');
      header.className = 'row header';
      header.innerHTML = '<div>Code</div><div>Target URL</div><div>Clicks</div><div>Last Clicked</div><div>Actions</div>';
      holder.appendChild(header);

      let filtered = list;
      const q = (searchInput.value || '').toLowerCase();
      if (q) {
        filtered = list.filter(l => l.code.toLowerCase().includes(q) || (l.target_url || '').toLowerCase().includes(q));
      }
      filtered.forEach(l => holder.appendChild(createRow(l)));
      tableContainer.innerHTML = '';
      tableContainer.appendChild(holder);

      // attach listeners
      holder.querySelectorAll('.btn.del').forEach(btn => {
        btn.onclick = async (e) => {
          const code = e.target.dataset.code;
          if (!confirm(`Delete ${code}?`)) return;
          const rr = await fetch(`${API_BASE}/links/${code}`, { method: 'DELETE' });
          if (rr.status === 204) load();
          else alert('Delete failed');
        };
      });
      holder.querySelectorAll('.btn.copy').forEach(btn => {
        btn.onclick = (e) => {
          navigator.clipboard.writeText(e.target.dataset.url);
          alert('Copied target URL to clipboard');
        };
      });
      holder.querySelectorAll('.btn.stats').forEach(btn => {
        btn.onclick = (e) => {
          const code = e.target.dataset.code;
          window.location.href = `/code/${code}`;
        };
      });
    }

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      createMsg.textContent = '';
      const target = document.getElementById('target').value.trim();
      const code = document.getElementById('code').value.trim();

      const body = { target_url: target };
      if (code) body.code = code;

      const btn = document.getElementById('createBtn');
      btn.disabled = true;
      const res = await fetchJSON(`${API_BASE}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      btn.disabled = false;
      if (res.status === 201) {
        createMsg.textContent = `Created: ${res.json.short_url || '/'+res.json.code}`;
        form.reset();
        await load();
      } else {
        createMsg.textContent = (res.json && res.json.error) ? res.json.error : 'Create failed';
      }
    });

    searchInput.addEventListener('input', () => load());
    await load();
  });
}

/* STATS page logic */
if (window.location.pathname.startsWith('/code/')) {
  document.addEventListener('DOMContentLoaded', async () => {
    const holder = document.getElementById('statsHolder');
    const code = window.TINYLINK_CODE;
    if (!code) {
      holder.textContent = 'No code provided in URL';
      return;
    }
    holder.innerHTML = 'Loading...';
    const r = await fetchJSON(`/api/links/${code}`);
    if (r.status === 404) {
      holder.innerHTML = '<p>Not found</p>';
      return;
    }
    if (r.status !== 200) {
      holder.textContent = 'Failed to load stats';
      return;
    }
    const link = r.json;
    holder.innerHTML = `
      <h2>Stats for ${link.code}</h2>
      <p>Target: <a href="${link.target_url}" target="_blank">${link.target_url}</a></p>
      <p>Clicks: ${link.clicks}</p>
      <p>Last clicked: ${link.last_clicked ? new Date(link.last_clicked).toLocaleString() : '-'}</p>
      <p>Created: ${link.created_at ? new Date(link.created_at).toLocaleString() : '-'}</p>
      <p><a href="/${link.code}" target="_blank">Open short URL (this will increment click count)</a></p>
      <p><a href="/">Back to dashboard</a></p>
    `;
  });
}
