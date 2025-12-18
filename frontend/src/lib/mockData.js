
export const mockProducts = [];

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

export const mockUsers = {
  buyers: [
    {
      id: 1,
      whatsapp: "+237655123456",
      password: "123456", // En production, sera hashé avec bcrypt
      name: "Marie Kouam",
      email: "marie.kouam@example.com",
      joinDate: "2025-01-10",
      type: "buyer",
      passwordResetRequired: false,
      lastPasswordChange: "2025-01-10",
      loginAttempts: 0,
      accountLocked: false
    }
  ],
  sellers: [
    {
      id: 1,
      whatsapp: "+237655123456",
      password: "seller123", // En production, sera hashé avec bcrypt
      name: "Jean Baptiste",
      businessName: "Boutique Afrique",
      email: "boutique@afrique.cm",
      city: "Douala",
      categories: ["clothing_accessories", "handicrafts"],
      status: "approved",
      joinDate: "2024-01-15",
      type: "seller",
      passwordResetRequired: false,
      lastPasswordChange: "2024-01-15",
      loginAttempts: 0,
      accountLocked: false
    }
  ],
  pendingSellers: [
    {
      id: 2,
      whatsapp: "+237655987654",
      password: "pending123",
      name: "Aminata Sow",
      businessName: "Artisanat Cameroun",
      email: "artisanat@cameroun.cm",
      city: "Yaoundé",
      categories: ["handicrafts", "home_garden"],
      status: "pending",
      submitDate: "2025-07-22",
      type: "seller",
      passwordResetRequired: false,
      lastPasswordChange: "2025-07-22",
      loginAttempts: 0,
      accountLocked: false
    }
  ]
};

export const cameroonCities = [
  "Douala", "Yaoundé", "Bafoussam", "Garoua", "Maroua", "Bamenda", 
  "Ngaoundéré", "Bertoua", "Ebolowa", "Kumba", "Limbe", "Dschang"
];

export const mockPickupPoints = {
  approved: [
    {
      id: 'pickup_001',
      name: 'Nengoo Point Douala Centre',
      address: 'Avenue de la Liberté, Akwa',
      city: 'Douala',
      region: 'Littoral',
      managerId: 'manager_001',
      managerName: 'Jean Mbarga',
      managerWhatsApp: '+237655888999',
      managerEmail: 'jean.mbarga@nengoo.cm',
      phone: '+237 233 456 789',
      email: 'douala.centre@nengoo.cm',
      capacity: 100,
      currentLoad: 25,
      hours: 'Lun-Sam: 8h-18h, Dim: Fermé',
      description: 'Point de retrait principal situé au centre ville de Douala',
      status: 'approved',
      verified: true,
      totalOrders: 450,
      activeOrders: 25,
      rating: 4.7,
      reviewsCount: 120,
      createdDate: '2025-01-01',
      approvedDate: '2025-01-02'
    },
    {
      id: 'pickup_002',
      name: 'Nengoo Point Yaoundé Mvan',
      address: 'Quartier Mvan, près du marché',
      city: 'Yaoundé',
      region: 'Centre',
      managerId: 'manager_002',
      managerName: 'Marie Essomba',
      managerWhatsApp: '+237699777888',
      managerEmail: 'marie.essomba@nengoo.cm',
      phone: '+237 222 345 678',
      email: 'yaounde.mvan@nengoo.cm',
      capacity: 80,
      currentLoad: 18,
      hours: 'Lun-Sam: 8h-18h',
      description: 'Point de retrait situé au quartier Mvan',
      status: 'approved',
      verified: true,
      totalOrders: 320,
      activeOrders: 18,
      rating: 4.5,
      reviewsCount: 85,
      createdDate: '2025-01-05',
      approvedDate: '2025-01-06'
    },
    {
      id: 'pickup_003',
      name: 'Nengoo Point Bafoussam',
      address: 'Centre Commercial, Bafoussam',
      city: 'Bafoussam',
      region: 'Ouest',
      managerId: 'manager_003',
      managerName: 'Paul Kamga',
      managerWhatsApp: '+237677666555',
      managerEmail: 'paul.kamga@nengoo.cm',
      phone: '+237 233 567 890',
      email: 'bafoussam@nengoo.cm',
      capacity: 60,
      currentLoad: 12,
      hours: 'Lun-Sam: 9h-17h',
      description: 'Point de retrait au centre commercial de Bafoussam',
      status: 'approved',
      verified: true,
      totalOrders: 180,
      activeOrders: 12,
      rating: 4.8,
      reviewsCount: 52,
      createdDate: '2025-01-10',
      approvedDate: '2025-01-11'
    }
  ],
  pending: [
    {
      id: 'pickup_004',
      name: 'Nengoo Point Garoua',
      address: 'Quartier Commercial, Garoua',
      city: 'Garoua',
      region: 'Nord',
      managerId: 'manager_004',
      managerName: 'Ahmadou Bello',
      managerWhatsApp: '+237655444333',
      managerEmail: 'ahmadou.bello@nengoo.cm',
      phone: '+237 222 678 901',
      email: 'garoua@nengoo.cm',
      capacity: 50,
      currentLoad: 0,
      hours: 'Lun-Sam: 8h-17h',
      description: 'Nouveau point de retrait à Garoua',
      status: 'pending',
      verified: false,
      totalOrders: 0,
      activeOrders: 0,
      rating: 0,
      reviewsCount: 0,
      createdDate: '2025-01-25',
      approvedDate: null
    },
    {
      id: 'pickup_005',
      name: 'Nengoo Point Limbe',
      address: 'Down Beach, Limbe',
      city: 'Limbe',
      region: 'Sud-Ouest',
      managerId: 'manager_005',
      managerName: 'Grace Njoh',
      managerWhatsApp: '+237688555444',
      managerEmail: 'grace.njoh@nengoo.cm',
      phone: '+237 233 789 012',
      email: 'limbe@nengoo.cm',
      capacity: 40,
      currentLoad: 0,
      hours: 'Lun-Ven: 9h-17h',
      description: 'Point de retrait à Limbe, près de la plage',
      status: 'pending',
      verified: false,
      totalOrders: 0,
      activeOrders: 0,
      rating: 0,
      reviewsCount: 0,
      createdDate: '2025-01-26',
      approvedDate: null
    }
  ]
};

export const mockPickupManagers = [
  {
    id: 'manager_001',
    name: 'Jean Mbarga',
    whatsapp: '+237655888999',
    email: 'jean.mbarga@nengoo.cm',
    pickupPointId: 'pickup_001',
    pickupPointName: 'Nengoo Point Douala Centre',
    idCard: 'CM-DLA-123456',
    photo: null,
    address: 'Quartier Bonanjo, Douala',
    type: 'pickup_manager',
    role: 'manager',
    canApproveOrders: true,
    canContactCustomers: true,
    canModifyInventory: true,
    status: 'active',
    verified: true,
    ordersProcessed: 450,
    performanceRating: 4.8,
    joinDate: '2025-01-01',
    lastLogin: '2025-01-28 09:30'
  },
  {
    id: 'manager_002',
    name: 'Marie Essomba',
    whatsapp: '+237699777888',
    email: 'marie.essomba@nengoo.cm',
    pickupPointId: 'pickup_002',
    pickupPointName: 'Nengoo Point Yaoundé Mvan',
    idCard: 'CM-YDE-234567',
    photo: null,
    address: 'Quartier Mvan, Yaoundé',
    type: 'pickup_manager',
    role: 'manager',
    canApproveOrders: true,
    canContactCustomers: true,
    canModifyInventory: true,
    status: 'active',
    verified: true,
    ordersProcessed: 320,
    performanceRating: 4.6,
    joinDate: '2025-01-05',
    lastLogin: '2025-01-28 08:15'
  },
  {
    id: 'manager_003',
    name: 'Paul Kamga',
    whatsapp: '+237677666555',
    email: 'paul.kamga@nengoo.cm',
    pickupPointId: 'pickup_003',
    pickupPointName: 'Nengoo Point Bafoussam',
    idCard: 'CM-BFS-345678',
    photo: null,
    address: 'Centre ville, Bafoussam',
    type: 'pickup_manager',
    role: 'manager',
    canApproveOrders: true,
    canContactCustomers: true,
    canModifyInventory: true,
    status: 'active',
    verified: true,
    ordersProcessed: 180,
    performanceRating: 4.9,
    joinDate: '2025-01-10',
    lastLogin: '2025-01-28 07:45'
  },
  {
    id: 'manager_004',
    name: 'Ahmadou Bello',
    whatsapp: '+237655444333',
    email: 'ahmadou.bello@nengoo.cm',
    pickupPointId: 'pickup_004',
    pickupPointName: 'Nengoo Point Garoua',
    idCard: 'CM-GRA-456789',
    photo: null,
    address: 'Quartier Commercial, Garoua',
    type: 'pickup_manager',
    role: 'manager',
    canApproveOrders: true,
    canContactCustomers: true,
    canModifyInventory: true,
    status: 'pending',
    verified: false,
    ordersProcessed: 0,
    performanceRating: 0,
    joinDate: '2025-01-25',
    lastLogin: null
  }
];

export const adminMockData = {
  // Numéro WhatsApp admin et code d'accès
  adminCredentials: {
    whatsapp: '+237600000000',
    accessCode: 'ADMIN2025'
  },
  
  // Statistiques globales
  stats: {
    totalUsers: 1250,
    totalSellers: 45,
    totalProducts: 389,
    totalOrders: 567,
    totalRevenue: 45680000,
    pendingSellers: 12,
    activeOrders: 34
  },
  
  // Liste des acheteurs
  buyers: [
    { id: 1, name: 'Marie Kouam', whatsapp: '+237655123456', joinDate: '2025-01-10', orders: 5, spent: 245000, status: 'active' },
    { id: 2, name: 'Jean Mbarga', whatsapp: '+237699234567', joinDate: '2025-01-12', orders: 3, spent: 156000, status: 'active' },
    { id: 3, name: 'Sophie Nkomo', whatsapp: '+237677345678', joinDate: '2025-01-15', orders: 8, spent: 389000, status: 'active' },
    { id: 4, name: 'Paul Etame', whatsapp: '+237655456789', joinDate: '2025-01-18', orders: 2, spent: 98000, status: 'suspended' }
  ],
  
  // Liste des vendeurs
  sellers: [
    { id: 1, name: 'Boutique Marie', whatsapp: '+237655111222', businessName: 'Mode Africaine', city: 'Douala', categories: ['Vêtements'], joinDate: '2024-12-01', products: 45, sales: 1250000, status: 'approved' },
    { id: 2, name: 'Tech Store CM', whatsapp: '+237699222333', businessName: 'Electronics Pro', city: 'Yaoundé', categories: ['Électroniques'], joinDate: '2024-12-15', products: 89, sales: 3450000, status: 'approved' },
    { id: 3, name: 'Artisan Local', whatsapp: '+237677333444', businessName: 'Artisanat Camerounais', city: 'Bafoussam', categories: ['Artisanat'], joinDate: '2025-01-05', products: 23, sales: 567000, status: 'approved' }
  ],
  
  // Vendeurs en attente
  pendingSellers: [
    { id: 1, name: 'Nouveau Vendeur 1', whatsapp: '+237655777888', businessName: 'Beauty Shop', city: 'Douala', categories: ['Beauté'], submitDate: '2025-01-20', email: 'beauty@example.com' },
    { id: 2, name: 'Nouveau Vendeur 2', whatsapp: '+237699888999', businessName: 'Sports Arena', city: 'Yaoundé', categories: ['Sports'], submitDate: '2025-01-21', email: 'sports@example.com' },
    { id: 3, name: 'Nouveau Vendeur 3', whatsapp: '+237677999000', businessName: 'Food Corner', city: 'Garoua', categories: ['Aliments'], submitDate: '2025-01-22', email: 'food@example.com' }
  ],
  
  // Liste de tous les produits
  allProducts: [
    { id: 1, name: 'Robe Traditionnelle', seller: 'Boutique Marie', category: 'Vêtements', price: 45000, stock: 12, status: 'approved', addedDate: '2025-01-10' },
    { id: 2, name: 'Smartphone Android', seller: 'Tech Store CM', category: 'Électroniques', price: 125000, stock: 8, status: 'approved', addedDate: '2025-01-11' },
    { id: 3, name: 'Panier Artisanal', seller: 'Artisan Local', category: 'Artisanat', price: 15000, stock: 25, status: 'approved', addedDate: '2025-01-12' },
    { id: 4, name: 'Produit Suspect', seller: 'Vendeur Test', category: 'Divers', price: 5000, stock: 100, status: 'pending', addedDate: '2025-01-22' }
  ],
  
  // Liste de toutes les commandes
  allOrders: [
    { id: 'CMD001', buyer: 'Marie Kouam', seller: 'Boutique Marie', date: '2025-01-20', status: 'delivered', total: 45000, items: 1 },
    { id: 'CMD002', buyer: 'Jean Mbarga', seller: 'Tech Store CM', date: '2025-01-21', status: 'in_transit', total: 125000, items: 1 },
    { id: 'CMD003', buyer: 'Sophie Nkomo', seller: 'Artisan Local', date: '2025-01-22', status: 'processing', total: 27500, items: 2 },
    { id: 'CMD004', buyer: 'Paul Etame', seller: 'Boutique Marie', date: '2025-01-22', status: 'cancelled', total: 98000, items: 3 }
  ]
};

// Roles et Permissions
export const adminRoles = {
  super_admin: {
    name: 'Super Administrateur',
    color: 'red',
    icon: '👑',
    permissions: ['all']
  },
  admin: {
    name: 'Administrateur',
    color: 'purple',
    icon: '⚡',
    permissions: ['manage_users', 'manage_sellers', 'manage_products', 'manage_orders', 'view_analytics']
  },
  moderator: {
    name: 'Modérateur',
    color: 'blue',
    icon: '🛡️',
    permissions: ['manage_products', 'manage_sellers', 'view_orders']
  },
  support: {
    name: 'Support',
    color: 'green',
    icon: '💬',
    permissions: ['view_users', 'view_orders', 'manage_messages']
  }
};

// Mock data pour les administrateurs
export const mockAdmins = [
  {
    id: 'admin_1',
    name: 'Admin Principal',
    whatsapp: '+237600000000',
    email: 'admin@nengoo.com',
    role: 'super_admin',
    status: 'active',
    createdDate: '2024-01-01',
    lastLogin: '2025-01-22 14:30'
  },
  {
    id: 'admin_2',
    name: 'Marie Admin',
    whatsapp: '+237655111111',
    email: 'marie@nengoo.com',
    role: 'admin',
    status: 'active',
    createdDate: '2024-06-15',
    lastLogin: '2025-01-22 10:15'
  },
  {
    id: 'admin_3',
    name: 'Jean Modérateur',
    whatsapp: '+237699222222',
    email: 'jean@nengoo.com',
    role: 'moderator',
    status: 'active',
    createdDate: '2024-09-01',
    lastLogin: '2025-01-21 18:45'
  },
  {
    id: 'admin_4',
    name: 'Sophie Support',
    whatsapp: '+237677333333',
    email: 'sophie@nengoo.com',
    role: 'support',
    status: 'active',
    createdDate: '2024-11-10',
    lastLogin: '2025-01-22 09:20'
  }
];
