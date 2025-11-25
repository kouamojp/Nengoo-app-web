// Helper function to get correct image URL (supports both local and S3 URLs)
export const getImageUrl = (imageUrl, apiBaseUrl = 'http://localhost:8001') => {
  if (!imageUrl) return '';
  // If it's already a full URL (http or https), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  // Otherwise, it's a local path, prepend API base URL
  return `${apiBaseUrl}${imageUrl}`;
};

// Translations
export const translations = {
  fr: {
    // Header
    search: "Rechercher des produits...",
    categories: "Catégories",
    cart: "Panier",
    profile: "Profil",
    signin: "Se connecter",
    language: "Langue",
    
    // Navigation Categories
    food_drinks: "Aliments et Boissons",
    sports_articles: "Articles Sportifs", 
    handicrafts: "Artisanat et Produits Faits Main",
    electronics: "Électroniques",
    professional_equipment: "Équipements Professionnels",
    toys: "Jouets pour Enfants",
    home_garden: "Maison & Jardinage",
    medical_equipment: "Matériel Médical",
    beauty_care: "Produits de Beauté et Soins Personnels",
    services: "Services",
    clothing_accessories: "Vêtements et Accessoires",
    travel_tickets: "Voyages et Billets",
    
    // Homepage
    welcome: "Bienvenue sur Nengoo",
    subtitle: "Votre marketplace camerounaise de confiance",
    featuredProducts: "Produits en Vedette",
    newArrivals: "Nouvelles Arrivées",
    bestSellers: "Meilleures Ventes",
    localSpecialties: "Spécialités Locales",
    flashSale: "Vente Flash",
    viewAll: "Voir tout",
    
    // Product
    addToCart: "Ajouter au Panier",
    buyNow: "Acheter Maintenant",
    inStock: "En Stock",
    outOfStock: "Rupture de Stock",
    reviews: "Avis",
    rating: "Note",
    specifications: "Spécifications",
    description: "Description",
    
    // Cart
    shoppingCart: "Panier d'Achat",
    quantity: "Quantité",
    price: "Prix",
    total: "Total",
    subtotal: "Sous-total",
    shipping: "Livraison",
    tax: "Taxe",
    checkout: "Commander",
    continueShipping: "Continuer les Achats",
    removeItem: "Supprimer",
    emptyCart: "Votre panier est vide",
    
    // Checkout
    billingInfo: "Informations de Facturation",
    shippingInfo: "Informations de Livraison",
    paymentMethod: "Méthode de Paiement",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Email",
    phone: "Téléphone",
    address: "Adresse",
    city: "Ville",
    region: "Région",
    postalCode: "Code Postal",
    mtnMoney: "MTN Mobile Money",
    orangeMoney: "Orange Money",
    creditCard: "Carte de Crédit",
    cashOnDelivery: "Paiement à la Livraison",
    placeOrder: "Passer Commande",
    
    // Footer
    about: "À Propos",
    contact: "Contact",
    help: "Aide",
    terms: "Conditions",
    privacy: "Confidentialité",
    followUs: "Suivez-nous",
    newsletter: "Newsletter",
    subscribe: "S'abonner",
    footerText: "Nengoo - Votre marketplace camerounaise de confiance depuis 2025",
    
    // Authentication
    login: "Se connecter",
    signup: "S'inscrire",
    loginAsBuyer: "Se connecter en tant que client",
    loginAsSeller: "Se connecter en tant que vendeur",
    buyerLogin: "Connexion client",
    sellerLogin: "Connexion vendeur",
    whatsappNumber: "Numéro WhatsApp",
    enterWhatsApp: "Entrez votre numéro WhatsApp",
    selectCategories: "Sélectionner les catégories",
    businessName: "Nom de l'entreprise",
    selectCity: "Choisir votre ville",
    signupAsSeller: "Inscription Vendeur",
    signupAsBuyer: "Inscription client",
    createAccount: "Créer un compte",
    haveAccount: "Déjà un compte ?",
    noAccount: "Pas de compte ?",
    pendingApproval: "En attente d'approbation",
    approvalMessage: "Votre demande d'inscription en tant que vendeur a été soumise. Vous recevrez une confirmation par WhatsApp une fois votre compte approuvé par l'administrateur.",
    backToHome: "Retour à l'accueil",
    logout: "Se déconnecter",
    welcomeBack: "Bon retour"
  },
  en: {
    // Header
    search: "Search products...",
    categories: "Categories",
    cart: "Cart",
    profile: "Profile",
    signin: "Sign In",
    language: "Language",
    
    // Navigation Categories
    food_drinks: "Food & Drinks",
    sports_articles: "Sports Articles", 
    handicrafts: "Handicrafts & Handmade",
    electronics: "Electronics",
    professional_equipment: "Professional Equipment",
    toys: "Children's Toys",
    home_garden: "Home & Garden",
    medical_equipment: "Medical Equipment",
    beauty_care: "Beauty & Personal Care",
    services: "Services",
    clothing_accessories: "Clothing & Accessories",
    travel_tickets: "Travel & Tickets",
    
    // Homepage
    welcome: "Welcome to Nengoo",
    subtitle: "Your trusted Cameroonian marketplace",
    featuredProducts: "Featured Products",
    newArrivals: "New Arrivals",
    bestSellers: "Best Sellers",
    localSpecialties: "Local Specialties",
    flashSale: "Flash Sale",
    viewAll: "View All",
    
    // Product
    addToCart: "Add to Cart",
    buyNow: "Buy Now",
    inStock: "In Stock",
    outOfStock: "Out of Stock",
    reviews: "Reviews",
    rating: "Rating",
    specifications: "Specifications",
    description: "Description",
    
    // Cart
    shoppingCart: "Shopping Cart",
    quantity: "Quantity",
    price: "Price",
    total: "Total",
    subtotal: "Subtotal",
    shipping: "Shipping",
    tax: "Tax",
    checkout: "Checkout",
    continueShipping: "Continue Shopping",
    removeItem: "Remove",
    emptyCart: "Your cart is empty",
    
    // Checkout
    billingInfo: "Billing Information",
    shippingInfo: "Shipping Information",
    paymentMethod: "Payment Method",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    city: "City",
    region: "Region",
    postalCode: "Postal Code",
    mtnMoney: "MTN Mobile Money",
    orangeMoney: "Orange Money",
    creditCard: "Credit Card",
    cashOnDelivery: "Cash on Delivery",
    placeOrder: "Place Order",
    
    // Footer
    about: "About",
    contact: "Contact",
    help: "Help",
    terms: "Terms",
    privacy: "Privacy",
    followUs: "Follow Us",
    newsletter: "Newsletter",
    subscribe: "Subscribe",
    footerText: "Nengoo - Your trusted Cameroonian marketplace since 2025",
    
    // Authentication
    login: "Sign In",
    signup: "Sign Up",
    loginAsBuyer: "Sign In as Buyer",
    loginAsSeller: "Sign In as Seller",
    buyerLogin: "Buyer Login",
    sellerLogin: "Seller Login",
    whatsappNumber: "WhatsApp Number",
    enterWhatsApp: "Enter your WhatsApp number",
    selectCategories: "Select categories",
    businessName: "Business Name",
    selectCity: "Choose your city",
    signupAsSeller: "Seller Registration",
    signupAsBuyer: "Buyer Registration",
    createAccount: "Create Account",
    haveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    pendingApproval: "Pending Approval",
    approvalMessage: "Your seller registration request has been submitted. You will receive a WhatsApp confirmation once your account is approved by the administrator.",
    backToHome: "Back to Home",
    logout: "Logout",
    welcomeBack: "Welcome Back"
  }
};

// Utility functions for social media and WhatsApp
export const openWhatsApp = (phoneNumber, message = '') => {
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
  window.open(url, '_blank');
};

export const formatPhoneForWhatsApp = (phone) => {
  return phone.replace(/\D/g, '');
};

export const generateProductWhatsAppMessage = (product, language) => {
  return `Bonjour! Je suis intéressé(e) par votre produit "${product.name[language]}" sur Nengoo. Pourriez-vous me donner plus d'informations? Merci!`;
};

// Mock Product Data with seller WhatsApp
export const mockProducts = [
  {
    id: 1,
    name: { fr: "Robe Traditionnelle Camerounaise", en: "Traditional Cameroonian Dress" },
    category: "clothing_accessories",
    price: 45000,
    image: "https://images.pexels.com/photos/21618972/pexels-photo-21618972.jpeg",
    rating: 4.8,
    reviews: 124,
    inStock: true,
    description: {
      fr: "Belle robe traditionnelle camerounaise faite à la main avec des tissus locaux authentiques.",
      en: "Beautiful handmade traditional Cameroonian dress with authentic local fabrics."
    },
    images: [
      "https://images.pexels.com/photos/21618972/pexels-photo-21618972.jpeg",
      "https://images.pexels.com/photos/31964014/pexels-photo-31964014.jpeg"
    ],
    sellerWhatsApp: "+237655123456"
  },
  {
    id: 2,
    name: { fr: "Smartphone Android", en: "Android Smartphone" },
    category: "electronics",
    price: 125000,
    image: "https://images.pexels.com/photos/8475124/pexels-photo-8475124.jpeg",
    rating: 4.5,
    reviews: 89,
    inStock: true,
    description: {
      fr: "Smartphone Android dernière génération avec appareil photo haute résolution.",
      en: "Latest generation Android smartphone with high-resolution camera."
    },
    sellerWhatsApp: "+237655123456"
  },
  {
    id: 3,
    name: { fr: "Panier Artisanal", en: "Handcrafted Basket" },
    category: "home_garden",
    price: 15000,
    image: "https://images.pexels.com/photos/31964014/pexels-photo-31964014.jpeg",
    rating: 4.9,
    reviews: 67,
    inStock: true,
    description: {
      fr: "Panier artisanal traditionnel fabriqué par des artisans locaux camerounais.",
      en: "Traditional handcrafted basket made by local Cameroonian artisans."
    },
    sellerWhatsApp: "+237655123456"
  },
  {
    id: 4,
    name: { fr: "Chapeaux Traditionnels", en: "Traditional Hats" },
    category: "handicrafts",
    price: 8500,
    image: "https://images.pexels.com/photos/16430537/pexels-photo-16430537.jpeg",
    rating: 4.7,
    reviews: 156,
    inStock: true,
    description: {
      fr: "Collection de chapeaux traditionnels camerounais faits à la main.",
      en: "Collection of handmade traditional Cameroonian hats."
    },
    sellerWhatsApp: "+237655123456"
  },
  {
    id: 5,
    name: { fr: "Grains Biologiques", en: "Organic Grains" },
    category: "food_drinks",
    price: 3500,
    image: "https://images.pexels.com/photos/33062138/pexels-photo-33062138.jpeg",
    rating: 4.6,
    reviews: 203,
    inStock: true,
    description: {
      fr: "Grains biologiques de haute qualité cultivés par des agriculteurs locaux.",
      en: "High-quality organic grains grown by local farmers."
    },
    sellerWhatsApp: "+237655123456"
  },
  {
    id: 6,
    name: { fr: "Cosmétiques Naturels", en: "Natural Cosmetics" },
    category: "beauty_care",
    price: 12000,
    image: "https://images.pexels.com/photos/30419070/pexels-photo-30419070.jpeg",
    rating: 4.4,
    reviews: 78,
    inStock: true,
    description: {
      fr: "Cosmétiques naturels à base d'ingrédients africains traditionnels.",
      en: "Natural cosmetics made from traditional African ingredients."
    },
    sellerWhatsApp: "+237655123456"
  },
  {
    id: 7,
    name: { fr: "Vêtements de Mode", en: "Fashion Clothing" },
    category: "clothing_accessories",
    price: 25000,
    image: "https://images.unsplash.com/photo-1550041499-4c5857d2b508",
    rating: 4.3,
    reviews: 92,
    inStock: true,
    description: {
      fr: "Vêtements de mode moderne avec des influences traditionnelles camerounaises.",
      en: "Modern fashion clothing with traditional Cameroonian influences."
    },
    sellerWhatsApp: "+237655123456"
  },
  {
    id: 8,
    name: { fr: "Accessoires de Marché", en: "Market Accessories" },
    category: "handicrafts",
    price: 7500,
    image: "https://images.pexels.com/photos/2014342/pexels-photo-2014342.jpeg",
    rating: 4.5,
    reviews: 134,
    inStock: true,
    description: {
      fr: "Accessoires authentiques du marché local camerounais.",
      en: "Authentic accessories from the local Cameroonian market."
    },
    sellerWhatsApp: "+237655123456"
  },
  {
    id: 9,
    name: { fr: "Produits Alimentaires Bio", en: "Organic Food Products" },
    category: "food_drinks",
    price: 8500,
    image: "https://images.pexels.com/photos/33062138/pexels-photo-33062138.jpeg",
    rating: 4.6,
    reviews: 87,
    inStock: true,
    description: {
      fr: "Produits alimentaires biologiques locaux de haute qualité.",
      en: "High-quality local organic food products."
    },
    sellerWhatsApp: "+237655123456"
  },
  {
    id: 10,
    name: { fr: "Équipement Sportif", en: "Sports Equipment" },
    category: "sports_articles",
    price: 35000,
    image: "https://images.pexels.com/photos/163452/basketball-dunk-blue-game-163452.jpeg",
    rating: 4.4,
    reviews: 56,
    inStock: true,
    description: {
      fr: "Équipement sportif de qualité pour tous les sports.",
      en: "Quality sports equipment for all sports."
    },
    sellerWhatsApp: "+237655123456"
  },
  {
    id: 11,
    name: { fr: "Jouets Éducatifs", en: "Educational Toys" },
    category: "toys",
    price: 15000,
    image: "https://images.pexels.com/photos/163028/lego-build-blocks-bricks-163028.jpeg",
    rating: 4.8,
    reviews: 124,
    inStock: true,
    description: {
      fr: "Jouets éducatifs pour le développement des enfants.",
      en: "Educational toys for children's development."
    },
    sellerWhatsApp: "+237655123456"
  },
  {
    id: 12,
    name: { fr: "Services de Livraison", en: "Delivery Services" },
    category: "services",
    price: 5000,
    image: "https://images.pexels.com/photos/4391470/pexels-photo-4391470.jpeg",
    rating: 4.2,
    reviews: 201,
    inStock: true,
    description: {
      fr: "Services de livraison rapide et fiable dans toute la ville.",
      en: "Fast and reliable delivery services throughout the city."
    },
    sellerWhatsApp: "+237655123456"
  }
];

// Mock Seller Data
export const mockSellerData = {
  profile: {
    name: "Boutique Afrique",
    email: "boutique@afrique.cm",
    phone: "+237 6XX XXX XXX",
    whatsapp: "+237655123456",
    address: "Douala, Cameroun",
    logo: "https://images.pexels.com/photos/16430537/pexels-photo-16430537.jpeg",
    description: "Spécialiste en produits traditionnels camerounais",
    rating: 4.8,
    totalSales: 1250,
    joinDate: "2024-01-15",
    socialMedia: {
      whatsapp: "+237655123456",
      facebook: "https://facebook.com/boutique.afrique.cm",
      instagram: "https://instagram.com/boutique_afrique",
      telegram: "https://t.me/boutiqueafrique"
    }
  },
  orders: [
    {
      id: "CMD001",
      customer: "Marie Nkomo",
      date: "2025-07-22",
      status: "pending",
      total: 45000,
      items: [
        { name: "Robe Traditionnelle", quantity: 1, price: 45000 }
      ]
    },
    {
      id: "CMD002", 
      customer: "Jean Baptiste",
      date: "2025-07-21",
      status: "shipped",
      total: 23500,
      items: [
        { name: "Panier Artisanal", quantity: 2, price: 15000 },
        { name: "Chapeaux Traditionnels", quantity: 1, price: 8500 }
      ]
    },
    {
      id: "CMD003",
      customer: "Aminata Sow",
      date: "2025-07-20", 
      status: "delivered",
      total: 12000,
      items: [
        { name: "Cosmétiques Naturels", quantity: 1, price: 12000 }
      ]
    }
  ],
  messages: [
    {
      id: 1,
      from: "Marie Nkomo",
      subject: "Question sur la taille",
      message: "Bonjour, pourriez-vous me confirmer les tailles disponibles pour la robe traditionnelle?",
      date: "2025-07-22",
      read: false
    },
    {
      id: 2,
      from: "Jean Baptiste", 
      subject: "Suivi de commande",
      message: "Bonjour, pouvez-vous me donner des nouvelles de ma commande CMD002?",
      date: "2025-07-21",
      read: true
    }
  ],
  pickupPoints: [
    {
      id: 1,
      name: "Nengoo Point Douala Centre",
      address: "Avenue de la Liberté, Douala",
      phone: "+237 233 456 789",
      hours: "Lun-Sam: 8h-18h",
      city: "Douala"
    },
    {
      id: 2,
      name: "Nengoo Point Yaoundé Mvan",
      address: "Quartier Mvan, Yaoundé",
      phone: "+237 222 345 678",
      hours: "Lun-Sam: 8h-18h",
      city: "Yaoundé"
    },
    {
      id: 3,
      name: "Nengoo Point Bafoussam",
      address: "Marché Central, Bafoussam",
      phone: "+237 233 567 890",
      hours: "Lun-Sam: 7h-17h",
      city: "Bafoussam"
    },
    {
      id: 4,
      name: "Nengoo Point Garoua",
      address: "Quartier Plateau, Garoua",
      phone: "+237 222 678 901",
      hours: "Lun-Sam: 8h-17h",
      city: "Garoua"
    }
  ]
};

// Mock Authentication Data
export const mockUsers = {
  buyers: [
    {
      id: 1,
      whatsapp: "+237655123456",
      name: "Marie Kouam",
      joinDate: "2025-01-10",
      type: "buyer"
    }
  ],
  sellers: [
    {
      id: 1,
      whatsapp: "+237655123456",
      name: "Jean Baptiste",
      businessName: "Boutique Afrique",
      email: "boutique@afrique.cm",
      city: "Douala",
      categories: ["clothing_accessories", "handicrafts"],
      status: "approved",
      joinDate: "2024-01-15",
      type: "seller"
    }
  ],
  pendingSellers: [
    {
      id: 2,
      whatsapp: "+237655987654",
      name: "Aminata Sow",
      businessName: "Artisanat Cameroun",
      email: "artisanat@cameroun.cm",
      city: "Yaoundé",
      categories: ["handicrafts", "home_garden"],
      status: "pending",
      submitDate: "2025-07-22",
      type: "seller"
    }
  ]
};

export const cameroonCities = [
  "Douala", "Yaoundé", "Bafoussam", "Garoua", "Maroua", "Bamenda", 
  "Ngaoundéré", "Bertoua", "Ebolowa", "Kumba", "Limbe", "Dschang"
];
