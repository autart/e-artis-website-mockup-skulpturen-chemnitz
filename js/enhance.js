/* Progressive enhancement — die Seiten funktionieren ohne dieses Skript.
   Aufgaben: Menü, Infokarten-Tabs, Essay-Ausklapper, Lightbox, Karten-Pins, Reveals. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- mobile menu ---- */
  var mb = document.getElementById("menubtn");
  if (mb) mb.addEventListener("click", function () {
    var open = document.body.classList.toggle("nav-open");
    mb.setAttribute("aria-expanded", open ? "true" : "false");
  });

  /* ---- info card tabs ---- */
  document.querySelectorAll(".infocard").forEach(function (card) {
    card.querySelectorAll(".ic-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-tab");
        card.querySelectorAll(".ic-tab").forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("on", on); b.setAttribute("aria-selected", on ? "true" : "false");
        });
        card.querySelectorAll(".ic-panel").forEach(function (p) {
          p.classList.toggle("on", p.getAttribute("data-panel") === id);
        });
      });
    });
  });

  /* ---- essay expanders ---- */
  document.querySelectorAll(".mag-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var more = btn.parentNode.querySelector(".mag-more");
      var open = more.classList.toggle("open");
      btn.textContent = open ? "Weniger ↑" : "Weiterlesen ↓";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ---- lightbox ---- */
  var lb = document.getElementById("lightbox");
  if (lb) {
    var imgs = [].map.call(document.querySelectorAll(".g-img img"), function (im) {
      var fc = im.closest("figure").querySelector("figcaption");
      return { src: im.getAttribute("src"), cap: fc ? fc.textContent : "" };
    });
    var lbImg = document.getElementById("lb-img"), lbCap = document.getElementById("lb-cap"), cur = 0, last = null;
    function show(k) {
      cur = (k + imgs.length) % imgs.length;
      lbImg.src = imgs[cur].src; lbCap.textContent = imgs[cur].cap;
    }
    function open(k) {
      last = document.activeElement;
      show(k); lb.hidden = false; document.body.style.overflow = "hidden";
      document.getElementById("lb-close").focus();
    }
    function close() {
      lb.hidden = true; lbImg.removeAttribute("src"); document.body.style.overflow = "";
      if (last) last.focus();
    }
    document.querySelectorAll(".g-img").forEach(function (g) {
      var im = g.querySelector("img"); if (!im) return;
      g.setAttribute("tabindex", "0"); g.setAttribute("role", "button");
      g.setAttribute("aria-label", "Bild vergrößern");
      function go() { open(parseInt(g.getAttribute("data-gi"), 10) || 0); }
      g.addEventListener("click", go);
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    document.getElementById("lb-close").addEventListener("click", close);
    document.getElementById("lb-prev").addEventListener("click", function () { show(cur - 1); });
    document.getElementById("lb-next").addEventListener("click", function () { show(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(cur - 1);
      else if (e.key === "ArrowRight") show(cur + 1);
      else if (e.key === "Tab") {
        var f = lb.querySelectorAll("button"); var first = f[0], lastF = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastF.focus(); }
        else if (!e.shiftKey && document.activeElement === lastF) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---- map plot ---- */
  var host = document.getElementById("page-map");
  if (host && host.getAttribute("data-works")) {
    var R = 6378137;
    var raw = JSON.parse(host.getAttribute("data-works"));
    var stage = host.querySelector(".plot-stage"), tip = host.querySelector(".plot-tip"), card = host.querySelector(".plot-card");
    var pts = raw.map(function (o) {
      var m = (o.c || "").replace(/(\d),(\d)/g, "$1.$2").split(",");
      var lat = parseFloat(m[0]), lng = parseFloat(m[1]);
      if (!isFinite(lat) || !isFinite(lng)) return null;
      return { o: o, lat: lat, lng: lng, x: R * lng * Math.PI / 180, y: -R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) };
    }).filter(Boolean);
    if (pts.length) {
      var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
      var bb = { x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs), y0: Math.min.apply(null, ys), y1: Math.max.apply(null, ys) };
      var view = { s: 1, cx: (bb.x0 + bb.x1) / 2, cy: (bb.y0 + bb.y1) / 2 }, fitS = 1;
      var size = function () { return { w: host.clientWidth, h: host.clientHeight }; };
      function fit() {
        var d = size(), pad = 56;
        fitS = Math.min((d.w - 2 * pad) / Math.max(bb.x1 - bb.x0, 1), (d.h - 2 * pad) / Math.max(bb.y1 - bb.y0, 1));
        view.s = fitS; view.cx = (bb.x0 + bb.x1) / 2; view.cy = (bb.y0 + bb.y1) / 2;
      }
      function toPx(p) { var d = size(); return [(p.x - view.cx) * view.s + d.w / 2, (p.y - view.cy) * view.s + d.h / 2]; }

      /* district hulls */
      var districts = {};
      pts.forEach(function (p) { if (p.o.d) (districts[p.o.d] = districts[p.o.d] || []).push(p); });
      function hull(ps) {
        if (ps.length < 3) return null;
        var s = ps.slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; });
        var cr = function (o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); };
        var lo = [], up = [];
        s.forEach(function (p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
        s.slice().reverse().forEach(function (p) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); });
        return lo.concat(up.slice(1, -1));
      }
      var hulls = Object.keys(districts).map(function (k) { return hull(districts[k]); }).filter(Boolean);
      function hullPath(h, grow) {
        var cx = h.reduce(function (a, p) { return a + p.x; }, 0) / h.length;
        var cy = h.reduce(function (a, p) { return a + p.y; }, 0) / h.length;
        var q = h.map(function (p) {
          var d = Math.hypot(p.x - cx, p.y - cy) || 1;
          return toPx({ x: p.x + (p.x - cx) / d * grow, y: p.y + (p.y - cy) / d * grow });
        });
        var s = "M" + q[0][0].toFixed(1) + "," + q[0][1].toFixed(1);
        for (var k = 0; k < q.length; k++) {
          var a = q[k], b = q[(k + 1) % q.length];
          s += "Q" + a[0].toFixed(1) + "," + a[1].toFixed(1) + " " + ((a[0] + b[0]) / 2).toFixed(1) + "," + ((a[1] + b[1]) / 2).toFixed(1);
        }
        return s + "Z";
      }

      function draw() {
        var d0 = size(), grow = 90 / Math.max(view.s, 0.001), html = "";
        var gx = pts.reduce(function (a, p) { return a + p.x; }, 0) / pts.length;
        var gy = pts.reduce(function (a, p) { return a + p.y; }, 0) / pts.length;
        var latC = 2 * Math.atan(Math.exp(-gy / R)) - Math.PI / 2;
        var mpu = Math.cos(latC), g0 = toPx({ x: gx, y: gy });
        var rings = [250, 500, 1000].map(function (m) { return { m: m, r: (m / mpu) * view.s }; })
          .filter(function (r) { return r.r > 26 && r.r < Math.max(d0.w, d0.h) * 1.4; });
        html += '<svg class="plot-svg" viewBox="0 0 ' + d0.w + ' ' + d0.h + '" aria-hidden="true">' +
          rings.map(function (r) {
            return '<circle class="plot-ring" cx="' + g0[0].toFixed(1) + '" cy="' + g0[1].toFixed(1) + '" r="' + r.r.toFixed(1) + '"></circle>' +
              '<text class="plot-ringlbl" x="' + g0[0].toFixed(1) + '" y="' + (g0[1] - r.r + 13).toFixed(1) + '">' + (r.m >= 1000 ? (r.m / 1000) + " km" : r.m + " m") + '</text>';
          }).join("") +
          hulls.map(function (h) { return '<path class="plot-hull" d="' + hullPath(h, grow) + '"></path>'; }).join("") + '</svg>';
        pts.forEach(function (p) {
          var q = toPx(p);
          html += '<button class="ppin' + (p.o.l ? " lost" : "") + '" data-slug="' + p.o.s + '" style="left:' + q[0] + 'px;top:' + q[1] + 'px;--pin:var(' + p.o.p + ')" aria-label="' + p.o.t + '"><span>' + p.o.n + '</span></button>';
        });
        var target = Math.min(150, d0.w * 0.22);
        var metres = (target / view.s) * mpu;
        var nice = [25, 50, 100, 200, 300, 500, 1000, 2000].reduce(function (a, b) { return Math.abs(b - metres) < Math.abs(a - metres) ? b : a; });
        html += '<div class="plot-scale"><span class="sb" style="width:' + (nice / mpu * view.s) + 'px"></span><span class="sl">' + (nice >= 1000 ? (nice / 1000) + " km" : nice + " m") + '</span></div>' +
          '<div class="plot-north">N<span class="ar">↑</span></div>';
        stage.innerHTML = html;
        wire();
      }
      function openCard(p) {
        var o = p.o, d = size(), q = toPx(p);
        card.innerHTML = '<button class="pc-x" type="button" aria-label="Schließen">×</button>' +
          '<span class="pc-no">' + String(o.n).padStart(3, "0") + (o.l ? " · nicht mehr vorhanden" : "") + '</span>' +
          '<strong>' + o.t + '</strong><span class="pc-m">' + o.a + ' · ' + o.y + '</span><span class="pc-m">' + o.o + '</span>' +
          '<div class="pc-a"><a href="werke/' + o.s + '.html">Werk ansehen →</a>' +
          '<a href="https://www.google.com/maps/search/?api=1&query=' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener">Wegbeschreibung ↗</a></div>';
        card.style.left = Math.max(12, Math.min(q[0], d.w - 250)) + "px";
        card.style.top = Math.max(12, q[1] - 16) + "px";
        card.classList.add("on");
        card.querySelector(".pc-x").addEventListener("click", function () { card.classList.remove("on"); });
      }
      function wire() {
        stage.querySelectorAll(".ppin").forEach(function (b) {
          var p = pts.filter(function (x) { return x.o.s === b.getAttribute("data-slug"); })[0];
          b.addEventListener("click", function (e) { e.stopPropagation(); openCard(p); });
          b.addEventListener("mouseenter", function () {
            tip.textContent = p.o.t + " · " + p.o.y;
            tip.style.left = b.style.left; tip.style.top = b.style.top; tip.classList.add("on");
          });
          b.addEventListener("mouseleave", function () { tip.classList.remove("on"); });
        });
      }
      host.addEventListener("click", function (e) { if (!e.target.closest(".plot-card")) card.classList.remove("on"); });
      var drag = null;
      stage.addEventListener("pointerdown", function (e) {
        if (e.target.closest(".ppin")) return;
        drag = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
        stage.setPointerCapture(e.pointerId); stage.classList.add("grabbing");
      });
      stage.addEventListener("pointermove", function (e) {
        if (!drag) return;
        view.cx = drag.cx - (e.clientX - drag.x) / view.s;
        view.cy = drag.cy - (e.clientY - drag.y) / view.s;
        draw();
      });
      stage.addEventListener("pointerup", function () { drag = null; stage.classList.remove("grabbing"); });
      host.querySelector(".pz-in").addEventListener("click", function () { view.s *= 1.7; draw(); });
      host.querySelector(".pz-out").addEventListener("click", function () { view.s = Math.max(view.s / 1.7, fitS * 0.8); draw(); });
      host.querySelector(".pz-fit").addEventListener("click", function () { fit(); draw(); });
      document.querySelectorAll(".leg-row").forEach(function (row) {
        var p = pts.filter(function (x) { return x.o.s === row.getAttribute("data-slug"); })[0];
        if (!p) return;
        row.addEventListener("click", function (e) {
          e.preventDefault();
          var d = size();
          view.s = Math.min(fitS * 14, 0.9); view.cx = p.x; view.cy = p.y;
          draw(); openCard(p);
          host.scrollIntoView ? null : null;
        });
      });
      fit(); draw();
      window.addEventListener("resize", draw);
    }
  }

  /* ---- reveals ---- */
  var els = document.querySelectorAll("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach(function (e) { e.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }
})();
