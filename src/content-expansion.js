import './content-expansion.css';

const accordionGroups = document.querySelectorAll('[data-accordion]');

accordionGroups.forEach(group => {
  const items = [...group.querySelectorAll(':scope > details')];

  items.forEach(item => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;

      items.forEach(otherItem => {
        if (otherItem !== item && otherItem.open) {
          otherItem.open = false;
        }
      });
    });
  });
});
