:root {
  --primary: #2563eb;
  --secondary: #1e293b;
  --text-main: #334155;
  --bg-light: #f8fafc;
  --white: #ffffff;
}

.landing-container {
  font-family: 'Inter', sans-serif;
  color: var(--text-main);
  line-height: 1.6;
}

/* Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 5%;
  background: var(--white);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.nav-login-btn {
  background: var(--primary);
  color: white;
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

/* Hero Section */
.hero {
  padding: 5rem 5%;
  background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
  text-align: center;
}

.hero h1 {
  font-size: 3rem;
  color: var(--secondary);
  max-width: 800px;
  margin: 0 auto 1.5rem;
}

.hero-subtitle {
  max-width: 700px;
  margin: 0 auto 3rem;
  font-size: 1.2rem;
}

.stats-bar {
  display: flex;
  justify-content: center;
  gap: 4rem;
  margin-top: 2rem;
}

.stat-item strong {
  font-size: 2rem;
  color: var(--primary);
}

/* Features Grid */
.management-overview {
  padding: 5rem 5%;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  padding: 2rem;
  background: var(--bg-light);
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

/* Roles Section */
.roles-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  padding: 5rem 5%;
  background: var(--secondary);
  color: var(--white);
}

.role-column h3 {
  border-bottom: 2px solid var(--primary);
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.role-column ul {
  list-style: none;
  padding: 0;
}

/* Institutions */
.institutions {
  padding: 3rem 5%;
  text-align: center;
  background: var(--white);
}

.institution-logos {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 2rem;
  margin-top: 2rem;
  font-weight: 600;
  color: #94a3b8;
}

/* Contact Section */
.contact-section {
  padding: 5rem 5%;
  background: var(--bg-light);
}

.contact-container {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 4rem;
  margin-top: 3rem;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.contact-form input, .contact-form textarea {
  padding: 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

.submit-btn {
  background: var(--primary);
  color: white;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

/* Footer */
.footer-main {
  background: #0f172a;
  color: #94a3b8;
  padding: 4rem 5% 2rem;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3rem;
}

.footer-brand h3 {
  color: white;
  margin-bottom: 1rem;
}

.footer-links-container {
  display: flex;
  gap: 4rem;
}

.link-group h4 {
  color: white;
}