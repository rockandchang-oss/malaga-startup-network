/* Málaga Startup Network · entidades en directo (mejoras 2 y 3 de Joaquín, 16-nov-2026)
   La web oficial lee las entidades del mismo directorio que el portal (/startups), así un alta
   o una edición en el panel se ve sola aquí. Si la consulta falla, se queda el contenido estático.
   - .logos-grid[data-msn-logos]           -> logos de la portada (enlace a su web oficial)
   - [data-msn-entidades]                   -> fichas agrupadas por categoría
   - [data-msn-entidades][data-categoria=x] -> solo las fichas de esa categoría (publicas, academia, privadas, inversion)
   - [data-msn-total]                       -> número de entidades */
(function () {
  var URL = 'https://rsitqcrnuiglogtxljls.supabase.co/rest/v1/';
  var KEY = 'sb_publishable_bAvlF3jI-s0P0U17EqZ37Q_AkxuUJA-';
  var FICHA = '/startups/entidades/';

  function get(p) {
    return fetch(URL + p, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function url(u) { return /^https?:\/\/[^\s"'<>]+$/i.test(u || '') ? u : ''; }
  function orden(a, b) { return (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name, 'es'); }

  var logos = document.querySelector('.logos-grid[data-msn-logos]');
  var bloques = document.querySelectorAll('[data-msn-entidades]');
  var totales = document.querySelectorAll('[data-msn-total]');
  if (!logos && !bloques.length && !totales.length) return;

  Promise.all([
    get('entities?select=id,slug,name,short_description,logo_url,website,location_city,category_id,sort_order&status=eq.published'),
    get('entity_categories?select=id,name,slug,description,sort_order&order=sort_order'),
    bloques.length ? get('programs?select=entity_id&status=eq.published') : Promise.resolve([])
  ]).then(function (res) {
    var ents = (res[0] || []).filter(function (e) { return e.slug && e.name; }).sort(orden);
    var cats = res[1] || [];
    if (ents.length < 3) return; // algo raro: mejor dejar lo estático
    var nprog = {};
    (res[2] || []).forEach(function (p) { nprog[p.entity_id] = (nprog[p.entity_id] || 0) + 1; });

    totales.forEach(function (el) { el.textContent = ents.length; });
    if (logos) pintarLogos(logos, ents);
    bloques.forEach(function (el) { pintarFichas(el, ents, cats, nprog); });
  }).catch(function (e) { if (window.console) console.warn('MSN entidades: se mantiene la versión estática', e); });

  // Portada: se respeta el orden y los logos cuidados de la versión estática; se añaden las nuevas y se quitan las retiradas.
  function pintarLogos(grid, ents) {
    var previas = {};
    Array.prototype.forEach.call(grid.querySelectorAll('a.logo-card[data-slug]'), function (a) { previas[a.getAttribute('data-slug')] = a; });
    var orden = Object.keys(previas);
    var bySlug = {};
    ents.forEach(function (e) { bySlug[e.slug] = e; });
    var lista = orden.filter(function (s) { return bySlug[s]; }).concat(ents.map(function (e) { return e.slug; }).filter(function (s) { return !previas[s]; }));
    var frag = document.createDocumentFragment();
    lista.forEach(function (slug) {
      var e = bySlug[slug], a = previas[slug];
      var destino = url(e.website) || (FICHA + encodeURIComponent(slug));
      if (!a) {
        if (!url(e.logo_url)) return;
        a = document.createElement('a');
        a.className = 'logo-card';
        a.setAttribute('data-slug', slug);
        a.innerHTML = '<img src="' + esc(e.logo_url) + '" alt="' + esc(e.name) + '" class="logo-img" loading="lazy">' +
          '<span class="logo-placeholder">' + esc(e.name) + '</span>';
        var img = a.querySelector('img');
        img.addEventListener('error', function () { img.style.display = 'none'; img.nextElementSibling.style.display = 'block'; });
      }
      a.href = destino;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = e.name;
      frag.appendChild(a);
    });
    grid.innerHTML = '';
    grid.appendChild(frag);
  }

  function ficha(e, nprog) {
    var meta = [];
    if (e.location_city) meta.push(esc(e.location_city));
    var n = nprog[e.id] || 0;
    if (n) meta.push(n + ' programa' + (n > 1 ? 's' : ''));
    var logo = url(e.logo_url) ? '<img src="' + esc(e.logo_url) + '" alt="' + esc(e.name) + '" loading="lazy" style="max-height:52px;max-width:150px;object-fit:contain;margin-bottom:1rem;display:block">' : '';
    var web = url(e.website) ? '<a href="' + esc(e.website) + '" target="_blank" rel="noopener" style="color:var(--navy-mid);font-weight:600;font-size:.9rem;text-decoration:none">Web oficial &rarr;</a>' : '';
    return '<div style="background:var(--white);border:1px solid var(--border-light);border-radius:12px;padding:1.5rem;display:flex;flex-direction:column">' +
      logo +
      '<h3 style="color:var(--navy);font-size:1.15rem;margin:0 0 .4rem">' + esc(e.name) + '</h3>' +
      '<p style="color:var(--navy);opacity:.8;font-size:.95rem;line-height:1.6;flex:1;margin:0 0 .9rem">' + esc(e.short_description) + '</p>' +
      '<div style="margin-bottom:.6rem">' + (meta.length ? '<span style="color:var(--text-muted);font-size:.85rem">' + meta.join(' &middot; ') + '</span>' : '') + '</div>' +
      '<div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">' +
      '<a href="' + FICHA + encodeURIComponent(e.slug) + '" style="color:var(--gold);font-weight:700;font-size:.9rem;text-decoration:none">Ver ficha &rarr;</a>' + web +
      '</div></div>';
  }
  var GRID = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem">';

  function pintarFichas(el, ents, cats, nprog) {
    var solo = el.getAttribute('data-categoria');
    var html = '';
    if (solo) {
      var c = cats.filter(function (x) { return x.slug === solo; })[0];
      var de = c ? ents.filter(function (e) { return e.category_id === c.id; }) : [];
      if (!de.length) return; // sin entidades en esa categoría: se queda el texto estático
      html = GRID + de.map(function (e) { return ficha(e, nprog); }).join('') + '</div>';
    } else {
      cats.forEach(function (c) {
        var de = ents.filter(function (e) { return e.category_id === c.id; });
        if (!de.length) return;
        html += '<h2 style="color:var(--navy);font-size:1.6rem;margin:2.5rem 0 .5rem">' + esc(c.name) + '</h2>' +
          (c.description ? '<p style="color:var(--navy);opacity:.75;margin:0 0 1.2rem">' + esc(c.description) + '</p>' : '') +
          GRID + de.map(function (e) { return ficha(e, nprog); }).join('') + '</div>';
      });
      var sinCat = ents.filter(function (e) { return !cats.some(function (c) { return c.id === e.category_id; }); });
      if (sinCat.length) html += '<h2 style="color:var(--navy);font-size:1.6rem;margin:2.5rem 0 .5rem">Otras entidades</h2>' + GRID + sinCat.map(function (e) { return ficha(e, nprog); }).join('') + '</div>';
    }
    if (html) el.innerHTML = html;
  }
})();
