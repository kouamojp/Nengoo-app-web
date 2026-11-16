import { shareLinks } from './ShareButtons';

test('liens de partage : texte et adresse encodés pour chaque réseau', () => {
  const url = 'https://www.nengoo.com/product/robe-longue-fleurie';
  const links = shareLinks(url, 'Robe longue & fleurie – 15 000 FCFA sur Nengoo');
  expect(links.whatsapp).toBe(
    'https://api.whatsapp.com/send?text=Robe%20longue%20%26%20fleurie%20%E2%80%93%2015%20000%20FCFA%20sur%20Nengoo%20https%3A%2F%2Fwww.nengoo.com%2Fproduct%2Frobe-longue-fleurie',
  );
  expect(links.facebook).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.nengoo.com%2Fproduct%2Frobe-longue-fleurie');
  expect(links.telegram).toContain('https://t.me/share/url?url=https%3A%2F%2Fwww.nengoo.com');
  expect(links.telegram).toContain('&text=Robe%20longue%20%26%20fleurie');
  expect(links.x).toContain('https://x.com/intent/post?url=');
});
