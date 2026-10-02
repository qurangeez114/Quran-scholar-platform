/* Qur’an Scholar — ElevenLabs site-wide voice and text widget.
   This file is loaded by the platform's content pages, so one integration
   makes the assistant available throughout Quranhikma. */
(function () {
  'use strict';

  var AGENT_ID = 'agent_6101m3wy1cybe3wvm0416kkm5f9m';
  var WIDGET_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed';

  function mountWidget() {
    if (document.querySelector('elevenlabs-convai[data-quranhikma-agent]')) return;

    var widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', AGENT_ID);
    widget.setAttribute('variant', 'full');
    widget.setAttribute('dismissible', 'true');
    widget.setAttribute('data-quranhikma-agent', 'true');
    document.body.appendChild(widget);
  }

  function loadWidget() {
    if (window.customElements && customElements.get('elevenlabs-convai')) {
      mountWidget();
      return;
    }

    var existing = document.querySelector('script[data-quranhikma-elevenlabs]');
    if (existing) {
      existing.addEventListener('load', mountWidget, { once: true });
      return;
    }

    var script = document.createElement('script');
    script.src = WIDGET_SRC;
    script.async = true;
    script.type = 'text/javascript';
    script.setAttribute('data-quranhikma-elevenlabs', 'true');
    script.addEventListener('load', mountWidget, { once: true });
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWidget, { once: true });
  } else {
    loadWidget();
  }
})();