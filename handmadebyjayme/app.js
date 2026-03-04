// The Google Apps Script URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5WP1tULDww98Dic3jsbntYEwhkGlsZKvz_ep_oX241gDrKKtorZjNWrjkHeMdczxP/exec';

// Global State to store the parsed Google Doc
let siteData = {
  pages: {},
  posts: []
};

// 1. Initializer: Fetches data, parses it, and handles routing
async function initApp() {
  try {
    const response = await fetch(APPS_SCRIPT_URL);
    if (!response.ok) throw new Error('Network response failed');
    
    const rawText = await response.text();
    parseGoogleDoc(rawText);
    
    // Listen for URL hash changes (when user clicks links)
    window.addEventListener('hashchange', handleRoute);
    
    // Trigger the first route load
    handleRoute();

  } catch (error) {
    document.getElementById('app-root').innerHTML = `
      <h2 class="page-title">System Error</h2>
      <p style="color: var(--hot-pink);">Could not connect to the Google Doc database.</p>
    `;
  }
}

// 2. The Parser: Slices the Google Doc into Pages and Posts
function parseGoogleDoc(text) {
  // Split the document every time it sees a Markdown Header 1 ("# ")
  // The regex keeps the "# " attached to the section
  const sections = text.split(/(^#\s+.+$)/m);
  
  for (let i = 1; i < sections.length; i += 2) {
    const titleLine = sections[i];
    const contentBody = sections[i + 1] ? sections[i + 1].trim() : '';
    
    // Clean up the title (Remove the "# ")
    const rawTitle = titleLine.replace(/^#\s+/, '').trim();
    const slug = slugify(rawTitle);

    // Ignore the Instructions section entirely
    if (slug === 'instructions') continue;

    // Convert the content body to HTML
    const htmlContent = marked.parse(contentBody);

    // Sort into Pages vs Posts based on the title
    if (['portfolio', 'resume', 'contact'].includes(slug)) {
      siteData.pages[slug] = { title: rawTitle, content: htmlContent };
    } else {
      // If it's not a main page, it must be a blog post!
      // Grab the first 150 characters for the preview card
      const plainText = contentBody.replace(/[#*\[\]\(\)>_]/g, ''); 
      const excerpt = plainText.substring(0, 150) + '...';
      
      siteData.posts.push({ title: rawTitle, slug: slug, content: htmlContent, excerpt: excerpt });
    }
  }
}

// 3. The Router: Looks at the URL and injects the right HTML
function handleRoute() {
  const hash = window.location.hash.replace('#', '') || 'journal';
  const root = document.getElementById('app-root');
  
  // Update Navigation styling
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  const activeLink = document.querySelector(`a[href="#${hash}"]`);
  if(activeLink) activeLink.classList.add('active');

  // Route Logic
  if (hash === 'journal') {
    renderJournal(root);
  } else if (siteData.pages[hash]) {
    renderPage(root, siteData.pages[hash]);
  } else {
    // If it's not the journal or a static page, look for a specific post!
    const post = siteData.posts.find(p => p.slug === hash);
    if (post) {
      renderPost(root, post);
    } else {
      root.innerHTML = `<h2 class="page-title">404</h2><p>Track not found.</p>`;
    }
  }
  
  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 4. View Renderers
function renderJournal(root) {
  let html = `<h2 class="page-title">The Journal</h2>`;
  
  if (siteData.posts.length === 0) {
    html += `<p>No tracks dropped yet. Check back soon.</p>`;
  } else {
    siteData.posts.forEach(post => {
      html += `
        <article class="post-card">
          <h3>${post.title}</h3>
          <p class="excerpt">${post.excerpt}</p>
          <a href="#${post.slug}" class="btn-read">Drop the Needle ➔</a>
        </article>
      `;
    });
  }
  root.innerHTML = html;
}

function renderPage(root, page) {
  root.innerHTML = `
    <h2 class="page-title">${page.title}</h2>
    <div class="article-content">${page.content}</div>
  `;
}

function renderPost(root, post) {
  // Notice the Back Button that takes them back to the #journal hash!
  root.innerHTML = `
    <a href="#journal" class="back-btn">⇦ Back to Tracks</a>
    <div class="article-content">
      <h1 style="margin-top:0;">${post.title}</h1>
      ${post.content}
    </div>
  `;
}

// Helper: Turns "My Awesome Post!" into "my-awesome-post" for the URL hash
function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

// Boot up the app!
window.onload = initApp;
