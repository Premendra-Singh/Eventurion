/*
  Eventurion — Ancient India page interactions
  This file belongs only to ancient.html.
  Features: dynamic card search, result count, no-results message,
  detail-link generation, and card selection using DOM events.
*/
(function () {
  var cardsContainer = document.querySelector('.cards');
  if (!cardsContainer) return;

  var cards = Array.prototype.slice.call(
    cardsContainer.querySelectorAll('.card')
  );
  if (cards.length === 0) return;

  // Build the search controls dynamically with DOM methods.
  var toolbar = document.createElement('div');
  toolbar.className = 'dom-card-tools';

  var searchLabel = document.createElement('label');
  searchLabel.textContent = 'Find a civilization or event';
  searchLabel.setAttribute('for', 'ancient-card-search');

  var searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.id = 'ancient-card-search';
  searchInput.placeholder = 'Search historical cards...';
  searchInput.setAttribute('aria-label', 'Search historical cards');

  var resultCount = document.createElement('span');
  resultCount.className = 'dom-result-count';

  toolbar.appendChild(searchLabel);
  toolbar.appendChild(searchInput);
  toolbar.appendChild(resultCount);
  cardsContainer.parentNode.insertBefore(toolbar, cardsContainer);

  // Generate detail-page URLs using data from this page's cards.
  cards.forEach(function (card) {
    var link = card.querySelector('a');
    var heading = card.querySelector('h3');
    var paragraph = card.querySelector('.card-content p');
    var date = card.querySelector('.date');
    var image = card.querySelector('img');

    if (link && heading) {
      var params = new URLSearchParams();
      params.set('title', heading.textContent.replace(/\n/g, ' ').trim());
      params.set('description', paragraph ? paragraph.textContent : '');
      params.set('date', date ? date.textContent : '');
      params.set('img', image ? image.getAttribute('src') : '');
      params.set('era', 'Ancient');
      link.setAttribute('href', 'detail.html?' + params.toString());
    }
  });

  var emptyMessage = null;
  function filterCards() {
    var term = searchInput.value.trim().toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var matches = card.textContent.toLowerCase().indexOf(term) !== -1;
      card.hidden = !matches;
      if (matches) visible++;
    });

    resultCount.textContent = visible + ' historical ' +
      (visible === 1 ? 'entry' : 'entries');

    if (visible === 0 && !emptyMessage) {
      emptyMessage = document.createElement('p');
      emptyMessage.className = 'search-empty';
      emptyMessage.textContent = 'No historical entries match your search. Try another keyword.';
      cardsContainer.appendChild(emptyMessage);
    } else if (visible > 0 && emptyMessage) {
      emptyMessage.remove();
      emptyMessage = null;
    }
  }

  searchInput.addEventListener('input', filterCards);
  filterCards();

  // Event delegation: handle card selection from the parent container.
  cardsContainer.addEventListener('click', function (event) {
    if (event.target.closest('a')) return;
    var clickedCard = event.target.closest('.card');
    if (clickedCard && !clickedCard.hidden) {
      clickedCard.classList.toggle('card-selected');
    }
  });
})();
