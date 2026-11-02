// Hiérarchie des catégories : une catégorie principale peut avoir des
// sous-catégories (champ parentId, un seul niveau). Un produit est rangé dans
// l'une ou l'autre ; une catégorie principale montre aussi les produits de ses
// sous-catégories.

const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'fr');

export const topLevelCategories = (categories) =>
  categories.filter((c) => !c.parentId).sort(byName);

export const subcategoriesOf = (categories, id) =>
  categories.filter((c) => c.parentId === id).sort(byName);

/** La catégorie et ses sous-catégories. */
export const categoryFamilyIds = (categories, id) => [
  id,
  ...subcategoriesOf(categories, id).map((c) => c.id),
];

/** « Mode › Robes » pour une sous-catégorie, « Mode » sinon. */
export const categoryPath = (categories, id) => {
  const category = categories.find((c) => c.id === id);
  if (!category) return '';
  const parent = category.parentId && categories.find((c) => c.id === category.parentId);
  return parent ? `${parent.name} › ${category.name}` : category.name;
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
    .sort(byName)
    .forEach((c) => options.push({ id: c.id, label: c.name, isSub: true }));
  return options;
};
