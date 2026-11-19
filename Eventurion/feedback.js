/* Eventurion — Feedback page JavaScript only.
   Character counters, browser validation, API submission and status messages. */
(function () {
  var textareas = document.querySelectorAll('form textarea');
  Array.prototype.forEach.call(textareas, function (textarea) {
    var counter = document.createElement('small');
    counter.className = 'character-count';
    function updateCounter() {
      var max = textarea.maxLength > 0 ? ' / ' + textarea.maxLength : '';
      counter.textContent = textarea.value.length + max + ' characters';
      if (textarea.minLength > 0 && textarea.value.length < textarea.minLength) {
        counter.classList.add('needs-more-text');
      } else {
        counter.classList.remove('needs-more-text');
      }
    }
    textarea.parentNode.appendChild(counter);
    updateCounter();
    textarea.addEventListener('input', updateCounter);
  });

  var forms = document.querySelectorAll('form[data-api-form]');
  Array.prototype.forEach.call(forms, function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var status = form.querySelector('[data-form-status]');
      var button = form.querySelector('button[type="submit"]');
      if (!form.reportValidity()) return;

      var payload = {};
      new FormData(form).forEach(function (value, key) { payload[key] = value; });
      if (status) {
        status.textContent = 'Submitting…';
        status.classList.remove('success', 'error');
      }
      if (button) button.disabled = true;

      fetch(form.getAttribute('data-api-form'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (response) {
        return response.json().then(function (result) {
          if (!response.ok) throw new Error(result.error || 'Submission failed.');
          return result;
        });
      }).then(function (result) {
        if (status) {
          status.textContent = result.message + ' Reference: ' + result.recordId;
          status.classList.add('success');
        }
        form.reset();
        Array.prototype.forEach.call(form.querySelectorAll('textarea'), function (field) {
          var counter = field.parentNode.querySelector('.character-count');
          if (counter) {
            counter.textContent = '0' + (field.maxLength > 0 ? ' / ' + field.maxLength : '') + ' characters';
            counter.classList.remove('needs-more-text');
          }
        });
      }).catch(function (error) {
        if (status) {
          status.textContent = error.message + ' Make sure the Eventurion server is running.';
          status.classList.add('error');
        }
      }).then(function () {
        if (button) button.disabled = false;
      });
    });
  });
})();
