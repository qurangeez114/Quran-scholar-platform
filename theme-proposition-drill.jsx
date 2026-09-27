import React, { useState, useEffect } from 'react';

export default function ThemePropositionDrill({ themeId, themeName }) {
  const [hierarchies, setHierarchies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState([]);
  const [expandedL3, setExpandedL3] = useState(null);

  useEffect(() => {
    fetchPropositions();
  }, [themeId]);

  const fetchPropositions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/.netlify/functions/propositions-sexuality-hierarchy?theme_id=${themeId}`
      );
      const data = await response.json();
      setHierarchies(data);
    } catch (error) {
      console.error('Error fetching propositions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceBadge = (sourceStatus) => {
    const badges = {
      explicit_text: { emoji: '✅', label: 'Explicit', color: '#4CAF50' },
      inferred_interpretation: { emoji: '📖', label: 'Inferred', color: '#2196F3' },
      disputed_interpretation: { emoji: '⚖️', label: 'Disputed', color: '#FF9800' },
      weak_report: { emoji: '⚠️', label: 'Weak', color: '#F44336' },
      scholarly_consensus: { emoji: '🤝', label: 'Consensus', color: '#9C27B0' }
    };
    const badge = badges[sourceStatus] || badges.scholarly_consensus;
    return (
      <span
        style={{
          display: 'inline-block',
          marginLeft: '8px',
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: badge.color + '20',
          color: badge.color,
          fontSize: '0.85rem',
          fontWeight: 'bold'
        }}
        title={badge.label}
      >
        {badge.emoji} {badge.label}
      </span>
    );
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading propositions...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2>{themeName}</h2>
      
      <div style={{ marginBottom: '20px' }}>
        {hierarchies.map((l2, l2Idx) => (
          <div key={l2Idx} style={{ marginBottom: '16px', borderLeft: '3px solid #2196F3', paddingLeft: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1976D2' }}>{l2.level2_name}</h3>
            
            {l2.level3_items && l2.level3_items.map((l3, l3Idx) => (
              <div key={l3Idx} style={{ marginBottom: '12px' }}>
                <div
                  onClick={() => setExpandedL3(expandedL3 === `${l2Idx}-${l3Idx}` ? null : `${l2Idx}-${l3Idx}`)}
                  style={{
                    cursor: 'pointer',
                    padding: '10px',
                    backgroundColor: expandedL3 === `${l2Idx}-${l3Idx}` ? '#E3F2FD' : '#F5F5F5',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: '500', color: '#424242' }}>
                    {expandedL3 === `${l2Idx}-${l3Idx}` ? '▼' : '▶'} {l3.level3_name}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#999' }}>
                    {l3.propositions ? l3.propositions.length : 0} proposition(s)
                  </span>
                </div>

                {expandedL3 === `${l2Idx}-${l3Idx}` && l3.propositions && (
                  <div style={{ marginTop: '8px', paddingLeft: '12px' }}>
                    {l3.propositions.map((prop, propIdx) => (
                      <div
                        key={propIdx}
                        style={{
                          marginBottom: '12px',
                          padding: '12px',
                          backgroundColor: '#FAFAFA',
                          borderRadius: '4px',
                          borderLeft: '2px solid #9C27B0'
                        }}
                      >
                        <div style={{ fontWeight: '500', color: '#212121', marginBottom: '6px' }}>
                          {prop.proposition_text}
                          {getSourceBadge(prop.source_status)}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.5' }}>
                          {prop.description}
                        </div>
                        {prop.quranic_anchors && prop.quranic_anchors.length > 0 && (
                          <div style={{ fontSize: '0.85rem', color: '#1976D2', marginTop: '8px' }}>
                            <strong>Quranic:</strong> {prop.quranic_anchors.join(', ')}
                          </div>
                        )}
                        {prop.hadith_references && prop.hadith_references.length > 0 && (
                          <div style={{ fontSize: '0.85rem', color: '#D32F2F', marginTop: '4px' }}>
                            <strong>Hadith:</strong> {prop.hadith_references.join(', ')}
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
      </div>
    </div>
  );
}
