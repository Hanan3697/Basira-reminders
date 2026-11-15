(() => {
  const cards = Array.from(document.querySelectorAll('.message-item'));
  const result = document.getElementById('message-result');
  let remaining = [];
  let previous;

  function refill() {
    remaining = cards.slice();
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    const last = remaining.length - 1;
    if (remaining[last] === previous && last > 0) {
      [remaining[0], remaining[last]] = [remaining[last], remaining[0]];
    }
  }

  function drawMessage() {
    if (!remaining.length) refill();
    previous = remaining.pop();
    result.replaceChildren(previous.content.cloneNode(true));
  }

  document.getElementById('draw-message').addEventListener('click', drawMessage);
  drawMessage();
})();
