import React, { useState, useEffect } from 'react';

// Source status badge components
const StatusBadge = ({ status }) => {
  const badges = {
    explicit_text: { emoji: '✅', label: 'Explicit Quranic Text', color: '#10b981' },
    inferred_interpretation: { emoji: '📖', label: 'Inferred from Tafsir', color: '#3b82f6' },
    disputed_interpretation: { emoji: '⚖️', label: 'Disputed', color: '#f59e0b' },
    weak_report: { emoji: '⚠️', label: 'Weak Hadith (Daif)', color: '#ef4444' },
    scholarly_consensus: { emoji: '🤝', label: 'Later Scholarship', color: '#6366f1' }
  };
  
  const badge = badges[status] || badges.inferred_interpretation;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: badge.color,
        color: '#fff',
        fontSize: '0.85rem',
        marginRight: '6px',
        title: badge.label
      }}
    >
      {badge.emoji}
    </span>
  );
};

// Drill-down hierarchy component
export function ThemePropositionDrill() {
  const [propositions, setPropositions] = useState([]);
  const [expandedL2, setExpandedL2] = useState(null);
  const [expandedL3, setExpandedL3] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch proposition hierarchy from Supabase
    fetchPropositions();
  }, []);

  const fetchPropositions = async () => {
    try {
      const response = await fetch('/api/propositions/sexuality-hierarchy');
      const data = await response.json();
      setPropositions(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching propositions:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading proposition hierarchy...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h2>Sexuality, Spouses & Ḥūr in Paradise</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Explore the hierarchical taxonomy of paradise rewards with source authenticity tracking.
        Click to expand each category.
      </p>

      {propositions.map((level2) => (
        <div key={level2.id} style={{ marginBottom: '16px', borderLeft: '3px solid #d4af37', paddingLeft: '16px' }}>
          {/* Level 2: Major Categories */}
          <div
            onClick={() => setExpandedL2(expandedL2 === level2.id ? null : level2.id)}
            style={{
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              userSelect: 'none'
            }}
          >
            <span>{expandedL2 === level2.id ? '▼' : '▶'}</span>
            {level2.name}
            <span style={{ fontSize: '0.85rem', color: '#999', marginLeft: 'auto' }}>
              {level2.tertiary_count} subtopics
            </span>
          </div>

          {/* Level 3: Tertiary Subdivisions */}
          {expandedL2 === level2.id && level2.tertiary.map((level3) => (
            <div key={level3.id} style={{ marginTop: '12px', marginLeft: '24px' }}>
              <div
                onClick={() => setExpandedL3(expandedL3 === level3.id ? null : level3.id)}
                style={{
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  userSelect: 'none'
                }}
              >
                <span>{expandedL3 === level3.id ? '▼' : '▶'}</span>
                {level3.name}
                <span style={{ fontSize: '0.85rem', color: '#999', marginLeft: 'auto' }}>
                  {level3.proposition_count} propositions
                </span>
              </div>

              {/* Level 4: Individual Propositions */}
              {expandedL3 === level3.id && (
                <div style={{ marginTop: '12px', marginLeft: '36px' }}>
                  {level3.propositions.map((prop) => (
                    <div
                      key={prop.id}
                      style={{
                        padding: '12px',
                        marginBottom: '10px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        borderLeft: '3px solid #9ca3af'
                      }}
                    >
                      {/* Proposition Statement */}
                      <div style={{ marginBottom: '8px' }}>
                        <StatusBadge status={prop.source_status} />
                        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#1f2937' }}>
                          {prop.name}
                        </span>
                      </div>

                      {/* Source Reference */}
                      {prop.reference && (
                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '6px' }}>
                          <strong>Source:</strong> {prop.reference}
                          {prop.hadith_grade && (
                            <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>
                              ({prop.hadith_grade})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Quranic Base */}
                      {prop.quranic_base && (
                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '6px' }}>
                          <strong>Quranic Base:</strong> {prop.quranic_base}
                        </div>
                      )}

                      {/* Scholarly Notes */}
                      {prop.scholarly_note && (
                        <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>
                          💭 {prop.scholarly_note}
                        </div>
                      )}

                      {/* Weak Tradition Warning */}
                      {prop.source_status === 'weak_report' && prop.warning && (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: '#d97706',
                            marginTop: '8px',
                            padding: '6px',
                            backgroundColor: '#fef3c7',
                            borderRadius: '4px'
                          }}
                        >
                          ⚠️ {prop.warning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Source Status Legend */}
      <div style={{ marginTop: '40px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
        <h3>Source Authenticity Legend</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          <div><StatusBadge status="explicit_text" /> = Directly stated in Sahih hadith</div>
          <div><StatusBadge status="inferred_interpretation" /> = Inferred by classical Tafsir scholars</div>
          <div><StatusBadge status="disputed_interpretation" /> = Multiple scholarly interpretations</div>
          <div><StatusBadge status="weak_report" /> = Daif (weak) hadith tradition</div>
          <div><StatusBadge status="scholarly_consensus" /> = Later Islamic scholarship consensus</div>
        </div>
      </div>
    </div>
  );
}

export default ThemePropositionDrill;
