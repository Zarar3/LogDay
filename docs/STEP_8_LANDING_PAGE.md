# Step 8 — Landing Page (React + Vite)

## Goal
Build a clean web landing page that markets the app, with a hero section, feature highlights, and a download/waitlist section.

---

## 8.1 Scaffold the Web App

```bash
cd web
npm create vite@latest . -- --template react
npm install
npm install react-router-dom
```

---

## 8.2 Folder Structure

```
web/
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   └── components/
│       ├── Hero.jsx
│       ├── Features.jsx
│       ├── Download.jsx
│       └── Footer.jsx
```

```bash
mkdir src/components
```

---

## 8.3 Global Styles

Replace `web/src/index.css` with:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #fff;
  color: #111;
}

a { text-decoration: none; color: inherit; }
```

---

## 8.4 App.jsx

Replace `web/src/App.jsx` with:

```jsx
import Hero     from './components/Hero';
import Features from './components/Features';
import Download from './components/Download';
import Footer   from './components/Footer';

export default function App() {
  return (
    <>
      <Hero />
      <Features />
      <Download />
      <Footer />
    </>
  );
}
```

---

## 8.5 Hero Component

Create `web/src/components/Hero.jsx`:

```jsx
export default function Hero() {
  return (
    <section style={styles.section}>
      <nav style={styles.nav}>
        <span style={styles.logo}>LogDay</span>
        <a href="#download" style={styles.ctaSmall}>Get the App</a>
      </nav>

      <div style={styles.content}>
        <h1 style={styles.headline}>
          Log your day.<br />
          <span style={styles.accent}>Compare with friends.</span>
        </h1>
        <p style={styles.sub}>
          Track your daily activities — workouts, books, meals, anything —
          then see how your day stacks up against your friends.
        </p>
        <a href="#download" style={styles.cta}>Download Free</a>
      </div>
    </section>
  );
}

const styles = {
  section:   { background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
               color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  nav:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
               padding: '24px 48px' },
  logo:      { fontSize: 24, fontWeight: 800, letterSpacing: -1 },
  ctaSmall:  { background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '8px 18px',
               borderRadius: 20, fontSize: 14, fontWeight: 600 },
  content:   { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
               alignItems: 'center', textAlign: 'center', padding: '0 24px' },
  headline:  { fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 800, lineHeight: 1.1,
               marginBottom: 24 },
  accent:    { color: '#A5F3FC' },
  sub:       { fontSize: 20, opacity: 0.85, maxWidth: 560, lineHeight: 1.6, marginBottom: 40 },
  cta:       { background: '#fff', color: '#4F46E5', padding: '16px 40px',
               borderRadius: 40, fontSize: 18, fontWeight: 700,
               boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
};
```

---

## 8.6 Features Component

Create `web/src/components/Features.jsx`:

```jsx
const FEATURES = [
  { icon: '📋', title: 'Custom Activities',
    desc: 'Log anything you do — runs, books, meals, study sessions. You define the categories.' },
  { icon: '📅', title: 'Daily Log',
    desc: 'See everything you did today in one clean view. Build streaks and reflect on your habits.' },
  { icon: '👥', title: 'Compare with Friends',
    desc: 'See what your friends did today and compare notes. Make every day a little more social.' },
  { icon: '🔒', title: 'Private by Default',
    desc: 'Only your friends can see your log. You control who's in your circle.' },
];

export default function Features() {
  return (
    <section style={styles.section}>
      <h2 style={styles.title}>Everything you need to track your day</h2>
      <div style={styles.grid}>
        {FEATURES.map(f => (
          <div key={f.title} style={styles.card}>
            <div style={styles.icon}>{f.icon}</div>
            <h3 style={styles.cardTitle}>{f.title}</h3>
            <p style={styles.cardDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const styles = {
  section:   { padding: '100px 48px', background: '#f9f9fb' },
  title:     { textAlign: 'center', fontSize: 36, fontWeight: 800, marginBottom: 60 },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
               gap: 32, maxWidth: 1000, margin: '0 auto' },
  card:      { background: '#fff', borderRadius: 16, padding: 32,
               boxShadow: '0 2px 16px rgba(0,0,0,0.06)' },
  icon:      { fontSize: 36, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: 700, marginBottom: 10 },
  cardDesc:  { color: '#555', lineHeight: 1.6 },
};
```

---

## 8.7 Download Component

Create `web/src/components/Download.jsx`:

```jsx
export default function Download() {
  return (
    <section id="download" style={styles.section}>
      <h2 style={styles.title}>Get LogDay</h2>
      <p style={styles.sub}>Free to download. No subscriptions.</p>
      <div style={styles.buttons}>
        {/* Replace href with real App Store link once published */}
        <a href="#" style={styles.btn}>
          Download on the App Store
        </a>
      </div>
      <p style={styles.note}>iOS • Coming soon on Android</p>
    </section>
  );
}

const styles = {
  section: { background: '#4F46E5', color: '#fff', padding: '100px 48px', textAlign: 'center' },
  title:   { fontSize: 42, fontWeight: 800, marginBottom: 16 },
  sub:     { fontSize: 20, opacity: 0.85, marginBottom: 40 },
  buttons: { display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  btn:     { background: '#fff', color: '#4F46E5', padding: '16px 36px',
             borderRadius: 40, fontSize: 17, fontWeight: 700,
             boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'inline-block' },
  note:    { marginTop: 24, opacity: 0.6, fontSize: 14 },
};
```

---

## 8.8 Footer Component

Create `web/src/components/Footer.jsx`:

```jsx
export default function Footer() {
  return (
    <footer style={styles.footer}>
      <span style={styles.logo}>LogDay</span>
      <p style={styles.copy}>© {new Date().getFullYear()} LogDay. All rights reserved.</p>
    </footer>
  );
}

const styles = {
  footer: { background: '#111', color: '#fff', padding: '40px 48px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 12 },
  logo:   { fontSize: 20, fontWeight: 800 },
  copy:   { color: '#888', fontSize: 14 },
};
```

---

## 8.9 Run the Landing Page

```bash
cd web
npm run dev
```

Open http://localhost:5173 to see the landing page.

---

## 8.10 Deploy for Free (Vercel)

1. Push the `web/` folder to GitHub (already done if following the steps)
2. Go to https://vercel.com and sign in with GitHub
3. Click **Add New Project** → select your `LogDay` repo
4. Set the **Root Directory** to `web`
5. Click **Deploy**

Your landing page will be live at a free `*.vercel.app` URL in under a minute.

---

## Checklist

- [ ] Landing page runs locally at http://localhost:5173
- [ ] Hero section with headline and CTA button displays
- [ ] Features grid shows all four features
- [ ] Download section visible with App Store button placeholder
- [ ] Footer displays
- [ ] (Optional) Deployed to Vercel

---

## Next Step → [STEP_9_APP_STORE.md](STEP_9_APP_STORE.md)
