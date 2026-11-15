const need = document.querySelector('#need');
const prophet = document.querySelector('#prophet');
const cards = document.querySelectorAll('.dua');
function filterPrayers() {
  const view = document.querySelector('input[name="view"]:checked').value;
  let count = 0;
  for (const card of cards) {
    card.hidden = Boolean(card.dataset.view !== view || (need.value && need.value !== card.dataset.need) ||
                          (prophet.value && prophet.value !== card.dataset.prophet));
    if (card.hidden) card.open = false;
    else count++;
  }
  document.querySelector('#matches').textContent = count
    ? 'عدد المواضع: ' + count.toLocaleString('ar-EG')
    : 'ما فيه نتيجة لهذا الاختيار. جرّب تغيير الحاجة أو اسم النبي.';
}
function syncFilters() {
  const view = document.querySelector('input[name="view"]:checked').value;
  for (const [select, key] of [[need, 'need'], [prophet, 'prophet']]) {
    const available = new Set(Array.from(cards).filter(card => card.dataset.view === view).map(card => card.dataset[key]));
    for (const option of select.options) option.hidden = Boolean(option.value && !available.has(option.value));
    if (select.selectedOptions[0].hidden) select.value = '';
  }
  filterPrayers();
}
for (const input of document.querySelectorAll('input[name="view"]')) {
  input.addEventListener('change', () => {
    need.value = '';
    prophet.value = '';
    syncFilters();
  });
}
need.addEventListener('change', filterPrayers);
prophet.addEventListener('change', filterPrayers);
syncFilters();
