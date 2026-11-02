// Hiérarchie des catégories : une catégorie principale peut avoir des
// sous-catégories (champ parentId, un seul niveau). Un produit est rangé dans
// l'une ou l'autre ; une catégorie principale montre aussi les produits de ses
// sous-catégories.

// Ordre choisi dans l'administration, puis ordre alphabétique
const byOrder = (a, b) =>
  (a.order || 0) - (b.order || 0) || (a.name || '').localeCompare(b.name || '', 'fr');

export const topLevelCategories = (categories) =>
  categories.filter((c) => !c.parentId).sort(byOrder);

export const subcategoriesOf = (categories, id) =>
  categories.filter((c) => c.parentId === id).sort(byOrder);

/** Nom affiché : anglais quand il existe et que le site est en anglais. */
export const categoryName = (category, language) =>
  (language === 'en' && category?.nameEn) || category?.name || '';

/** Comparaison de noms sans accents, majuscules, ponctuation ni « s » final
 * (même règle que le serveur). */
export const normalizeCategoryName = (name) =>
  (name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ');

/**
 * Catégorie désignée par un nom d'URL (/catalog/<nom>) : nom exact, nom
 * approchant (accents, pluriel), ou ancien nom d'une catégorie renommée.
 */
export const findCategoryByName = (categories, name) => {
  if (!name) return undefined;
  const exact = categories.find((c) => c.name === name);
  if (exact) return exact;
  const wanted = normalizeCategoryName(name);
  return (
    categories.find((c) => normalizeCategoryName(c.name) === wanted) ||
    categories.find((c) => (c.formerNames || []).some((n) => normalizeCategoryName(n) === wanted))
  );
};

/** La catégorie et ses sous-catégories. */
export const categoryFamilyIds = (categories, id) => [
  id,
  ...subcategoriesOf(categories, id).map((c) => c.id),
];

/** « Mode › Robes » pour une sous-catégorie, « Mode » sinon. */
export const categoryPath = (categories, id, language) => {
  const category = categories.find((c) => c.id === id);
  if (!category) return '';
  const parent = category.parentId && categories.find((c) => c.id === category.parentId);
  return parent
    ? `${categoryName(parent, language)} › ${categoryName(category, language)}`
    : categoryName(category, language);
};

/**
 * Options d'une liste déroulante : chaque catégorie principale suivie de ses
 * sous-catégories. Les sous-catégories dont le parent a disparu restent
 * proposées, à la fin.
 */
export const categorySelectOptions = (categories) => {
  const options = [];
  topLevelCategories(categories).forEach((parent) => {
    options.push({ id: parent.id, label: parent.name, isSub: false });
    subcategoriesOf(categories, parent.id).forEach((child) =>
      options.push({ id: child.id, label: `${parent.name} › ${child.name}`, isSub: true })
    );
  });
  const listed = new Set(options.map((o) => o.id));
  categories
    .filter((c) => !listed.has(c.id))
    .sort(byOrder)
    .forEach((c) => options.push({ id: c.id, label: c.name, isSub: true }));
  return options;
};
