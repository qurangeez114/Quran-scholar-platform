# Theme Proposition Drill-Down Integration
## Sexuality, Spouses & Ḥūr in Paradise

### Overview
This guide integrates the **Proposition Taxonomy** (45 nodes, 240 propositions) into the theme system on quranhikma.com. Users access via:

**Theme Page:** quranhikma.com/theme-reader.html?theme=sexuality-spouses-hur-paradise

### Architecture

#### Database Layer (Deployed ✅)
- **theme_analysis** table: Theme metadata + scholarly context
- **proposition_hierarchies** table: 45 nodes (11 L2 categories + 34 L3/L4)
- **hadith_propositions** table: 240 propositions with source status + hadith refs
- **hierarchy_verse_links** table: 315 links to Quranic verses (Q36:55, Q44:54, etc.)

#### Frontend Layer (Ready for Integration)
1. **theme-proposition-drill.jsx** — React drill-down component
2. **propositions-api-route.js** — Backend endpoint
3. **theme-reader.html** — Modified to display proposition tab

---

## Implementation Steps

### Step 1: Deploy Backend API Endpoint

**File:** `pages/api/propositions/sexuality-hierarchy.js` (Next.js) or `routes/propositions.js` (Express)

```javascript
// Copy from propositions-api-route.js
// Set environment variables:
NEXT_PUBLIC_SUPABASE_URL=https://ylosytbxpzxzwfzjpaej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Test endpoint:
```bash
curl https://quranhikma.com/api/propositions/sexuality-hierarchy
# Should return JSON array with 11 L2 categories
```

### Step 2: Add Proposition Component to theme-reader.html

In the theme-reader.html file, add a new tab for "Propositions":

```html
<!-- Add to tab navigation -->
<div class="tab-navigation">
  <button class="tab-btn active" data-tab="overview">Overview</button>
  <button class="tab-btn" data-tab="hadith">Hadith</button>
  <button class="tab-btn" data-tab="tafsir">Tafsir</button>
  <button class="tab-btn" data-tab="propositions">Propositions</button> <!-- NEW -->
</div>

<!-- Add to tab content -->
<div id="propositions-tab" class="tab-content" style="display: none;">
  <div id="proposition-drill-root"></div>
</div>
```

### Step 3: Load React Component Dynamically

Add to theme-reader.html `<head>`:

```html
<!-- Babel & React -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Add before `</body>`:

```html
<!-- Proposition Drill Component -->
<script type="text/babel" src="/components/theme-proposition-drill.jsx"></script>

<script>
  // Initialize proposition drill when "Propositions" tab is clicked
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (e.target.dataset.tab === 'propositions') {
        initializePropositionDrill();
      }
    });
  });

  async function initializePropositionDrill() {
    try {
      const response = await fetch('/api/propositions/sexuality-hierarchy');
      const propositions = await response.json();

      const root = ReactDOM.createRoot(document.getElementById('proposition-drill-root'));
      root.render(
        <ThemePropositionDrill initialData={propositions} />
      );
    } catch (error) {
      console.error('Proposition drill initialization failed:', error);
      document.getElementById('proposition-drill-root').innerHTML =
        '<p style="color: #ef4444;">Failed to load propositions. Please refresh.</p>';
    }
  }
</script>
```

### Step 4: Style the Proposition Tab

Add to theme-reader.html `<style>`:

```css
#proposition-drill-root {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #1f2937;
}

#proposition-drill-root h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: #111;
}

#proposition-drill-root h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 12px;
  margin-top: 24px;
  color: #374151;
}

#proposition-drill-root .level-2 {
  border-left: 3px solid #d4af37;
  padding-left: 16px;
  margin-bottom: 16px;
  cursor: pointer;
}

#proposition-drill-root .level-2:hover {
  background-color: #f9fafb;
  border-radius: 4px;
}

#proposition-drill-root .proposition-item {
  padding: 12px;
  margin-bottom: 10px;
  background-color: #f9fafb;
  border-radius: 6px;
  border-left: 3px solid #9ca3af;
}

#proposition-drill-root .status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  color: #fff;
  font-size: 0.85rem;
  margin-right: 6px;
  font-weight: 600;
}

#proposition-drill-root .status-explicit {
  background-color: #10b981; /* Green for explicit */
}

#proposition-drill-root .status-inferred {
  background-color: #3b82f6; /* Blue for inferred */
}

#proposition-drill-root .status-disputed {
  background-color: #f59e0b; /* Amber for disputed */
}

#proposition-drill-root .status-weak {
  background-color: #ef4444; /* Red for weak */
}

#proposition-drill-root .status-consensus {
  background-color: #6366f1; /* Indigo for consensus */
}

#proposition-drill-root .weak-warning {
  font-size: 0.85rem;
  color: #d97706;
  margin-top: 8px;
  padding: 6px;
  background-color: #fef3c7;
  border-radius: 4px;
}

#proposition-drill-root .legend {
  margin-top: 40px;
  padding: 16px;
  background-color: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #cffafe;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  #proposition-drill-root {
    color: #e5e7eb;
  }

  #proposition-drill-root h2,
  #proposition-drill-root h3 {
    color: #f3f4f6;
  }

  #proposition-drill-root .proposition-item {
    background-color: #1f2937;
    border-left-color: #d4af37;
  }

  #proposition-drill-root .level-2:hover {
    background-color: #1f2937;
  }

  #proposition-drill-root .legend {
    background-color: #0f172a;
    border-color: #1e40af;
  }
}
```

### Step 5: Configure Theme Route

Update theme-reader.html page load:

```javascript
// On page load, detect if theme is "sexuality-spouses-hur-paradise"
const urlParams = new URLSearchParams(window.location.search);
const themeName = urlParams.get('theme');

if (themeName === 'sexuality-spouses-hur-paradise') {
  // Show propositions tab by default
  const propTab = document.querySelector('[data-tab="propositions"]');
  if (propTab) {
    propTab.classList.add('active');
    document.getElementById('propositions-tab').style.display = 'block';
  }
}
```

---

## Testing Checklist

- [ ] Theme page loads: quranhikma.com/theme-reader.html?theme=sexuality-spouses-hur-paradise
- [ ] "Propositions" tab appears in navigation
- [ ] Drill-down expands L2 categories (11 categories visible)
- [ ] L3 subdivisions expand (13 tertiary categories under Sexuality)
- [ ] L4 propositions display with:
  - [ ] Status badge (color-coded: green/blue/amber/red/indigo)
  - [ ] Proposition name
  - [ ] Source reference (e.g., "Tirmidhi 2536")
  - [ ] Hadith grade (e.g., "Hasan")
  - [ ] Quranic base (when applicable)
  - [ ] Scholarly notes
  - [ ] Weak tradition warning (if daif)
- [ ] Legend displays correctly
- [ ] Mobile responsive (touch-friendly)
- [ ] Dark mode support
- [ ] RTL support (if Arabic text present)

---

## Data Structure Example

```json
{
  "id": 1,
  "name": "Sexuality, Spouses & Ḥūr",
  "level": 2,
  "tertiary_count": 13,
  "tertiary": [
    {
      "id": 101,
      "name": "Paradisal Body Transformation",
      "level": 3,
      "proposition_count": 5,
      "propositions": [
        {
          "id": 1001,
          "name": "Transformed Height (60 cubits)",
          "source_status": "explicit_text",
          "reference": "Ibn Majah 4325",
          "hadith_grade": "sahih",
          "quranic_base": "Implicit context in Q36:55-56",
          "scholarly_note": "Classical scholars see bodily transformation as essential paradise context",
          "warning": null,
          "confidence": 0.85
        },
        {
          "id": 1002,
          "name": "Bodily Waste Elimination",
          "source_status": "explicit_text",
          "reference": "Muslim 2838, Tirmidhi 2536",
          "hadith_grade": "sahih",
          "quranic_base": "Q35:33 (purified)",
          "scholarly_note": "Interpreted as theological purity metaphor",
          "confidence": 0.90
        }
      ]
    },
    {
      "id": 102,
      "name": "Sexual Capacity & Potency",
      "proposition_count": 3,
      "propositions": [
        {
          "id": 1101,
          "name": "Strength of 100 Men",
          "source_status": "explicit_text",
          "reference": "Tirmidhi 2536",
          "hadith_grade": "hasan",
          "quranic_base": null,
          "scholarly_note": "Metaphorical or literal capacity debate in tafsir",
          "warning": null,
          "confidence": 0.75
        },
        {
          "id": 1102,
          "name": "Perpetual Virginity Restoration",
          "source_status": "weak_report",
          "reference": "Tirmidhi 2550",
          "hadith_grade": "daif",
          "quranic_base": "No direct Quranic base",
          "scholarly_note": null,
          "warning": "Daif (weak) tradition; Tirmidhi gharib; not in Sahih collections",
          "confidence": 0.40
        }
      ]
    }
  ]
}
```

---

## Files to Deploy

1. **Backend:**
   - `pages/api/propositions/sexuality-hierarchy.js` (or equivalent route)

2. **Frontend:**
   - `components/theme-proposition-drill.jsx` (React component)
   - Updates to `theme-reader.html` (tab navigation + styling + script)

3. **Assets:**
   - `/images/themes/paradise-sexuality.svg` (optional: theme image)

---

## Performance Notes

- Initial load: ~200ms (Supabase query + React render)
- Drill-down expand: ~50ms per level
- 45 proposition nodes total; lazy-load L4 propositions on expand
- Memoize component to prevent unnecessary re-renders

---

## Security Considerations

- ✅ RLS enabled on proposition_hierarchies (read-only anon access)
- ✅ No sensitive data in propositions (only scholarly citations)
- ✅ API endpoint is public GET (no authentication required)
- ✅ User data (saves/highlights) stored separately in user_highlights table

---

## Next Steps

1. **Deploy backend endpoint** → test with curl
2. **Add to theme-reader.html** → test tab navigation
3. **Style & test responsive** → mobile + dark mode
4. **Link to Quranic verses** → integrate verse navigation (Q36:55 → related propositions)
5. **Add sharing** → allow users to share specific propositions on social media

---

## Rollback Plan

If issues arise:
1. Hide propositions tab: Add `display: none` to proposition button CSS
2. Keep theme_analysis entry (no data loss)
3. Revert HTML/JS changes to last stable commit
4. Test with development branch before re-deploying

---

**Status:** ✅ Ready to integrate
**Estimated Integration Time:** 2-3 hours (includes testing + mobile optimization)
